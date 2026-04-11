"""AI Job-Candidate Matching Engine.

Uses ChromaDB semantic similarity + composite scoring to rank candidates
against a job opening.

Composite formula:
  score = (0.50 * semantic_similarity)
        + (0.25 * skill_match)
        + (0.15 * experience_match)
        + (0.10 * title_relevance)

When candidates lack embeddings, semantic weight is redistributed to
skill_match (0.45) and experience_match (0.30) so matching still works.
"""

from __future__ import annotations

import logging
import uuid as _uuid_mod

import numpy as np
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from thefuzz import fuzz

from backend.models.candidate import Candidate
from backend.models.job import Job
from backend.services.parsing.embedding import generate_embedding
from backend.core.chromadb_client import (
    upsert_job_embedding,
    upsert_candidate_embedding,
    query_similar_candidates,
    get_candidate_embedding,
    get_candidates_collection,
)

logger = logging.getLogger(__name__)

_VALID_STATUSES = ["completed", "ingested", "needs_review", "pending_review"]


def generate_job_embedding(job: Job) -> list[float]:
    """Generate embedding for a job by combining title + description + skills."""
    parts = [job.title or ""]
    if job.job_description:
        parts.append(job.job_description[:1500])
    if job.skills_required:
        skills = job.skills_required if isinstance(job.skills_required, list) else []
        parts.append("Skills: " + ", ".join(skills))
    if job.location:
        parts.append(f"Location: {job.location}")
    text = "\n".join(parts)
    return generate_embedding(text)


def _compute_skill_match(candidate_skills: list | dict | None, job_skills: list | None) -> float:
    """Compute fraction of required job skills found in candidate skills."""
    if not job_skills:
        return 0.5

    if not candidate_skills:
        return 0.0

    if isinstance(candidate_skills, dict):
        cand_set = {s.lower() for s in candidate_skills.get("skills", candidate_skills.keys())}
    elif isinstance(candidate_skills, list):
        cand_set = {s.lower() for s in candidate_skills if isinstance(s, str)}
    else:
        cand_set = set()

    matched = 0
    for skill in job_skills:
        skill_lower = skill.lower()
        if any(skill_lower in cs or cs in skill_lower for cs in cand_set):
            matched += 1

    return matched / len(job_skills)


def _compute_skill_gap(candidate_skills: list | dict | None, job_skills: list | None) -> list[str]:
    """Gap analysis: returns required skills missing from the candidate's profile."""
    if not job_skills:
        return []
    if not candidate_skills:
        return list(job_skills)

    if isinstance(candidate_skills, dict):
        cand_set = {s.lower() for s in candidate_skills.get("skills", candidate_skills.keys())}
    elif isinstance(candidate_skills, list):
        cand_set = {s.lower() for s in candidate_skills if isinstance(s, str)}
    else:
        cand_set = set()

    missing = []
    for skill in job_skills:
        skill_lower = skill.lower()
        if not any(skill_lower in cs or cs in skill_lower for cs in cand_set):
            missing.append(skill)
    return missing


def _compute_skill_match_from_text(
    raw_text: str | None, summary: str | None, job_skills: list | None
) -> float:
    """Fallback skill match: search for skills in raw_text and summary."""
    if not job_skills:
        return 0.5
    text = ((raw_text or "") + " " + (summary or "")).lower()
    if not text.strip():
        return 0.0
    matched = sum(1 for s in job_skills if s.lower() in text)
    return matched / len(job_skills)


def _compute_experience_match(candidate_exp: float | None, required_exp: float | None) -> float:
    if required_exp is None or required_exp <= 0:
        return 0.5
    if candidate_exp is None:
        return 0.2
    diff = abs(candidate_exp - required_exp)
    return max(0.2, 1.0 - diff * 0.08)


def _compute_title_relevance(candidate_title: str | None, job_title: str | None) -> float:
    if not candidate_title or not job_title:
        return 0.3
    return fuzz.token_sort_ratio(candidate_title.lower(), job_title.lower()) / 100.0


def _compute_semantic_similarity(
    candidate_embedding: list | None,
    job_embedding: list[float] | None,
) -> float:
    if candidate_embedding is None or job_embedding is None:
        return 0.0
    a = np.array(candidate_embedding, dtype=np.float32)
    b = np.array(job_embedding, dtype=np.float32)
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(max(0.0, min(1.0, dot / (norm_a * norm_b))))


