"""Enhanced Ingestion Pipeline — Orchestrated multi-agent workflow.

Integrates:
  1. Parse Agent — text extraction + LLM parsing
  2. Skill Normalization Agent — canonical mapping + hierarchy inference
  3. Embedding Agent — vector embedding generation
  4. Dedup Agent — duplicate detection
  5. Persist Agent — database storage

All wrapped with the AgentOrchestrator for retry, tracing, and degradation.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from backend.services.orchestrator.agent_orchestrator import orchestrator, PipelineRun
from backend.services.parsing.extractor import extract_text, ExtractionError
from backend.services.parsing.gemini_parser import parse_resume_async, parse_linkedin_resume_async
from backend.services.parsing.embedding import generate_embedding
from backend.services.skills.normalization_agent import normalization_graph
from backend.services.dedup.engine import run_dedup_check, DedupClassification
from backend.services.dedup.merger import merge_candidates
from backend.models.candidate import Candidate
from backend.models.dedup import DedupQueue
from backend.core.database import AsyncSessionLocal
from backend.core.chromadb_client import upsert_candidate_embedding
from backend.core.websocket_manager import manager as ws_manager

logger = logging.getLogger(__name__)


# ── Individual Agent Functions ────────────────────────────────────────


def _extract_text_agent(state: dict) -> dict:
    """Agent 1: Extract raw text from file."""
    if state.get("raw_text"):
        return {"raw_text": state["raw_text"], "status": "text_extracted"}
    raw_text = extract_text(state["file_bytes"], state["filename"])
    return {"raw_text": raw_text, "status": "text_extracted"}


async def _parse_resume_agent(state: dict) -> dict:
    """Agent 2: LLM-powered structured extraction."""
    raw_text = state.get("raw_text", "")
    if state.get("source") == "linkedin":
        parsed = await parse_linkedin_resume_async(raw_text)
    else:
        parsed = await parse_resume_async(raw_text)
    return {"parsed_data": parsed.model_dump(), "status": "parsed"}


async def _normalize_skills_agent(state: dict) -> dict:
    """Agent 3: Skill normalization via taxonomy."""
    parsed = state.get("parsed_data", {})
    raw_skills = parsed.get("skills", [])
    if not raw_skills:
        return {"skill_profile": {}, "status": "skills_normalized"}

    result = await normalization_graph.ainvoke({
        "raw_skills": raw_skills,
        "experience_entries": parsed.get("experience", []),
        "years_experience": parsed.get("years_experience"),
    })

    return {
        "skill_profile": result.get("skill_profile", {}),
        "normalized_skills": result.get("normalized_skills", []),
        "status": "skills_normalized",
    }


def _generate_embedding_agent(state: dict) -> dict:
    """Agent 4: Generate vector embedding."""
    parsed = state.get("parsed_data", {})
    parts = []
    if parsed.get("full_name"):
        parts.append(parsed["full_name"])
    if parsed.get("current_title"):
        parts.append(parsed["current_title"])
    if parsed.get("summary"):
        parts.append(parsed["summary"])
    if parsed.get("skills"):
        parts.append("Skills: " + ", ".join(parsed["skills"]))
    raw = state.get("raw_text", "")
    if raw:
        parts.append(raw[:2000])
    text = "\n".join(parts)
    embedding = generate_embedding(text)
    return {"embedding": embedding, "status": "embedded"}


async def _dedup_check_agent(state: dict) -> dict:
    """Agent 5: Duplicate detection."""
    parsed = state.get("parsed_data", {})
    embedding = state.get("embedding")

    async with AsyncSessionLocal() as session:
        result = await run_dedup_check(
            session=session,
            parsed_data=parsed,
            embedding=embedding,
        )

    return {
        "dedup_classification": result.classification.value,
        "dedup_match_id": result.best_match_id,
        "dedup_score": result.best_score,
        "dedup_breakdown": result.score_breakdown,
        "status": "dedup_complete",
    }


async def _save_to_db_agent(state: dict) -> dict:
    """Agent 6: Persist to database."""
    parsed = state.get("parsed_data", {})
    classification = state.get("dedup_classification", DedupClassification.NEW_CANDIDATE.value)
    match_id = state.get("dedup_match_id")
    is_failed = state.get("status") == "needs_review"

    # Enrich parsed data with normalized skills
    skill_profile = state.get("skill_profile", {})
    if skill_profile:
        parsed["skill_profile"] = skill_profile

    async with AsyncSessionLocal() as session:
        if classification == DedupClassification.AUTO_MERGE.value and match_id and not is_failed:
            from sqlalchemy import select
            result = await session.execute(
                select(Candidate).where(Candidate.id == uuid.UUID(match_id))
            )
            primary = result.scalar_one_or_none()
            if primary:
                merge_result = await merge_candidates(
                    session=session,
                    primary=primary,
                    new_data=parsed,
                    new_embedding=state.get("embedding"),
                    merge_type="auto",
                    score_reason=f"composite={state.get('dedup_score', 0):.2f}",
                )
                await session.commit()
                # Store embedding in ChromaDB
                if state.get("embedding"):
                    try:
                        upsert_candidate_embedding(
                            candidate_id=merge_result["candidate_id"],
                            embedding=state["embedding"],
                            metadata={"user_id": state.get("user_id", ""), "full_name": parsed.get("full_name", "")},
                        )
                    except Exception as e:
                        logger.warning("ChromaDB upsert failed during merge: %s", e)

                await ws_manager.broadcast({
                    "type": "INGESTION_COMPLETE",
                    "candidate_id": merge_result["candidate_id"],
                    "candidate_name": parsed.get("full_name", "Unknown"),
                    "status": "auto_merged",
                    "source": state.get("source", "resume_upload"),
                })
                return {"candidate_id": merge_result["candidate_id"], "status": "auto_merged"}

        candidate = Candidate(
            full_name=parsed.get("full_name", "Unknown"),
            email=parsed.get("email"),
            phone=parsed.get("phone"),
            linkedin_url=parsed.get("linkedin_url"),
            location=parsed.get("location"),
            current_title=parsed.get("current_title"),
            years_experience=parsed.get("years_experience"),
            skills=parsed.get("skills"),
            education=[e for e in parsed.get("education", [])],
            experience=[e for e in parsed.get("experience", [])],
            summary=parsed.get("summary"),
            raw_text=state.get("raw_text"),
            embedding=state.get("embedding"),
            source=state.get("source", "resume_upload"),
            source_ref=state.get("filename"),
            ingestion_status="needs_review" if is_failed else "completed",
            ingestion_error=state.get("error"),
            confidence_score=parsed.get("confidence_score"),
            created_by=uuid.UUID(state["user_id"]) if state.get("user_id") else None,
        )
        session.add(candidate)
        await session.flush()

        if classification == DedupClassification.MANUAL_REVIEW.value and match_id and not is_failed:
            queue_entry = DedupQueue(
                candidate_a_id=uuid.UUID(match_id),
                candidate_b_id=candidate.id,
                composite_score=state.get("dedup_score", 0.0),
                score_breakdown=state.get("dedup_breakdown"),
                status="pending",
            )
            session.add(queue_entry)

        await session.commit()
        await session.refresh(candidate)

        # Store embedding in ChromaDB
        if state.get("embedding"):
            try:
                upsert_candidate_embedding(
                    candidate_id=str(candidate.id),
                    embedding=state["embedding"],
                    metadata={"user_id": state.get("user_id", ""), "full_name": parsed.get("full_name", "")},
                )
            except Exception as e:
                logger.warning("ChromaDB upsert failed during persist: %s", e)

        status = "completed"
        if is_failed:
            status = "needs_review"
        elif classification == DedupClassification.MANUAL_REVIEW.value and match_id:
            status = "pending_review"

        await ws_manager.broadcast({
            "type": "INGESTION_COMPLETE",
            "candidate_id": str(candidate.id),
            "candidate_name": parsed.get("full_name", "Unknown"),
            "status": status,
            "source": state.get("source", "resume_upload"),
        })

        return {"candidate_id": str(candidate.id), "status": status}


# ── Quality scoring functions ─────────────────────────────────────────


def _parse_quality(result: dict) -> float:
    """Rate parsing quality based on fields extracted."""
    parsed = result.get("parsed_data", {})
    if not parsed:
        return 0.0
    fields = ["full_name", "email", "skills", "experience", "education", "current_title"]
    filled = sum(1 for f in fields if parsed.get(f))
    return filled / len(fields)


def _normalize_quality(result: dict) -> float:
    """Rate normalization quality."""
    profile = result.get("skill_profile", {})
    if not profile:
        return 0.5
    total = profile.get("total_canonical", 0)
    emerging = profile.get("total_emerging", 0)
    if total == 0:
        return 0.5
    return max(0.0, 1.0 - (emerging / total))


# ── Main Pipeline Entry Point ─────────────────────────────────────────


async def run_orchestrated_ingestion(
    file_bytes: bytes,
    filename: str,
    source: str = "resume_upload",
    user_id: str | None = None,
    raw_text: str | None = None,
) -> tuple[dict, PipelineRun]:
    """Run the full ingestion pipeline with orchestrated agents.

    Returns (result_state, pipeline_run) for tracing.
    """
    initial_state = {
        "file_bytes": file_bytes,
        "filename": filename,
        "source": source,
        "user_id": user_id,
    }
    if raw_text:
        initial_state["raw_text"] = raw_text

    agents = [
        {
            "name": "text_extraction",
            "fn": _extract_text_agent,
            "critical": True,
        },
        {
            "name": "llm_parsing",
            "fn": _parse_resume_agent,
            "critical": True,
            "quality_fn": _parse_quality,
        },
        {
            "name": "skill_normalization",
            "fn": _normalize_skills_agent,
            "critical": False,  # Non-critical — degrade gracefully
            "quality_fn": _normalize_quality,
        },
        {
            "name": "embedding_generation",
            "fn": _generate_embedding_agent,
            "critical": False,  # Can match without embedding
        },
        {
            "name": "dedup_check",
            "fn": _dedup_check_agent,
            "critical": False,
        },
        {
            "name": "database_persist",
            "fn": _save_to_db_agent,
            "critical": True,
        },
    ]

    state, run = await orchestrator.run_pipeline(agents, initial_state)
    run.candidate_id = state.get("candidate_id")
    return state, run
