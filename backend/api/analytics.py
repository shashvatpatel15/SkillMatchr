from fastapi import APIRouter, Depends
from sqlalchemy import select, func, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.auth import get_current_user
from backend.core.database import get_db
from backend.models.user import User
from backend.models.candidate import Candidate
from backend.models.shortlist import Shortlist
from backend.schemas.analytics import AnalyticsOverview, SourceBreakdown, IngestionTrend

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/overview", response_model=AnalyticsOverview)
async def analytics_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregated analytics: totals, source breakdown, ingestion trends."""

    # Total candidates
    total_candidates_result = await db.execute(
        select(func.count(Candidate.id))
        .where(Candidate.created_by == current_user.id)
    )
    total_candidates = total_candidates_result.scalar_one()

    # Total shortlists
    total_shortlists_result = await db.execute(
        select(func.count(Shortlist.id))
        .where(Shortlist.created_by == current_user.id)
    )
    total_shortlists = total_shortlists_result.scalar_one()

    # Candidates by source
    source_result = await db.execute(
        select(Candidate.source, func.count(Candidate.id))
        .where(Candidate.created_by == current_user.id)
        .group_by(Candidate.source)
        .order_by(func.count(Candidate.id).desc())
    )
    sources = [
        SourceBreakdown(source=row[0], count=row[1])
        for row in source_result.all()
    ]

    # Ingestion trends (candidates created per day, last 30 days)
    trend_result = await db.execute(
        select(
            cast(Candidate.created_at, Date).label("date"),
            func.count(Candidate.id).label("count"),
        )
        .where(Candidate.created_by == current_user.id)
        .group_by(cast(Candidate.created_at, Date))
        .order_by(cast(Candidate.created_at, Date).desc())
        .limit(30)
    )
    trends = [
        IngestionTrend(date=str(row.date), count=row.count)
        for row in trend_result.all()
    ]

    # Status breakdown
    status_result = await db.execute(
        select(Candidate.ingestion_status, func.count(Candidate.id))
        .where(Candidate.created_by == current_user.id)
        .group_by(Candidate.ingestion_status)
    )
    from backend.schemas.analytics import StatusBreakdown, ExperienceBreakdown
    status_breakdown = [
        StatusBreakdown(status=row[0], count=row[1]) for row in status_result.all()
    ]

    # Experience breakdown (Simple bucketing based on years_experience)
    # Junior (0-3), Mid (3-7), Senior (7+)
    exp_result = await db.execute(
        select(Candidate.years_experience)
        .where(Candidate.created_by == current_user.id)
        .where(Candidate.years_experience != None)
    )
    exp_values = [row[0] for row in exp_result.all()]
    
    junior = sum(1 for exp in exp_values if exp < 3)
    mid = sum(1 for exp in exp_values if 3 <= exp < 7)
    senior = sum(1 for exp in exp_values if exp >= 7)

    exp_breakdown = [
        ExperienceBreakdown(category="Junior (0-3y)", count=junior),
        ExperienceBreakdown(category="Mid-Level (3-7y)", count=mid),
        ExperienceBreakdown(category="Senior (7y+)", count=senior),
    ]

    return AnalyticsOverview(
        total_candidates=total_candidates,
        total_shortlists=total_shortlists,
        sources=sources,
        ingestion_trends=trends,
        status_breakdown=status_breakdown,
        experience_breakdown=exp_breakdown
    )
