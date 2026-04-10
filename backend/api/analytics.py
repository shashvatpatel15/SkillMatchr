from fastapi import APIRouter, Depends
from sqlalchemy import select, func, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.auth import get_current_user
from backend.core.cache import cache_get, cache_set
from backend.core.database import get_db
from backend.models.user import User
from backend.models.candidate import Candidate
from backend.models.shortlist import Shortlist
from backend.schemas.analytics import AnalyticsOverview, SourceBreakdown, IngestionTrend

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

# Cache TTL — analytics don't need to be real-time, 30s is plenty
_CACHE_TTL = 30


@router.get("/overview", response_model=AnalyticsOverview)
async def analytics_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregated analytics: totals, source breakdown, ingestion trends.

    Results are cached for 30 seconds per user to keep the dashboard
    blazing fast even with 1000s of candidates.
    """

    cache_key = f"analytics:overview:{current_user.id}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return AnalyticsOverview(**cached)

    # ── Run all aggregation queries concurrently ─────────────────
    import asyncio

    async def _total_candidates():
        r = await db.execute(
            select(func.count(Candidate.id))
            .where(Candidate.created_by == current_user.id)
        )
        return r.scalar_one()

    async def _total_shortlists():
        r = await db.execute(
            select(func.count(Shortlist.id))
            .where(Shortlist.created_by == current_user.id)
        )
        return r.scalar_one()

    async def _source_breakdown():
        r = await db.execute(
            select(Candidate.source, func.count(Candidate.id))
            .where(Candidate.created_by == current_user.id)
            .group_by(Candidate.source)
            .order_by(func.count(Candidate.id).desc())
        )
        return [SourceBreakdown(source=row[0], count=row[1]) for row in r.all()]

    async def _ingestion_trends():
        r = await db.execute(
            select(
                cast(Candidate.created_at, Date).label("date"),
                func.count(Candidate.id).label("count"),
            )
            .where(Candidate.created_by == current_user.id)
            .group_by(cast(Candidate.created_at, Date))
            .order_by(cast(Candidate.created_at, Date).desc())
            .limit(30)
        )
        return [IngestionTrend(date=str(row.date), count=row.count) for row in r.all()]

    async def _status_breakdown():
        r = await db.execute(
            select(Candidate.ingestion_status, func.count(Candidate.id))
            .where(Candidate.created_by == current_user.id)
            .group_by(Candidate.ingestion_status)
        )
        from backend.schemas.analytics import StatusBreakdown
        return [StatusBreakdown(status=row[0], count=row[1]) for row in r.all()]

    async def _experience_breakdown():
        r = await db.execute(
            select(Candidate.years_experience)
            .where(Candidate.created_by == current_user.id)
            .where(Candidate.years_experience != None)
        )
        exp_values = [row[0] for row in r.all()]
        from backend.schemas.analytics import ExperienceBreakdown
        junior = sum(1 for exp in exp_values if exp < 3)
        mid = sum(1 for exp in exp_values if 3 <= exp < 7)
        senior = sum(1 for exp in exp_values if exp >= 7)
        return [
            ExperienceBreakdown(category="Junior (0-3y)", count=junior),
            ExperienceBreakdown(category="Mid-Level (3-7y)", count=mid),
            ExperienceBreakdown(category="Senior (7y+)", count=senior),
        ]

    # Fire all queries at once — 6 parallel DB queries instead of 6 sequential
    (total_candidates, total_shortlists, sources,
     trends, status_breakdown, exp_breakdown) = await asyncio.gather(
        _total_candidates(),
        _total_shortlists(),
        _source_breakdown(),
        _ingestion_trends(),
        _status_breakdown(),
        _experience_breakdown(),
    )

    result = AnalyticsOverview(
        total_candidates=total_candidates,
        total_shortlists=total_shortlists,
        sources=sources,
        ingestion_trends=trends,
        status_breakdown=status_breakdown,
        experience_breakdown=exp_breakdown,
    )

    # Cache for 30s
    await cache_set(cache_key, result.model_dump(), ttl=_CACHE_TTL)

    return result