async def match_candidates_to_job(
    session: AsyncSession,
    job: Job,
    top_k: int = 20,
    threshold: float = 0.20,
    user_id: str | None = None,
) -> list[dict]:
    """Find and rank the best candidates for a job opening.

    Two-pass approach:
      Pass 1: Semantic — query ChromaDB for nearest-neighbor candidates
      Pass 2: Non-semantic — ALL remaining candidates scored by skill/exp/title
    Merge, sort by composite, return top_k.
    """
    import asyncio

    job_skills = job.skills_required if isinstance(job.skills_required, list) else []
    job_emb = list(job.embedding) if job.embedding is not None else None

    if job_emb is None:
        logger.info("Job '%s' has no embedding, generating now", job.title)
        try:
            # Run in executor to avoid blocking the event loop
            loop = asyncio.get_running_loop()
            job_emb = await loop.run_in_executor(None, generate_job_embedding, job)
            # Save embedding to DB for future use
            job.embedding = job_emb
            session.add(job)
            await session.commit()
            await session.refresh(job)
            # Also store in ChromaDB
            upsert_job_embedding(
                job_id=str(job.id),
                embedding=job_emb,
                metadata={"user_id": user_id or "", "title": job.title or ""},
            )
        except Exception as e:
            logger.warning("Failed to generate job embedding: %s", e)
            job_emb = None

    scored: list[dict] = []
    seen_ids: set[str] = set()

    # ── Pass 1: ChromaDB semantic ranking ────────────────────────────
    if job_emb is not None:
        try:
            chroma_where = {"user_id": user_id} if user_id else None
            chroma_results = query_similar_candidates(
                query_embedding=job_emb,
                n_results=200,
                where=chroma_where,
            )

            if chroma_results and chroma_results.get("ids") and chroma_results["ids"][0]:
                chroma_ids = chroma_results["ids"][0]
                chroma_distances = chroma_results["distances"][0]
                dist_map = dict(zip(chroma_ids, chroma_distances))

                candidate_uuids = []
                for cid in chroma_ids:
                    try:
                        candidate_uuids.append(_uuid_mod.UUID(cid))
                    except ValueError:
                        continue

                if candidate_uuids:
                    user_filter = [Candidate.created_by == _uuid_mod.UUID(user_id)] if user_id else []
                    stmt = (
                        select(Candidate)
                        .where(and_(
                            Candidate.ingestion_status.in_(_VALID_STATUSES),
                            Candidate.id.in_(candidate_uuids),
                            *user_filter,
                        ))
                    )
                    result = await session.execute(stmt)
                    rows = result.scalars().all()

                    for candidate in rows:
                        cid = str(candidate.id)
                        seen_ids.add(cid)

                        dist = dist_map.get(cid, 1.0)
                        semantic = max(0.0, min(1.0, 1.0 - dist))
                        skill = _compute_skill_match(candidate.skills, job_skills)
                        if skill == 0.0:
                            skill = _compute_skill_match_from_text(candidate.raw_text, candidate.summary, job_skills)
                        experience = _compute_experience_match(candidate.years_experience, job.experience_required)
                        title = _compute_title_relevance(candidate.current_title, job.title)

                        composite = (
                            0.50 * semantic + 0.25 * skill + 0.15 * experience + 0.10 * title
                        )

                        missing_skills = _compute_skill_gap(candidate.skills, job_skills)
                        scored.append(_build_result(candidate, composite, semantic, skill, experience, title, missing_skills))
        except Exception as e:
            logger.warning("ChromaDB semantic pass failed: %s", e)

    # ── Pass 2: Non-semantic fallback (all remaining candidates) ─────
    user_filter = [Candidate.created_by == _uuid_mod.UUID(user_id)] if user_id else []
    stmt = (
        select(Candidate)
        .where(and_(
            Candidate.ingestion_status.in_(_VALID_STATUSES),
            *user_filter,
        ))
        .limit(500)
    )
    result = await session.execute(stmt)
    all_candidates = result.scalars().all()

    # Batch-load embeddings from ChromaDB instead of N+1 individual calls
    remaining = [c for c in all_candidates if str(c.id) not in seen_ids]
    emb_map: dict[str, list[float]] = {}
    if remaining:
        try:
            batch_ids = [str(c.id) for c in remaining]
            col = get_candidates_collection()
            batch_result = col.get(ids=batch_ids, include=["embeddings"])
            if batch_result and batch_result.get("ids") and batch_result.get("embeddings"):
                for bid, bemb in zip(batch_result["ids"], batch_result["embeddings"]):
                    if bemb:
                        emb_map[bid] = bemb
        except Exception:
            pass  # Fall back to no semantic for remaining

    for candidate in remaining:
        cid = str(candidate.id)
        seen_ids.add(cid)

        cand_emb = emb_map.get(cid)
        semantic = _compute_semantic_similarity(cand_emb, job_emb)

        skill = _compute_skill_match(candidate.skills, job_skills)
        if skill == 0.0:
            skill = _compute_skill_match_from_text(candidate.raw_text, candidate.summary, job_skills)
        experience = _compute_experience_match(candidate.years_experience, job.experience_required)
        title = _compute_title_relevance(candidate.current_title, job.title)

        # When no semantic signal, redistribute weight to skill + experience
        if semantic == 0.0:
            composite = 0.45 * skill + 0.30 * experience + 0.15 * title + 0.10 * 0.3
        else:
            composite = 0.50 * semantic + 0.25 * skill + 0.15 * experience + 0.10 * title

        missing_skills = _compute_skill_gap(candidate.skills, job_skills)
        scored.append(_build_result(candidate, composite, semantic, skill, experience, title, missing_skills))

    # Sort by composite descending, filter dynamically by configurable threshold
    scored.sort(key=lambda x: x["composite_score"], reverse=True)
    filtered = [s for s in scored if s["composite_score"] >= threshold]
    return filtered[:top_k]


