from fastapi import APIRouter, Depends, HTTPException, Query, status
# Add required sqlalchemy imports
from sqlalchemy import select, func, or_, cast, String
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.auth import get_current_user
from backend.core.database import get_db
from backend.models.user import User
from backend.models.candidate import Candidate
from backend.schemas.candidate import (
    CandidateListItem,
    CandidateListResponse,
    CandidateDetail,
    CandidateUpdate,
)

router = APIRouter(prefix="/api/candidates", tags=["Candidates"])


@router.get("", response_model=CandidateListResponse)
async def list_candidates(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    q: str = Query(None, description="Search term for names or titles"),
    status: str = Query(None, description="Filter by ingestion status"),
    min_exp: float = Query(None, description="Minimum years of experience"),
    max_exp: float = Query(None, description="Maximum years of experience"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all candidates with pagination and advanced filtering."""
    # Build query
    query = select(Candidate).where(Candidate.created_by == current_user.id)
    
    components = []
    if q:
        search_term = f"%{q}%"
        components.append(
            or_(
                Candidate.full_name.ilike(search_term),
                Candidate.current_title.ilike(search_term),
                Candidate.skills.cast(String).ilike(search_term) # Optional broad search
            )
        )
    if status:
        components.append(Candidate.ingestion_status == status)
    if min_exp is not None:
        components.append(Candidate.years_experience >= min_exp)
    if max_exp is not None:
        components.append(Candidate.years_experience <= max_exp)
        
    if components:
        query = query.where(*components)

    # Fast count
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar_one()

    # Fast paginated fetch
    result = await db.execute(
        query.order_by(Candidate.created_at.desc()).offset(skip).limit(limit)
    )
    candidates = result.scalars().all()

    return CandidateListResponse(
        total=total,
        skip=skip,
        limit=limit,
        results=[
            CandidateListItem(
                id=c.id,
                full_name=c.full_name,
                email=c.email,
                phone=c.phone,
                location=c.location,
                current_title=c.current_title,
                years_experience=c.years_experience,
                source=c.source,
                ingestion_status=c.ingestion_status,
                confidence_score=c.confidence_score,
                created_at=c.created_at,
            )
            for c in candidates
        ],
    )


@router.get("/{candidate_id}", response_model=CandidateDetail)
async def get_candidate(
    candidate_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get full candidate details."""
    result = await db.execute(
        select(Candidate)
        .where(Candidate.id == candidate_id)
        .where(Candidate.created_by == current_user.id)
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    return CandidateDetail(
        id=candidate.id,
        full_name=candidate.full_name,
        email=candidate.email,
        phone=candidate.phone,
        location=candidate.location,
        current_title=candidate.current_title,
        years_experience=candidate.years_experience,
        linkedin_url=candidate.linkedin_url,
        skills=candidate.skills,
        education=candidate.education,
        experience=candidate.experience,
        summary=candidate.summary,
        raw_text=candidate.raw_text,
        source=candidate.source,
        source_ref=candidate.source_ref,
        ingestion_status=candidate.ingestion_status,
        ingestion_error=candidate.ingestion_error,
        confidence_score=candidate.confidence_score,
        created_at=candidate.created_at,
        updated_at=candidate.updated_at,
    )


@router.get("/{candidate_id}/similar")
async def get_similar(
    candidate_id: str,
    limit: int = Query(5, ge=1, le=20),
    threshold: float = Query(0.75, ge=0.0, le=1.0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Find candidates with similar profiles using pgvector cosine similarity."""
    from backend.services.candidates.similarity import get_similar_candidates

    results = await get_similar_candidates(
        session=db,
        candidate_id=candidate_id,
        limit=limit,
        threshold=threshold,
    )

    # Convert similarity_score to percentage for frontend
    for r in results:
        r["similarity_pct"] = round(r["similarity_score"] * 100, 1)

    return {"candidate_id": candidate_id, "total": len(results), "results": results}


@router.get("/{candidate_id}/analysis")
async def get_candidate_analysis(
    candidate_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run the skill normalization agent on a candidate and return the full analysis track."""
    from backend.services.skills.normalization_agent import normalization_graph

    result = await db.execute(
        select(Candidate)
        .where(Candidate.id == candidate_id)
        .where(Candidate.created_by == current_user.id)
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    if not candidate.skills:
        return {
            "candidate_id": candidate_id,
            "raw_skills": [],
            "analysis": {},
            "message": "Candidate has no extracted skills to analyze."
        }
        
    initial_state = {
        "raw_skills": candidate.skills,
        "experience_entries": candidate.experience or [],
        "years_experience": candidate.years_experience
    }
    
    analysis_result = await normalization_graph.ainvoke(initial_state)

    return {
        "candidate_id": candidate_id,
        "raw_skills": analysis_result.get("raw_skills", []),
        "normalized_skills": analysis_result.get("normalized_skills", []),
        "inferred_skills": analysis_result.get("inferred_skills", []),
        "emerging_skills": analysis_result.get("emerging_skills", []),
        "skill_profile": analysis_result.get("skill_profile", {})
    }



@router.put("/{candidate_id}", response_model=CandidateDetail)
async def update_candidate(
    candidate_id: str,
    body: CandidateUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update specific fields on a candidate."""
    result = await db.execute(
        select(Candidate)
        .where(Candidate.id == candidate_id)
        .where(Candidate.created_by == current_user.id)
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(candidate, field, value)

    await db.commit()
    await db.refresh(candidate)

    return CandidateDetail(
        id=candidate.id,
        full_name=candidate.full_name,
        email=candidate.email,
        phone=candidate.phone,
        location=candidate.location,
        current_title=candidate.current_title,
        years_experience=candidate.years_experience,
        linkedin_url=candidate.linkedin_url,
        skills=candidate.skills,
        education=candidate.education,
        experience=candidate.experience,
        summary=candidate.summary,
        raw_text=candidate.raw_text,
        source=candidate.source,
        source_ref=candidate.source_ref,
        ingestion_status=candidate.ingestion_status,
        ingestion_error=candidate.ingestion_error,
        confidence_score=candidate.confidence_score,
        created_at=candidate.created_at,
        updated_at=candidate.updated_at,
    )


@router.delete("/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_candidate(
    candidate_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a candidate."""
    result = await db.execute(
        select(Candidate)
        .where(Candidate.id == candidate_id)
        .where(Candidate.created_by == current_user.id)
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    await db.delete(candidate)
    await db.commit()
