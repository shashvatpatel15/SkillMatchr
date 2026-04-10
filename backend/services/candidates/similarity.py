"""Find Similar Candidates via ChromaDB cosine similarity.

Given a target candidate's embedding, queries ChromaDB for nearest
neighbors and returns those above a similarity threshold.
Scoped to the same user's candidates for multi-tenancy.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.candidate import Candidate
from backend.core.chromadb_client import get_candidate_embedding, query_similar_candidates

_VALID_STATUSES = ["completed", "ingested", "needs_review", "pending_review"]


async def get_similar_candidates(
    session: AsyncSession,
    candidate_id: str,
    limit: int = 5,
    threshold: float = 0.75,
    user_id: str | None = None,
) -> list[dict]:
    """Find candidates with similar profiles using ChromaDB cosine similarity.

    Args:
        candidate_id: UUID of the target candidate.
        limit: Max results to return.
        threshold: Minimum similarity score (0.0–1.0). Only candidates
                   above this threshold are returned.
        user_id: If provided, only search within this user's candidates.

    Returns:
        List of dicts with candidate fields + similarity_score.
    """
    # Step 1: Get the target candidate's embedding from ChromaDB
    target_embedding = get_candidate_embedding(candidate_id)

    if target_embedding is None:
        return []

    # Step 2: Query ChromaDB for nearest neighbors
    chroma_where = {"user_id": user_id} if user_id else None
    chroma_results = query_similar_candidates(
        query_embedding=target_embedding,
        n_results=limit * 3,  # Over-fetch to filter by threshold
        where=chroma_where,
    )

    if not chroma_results or not chroma_results.get("ids") or not chroma_results["ids"][0]:
        return []

    chroma_ids = chroma_results["ids"][0]
    chroma_distances = chroma_results["distances"][0]

    # Build distance map, excluding the target itself
    dist_map = {}
    for cid, dist in zip(chroma_ids, chroma_distances):
        if cid != candidate_id:
            dist_map[cid] = dist

    if not dist_map:
        return []

    # Step 3: Fetch candidate details from PostgreSQL
    candidate_uuids = [uuid.UUID(cid) for cid in dist_map.keys()]
    user_filter = [Candidate.created_by == uuid.UUID(user_id)] if user_id else []

    stmt = (
        select(Candidate)
        .where(and_(
            Candidate.id.in_(candidate_uuids),
            Candidate.ingestion_status.in_(_VALID_STATUSES),
            *user_filter,
        ))
    )

    result = await session.execute(stmt)
    candidates = result.scalars().all()

    similar: list[dict] = []
    seen_names: set[str] = set()

    # Sort candidates by distance
    cand_by_id = {str(c.id): c for c in candidates}
    sorted_ids = sorted(dist_map.keys(), key=lambda cid: dist_map[cid])

    for cid in sorted_ids:
        candidate = cand_by_id.get(cid)
        if candidate is None:
            continue

        dist = dist_map[cid]
        similarity = max(0.0, min(1.0, 1.0 - dist))

        if similarity < threshold:
            continue

        # Deduplicate by normalized name — keep the first (highest similarity) entry
        name_key = candidate.full_name.strip().lower()
        if name_key in seen_names:
            continue
        seen_names.add(name_key)

        similar.append({
            "candidate_id": str(candidate.id),
            "full_name": candidate.full_name,
            "email": candidate.email,
            "current_title": candidate.current_title,
            "location": candidate.location,
            "years_experience": candidate.years_experience,
            "skills": candidate.skills if isinstance(candidate.skills, list) else [],
            "similarity_score": round(similarity, 4),
        })

        if len(similar) >= limit:
            break

    return similar