async def compare_candidates_for_job(
    session: AsyncSession,
    job: Job,
    candidate_ids: list[str],
    user_id: str | None = None,
) -> list[dict]:
    """Compare specific candidates against a job with detailed metrics."""
    job_skills = job.skills_required if isinstance(job.skills_required, list) else []
    job_emb = list(job.embedding) if job.embedding is not None else None

    if job_emb is None:
        try:
            job_emb = generate_job_embedding(job)
            job.embedding = job_emb
            session.add(job)
            await session.commit()
            await session.refresh(job)
            upsert_job_embedding(
                job_id=str(job.id),
                embedding=job_emb,
                metadata={"user_id": user_id or "", "title": job.title or ""},
            )
        except Exception:
            job_emb = None

    import uuid as _uuid
    uuids = [_uuid.UUID(cid) for cid in candidate_ids]

    user_filter = [Candidate.created_by == _uuid_mod.UUID(user_id)] if user_id else []
    stmt = select(Candidate).where(Candidate.id.in_(uuids), *user_filter)
    result = await session.execute(stmt)
    candidates = result.scalars().all()

    compared: list[dict] = []
    for candidate in candidates:
        cand_emb = get_candidate_embedding(str(candidate.id))
        semantic = _compute_semantic_similarity(cand_emb, job_emb)

        skill = _compute_skill_match(candidate.skills, job_skills)
        if skill == 0.0:
            skill = _compute_skill_match_from_text(candidate.raw_text, candidate.summary, job_skills)
        experience = _compute_experience_match(candidate.years_experience, job.experience_required)
        title = _compute_title_relevance(candidate.current_title, job.title)

        if semantic == 0.0:
            overall = 0.45 * skill + 0.30 * experience + 0.15 * title + 0.10 * 0.3
        else:
            overall = 0.50 * semantic + 0.25 * skill + 0.15 * experience + 0.10 * title

        compared.append({
            "candidate_id": str(candidate.id),
            "full_name": candidate.full_name,
            "email": candidate.email,
            "location": candidate.location,
            "current_title": candidate.current_title,
            "years_experience": candidate.years_experience,
            "skills": candidate.skills if isinstance(candidate.skills, list) else [],
            "education": candidate.education if isinstance(candidate.education, list) else [],
            "experience": candidate.experience if isinstance(candidate.experience, list) else [],
            "semantic_match": round(semantic, 4),
            "skill_overlap": round(skill, 4),
            "experience_score": round(experience, 4),
            "overall_score": round(overall, 4),
        })

    compared.sort(key=lambda x: x["overall_score"], reverse=True)
    return compared


def _build_result(candidate, composite, semantic, skill, experience, title, missing_skills=None) -> dict:
    if missing_skills is None:
        missing_skills = []
    
    # Gap analysis & upskilling suggestions
    suggestions = [f"Recommended upskilling: {s}" for s in missing_skills[:3]]

    return {
        "candidate_id": str(candidate.id),
        "full_name": candidate.full_name,
        "email": candidate.email,
        "location": candidate.location,
        "current_title": candidate.current_title,
        "years_experience": candidate.years_experience,
        "skills": candidate.skills if isinstance(candidate.skills, list) else [],
        "missing_skills": missing_skills,
        "upskill_suggestions": suggestions,
        "composite_score": round(composite, 4),
        "breakdown": {
            "semantic_similarity": round(semantic, 4),
            "skill_match": round(skill, 4),
            "experience_match": round(experience, 4),
            "title_relevance": round(title, 4),
        },
    }
