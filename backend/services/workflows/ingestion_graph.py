from __future__ import annotations

import logging
import uuid
from typing import TypedDict

from langgraph.graph import StateGraph, END

logger = logging.getLogger(__name__)

from backend.services.parsing.extractor import extract_text, ExtractionError
from backend.services.parsing.gemini_parser import parse_resume_async, parse_linkedin_resume_async, ParsedResume
from backend.services.parsing.embedding import generate_embedding_async
from backend.services.dedup.engine import run_dedup_check, DedupClassification
from backend.services.dedup.merger import merge_candidates
from backend.models.candidate import Candidate
from backend.models.dedup import DedupQueue
from backend.core.database import AsyncSessionLocal
from backend.core.chromadb_client import upsert_candidate_embedding
from backend.core.websocket_manager import manager as ws_manager


class IngestionState(TypedDict, total=False):
    # Input
    file_bytes: bytes
    filename: str
    source: str
    user_id: str
    # Pipeline outputs
    raw_text: str
    parsed_data: dict
    embedding: list[float]
    # Dedup results
    dedup_classification: str       # "auto_merge" | "manual_review" | "new_candidate"
    dedup_match_id: str | None      # UUID of best matching candidate
    dedup_score: float
    dedup_breakdown: dict | None
    # Final
    candidate_id: str
    status: str
    error: str | None


# ── Node functions ────────────────────────────────────────────────


async def extract_text_node(state: IngestionState) -> dict:
    """Extract raw text from the uploaded file."""
    if state.get("raw_text"):
        return {"status": "text_extracted"}
    
    import asyncio
    import time
    start_time = time.time()
    loop = asyncio.get_running_loop()
    try:
        # Run sync extractor in thread pool
        raw_text = await loop.run_in_executor(None, extract_text, state["file_bytes"], state["filename"])
        duration = time.time() - start_time
        logger.info("extract_text_node SUCCESS: extracted %d chars from '%s' in %.2fs", len(raw_text), state["filename"], duration)
        return {"raw_text": raw_text, "status": "text_extracted"}
    except Exception as e:
        logger.error("extract_text_node FAILED for '%s': %s", state["filename"], e)
        return {"status": "needs_review", "error": str(e)}


async def parse_and_embed_node(state: IngestionState) -> dict:
    """Call Gemini to extract structured data AND generate embeddings in parallel.
    
    This is the main speed optimization: running LLM and Embedding tasks concurrently.
    A hard 45-second timeout is applied to prevent infinite hangs if APIs are degraded.
    """
    if state.get("status") == "needs_review":
        return {}

    raw_text = state.get("raw_text", "")
    if not raw_text:
        return {"status": "needs_review", "error": "No text extracted"}

    import asyncio
    import time
    
    # 1. Parsing Task
    async def _parse():
        try:
            if state.get("source") == "linkedin":
                return await parse_linkedin_resume_async(raw_text)
            return await parse_resume_async(raw_text)
        except Exception as e:
            logger.error("Parsing failed for %s: %s", state.get("filename"), e)
            return None

    # 2. Embedding Task (uses first 3000 chars for quality/speed balance)
    async def _embed():
        try:
            return await generate_embedding_async(raw_text[:3000])
        except Exception as e:
            logger.error("Embedding failed for %s: %s", state.get("filename"), e)
            return None

    logger.info("Starting parallel Parse & Embed for %s", state.get("filename"))
    start_time = time.time()
    
    try:
        # Hard 45s timeout to prevent infinite hanging if both LLM providers are degraded
        # Use simple gather but enforce the timeout externally
        parsed, embedding = await asyncio.wait_for(
            asyncio.gather(_parse(), _embed(), return_exceptions=True),
            timeout=90.0
        )
        duration = time.time() - start_time
        
        # Handle exceptions from gather
        if isinstance(parsed, Exception):
            logger.error("Parse exception for %s: %s", state.get("filename"), parsed)
            parsed = None
        if isinstance(embedding, Exception):
            logger.error("Embed exception for %s: %s", state.get("filename"), embedding)
            embedding = None

        logger.info("parse_and_embed_node DONE for %s in %.2fs. Parsed: %s, Embedding: %s", 
                    state.get("filename"), duration, "YES" if parsed else "NO", "YES" if embedding else "NO")

    except asyncio.TimeoutError:
        logger.error("parse_and_embed_node TIMED OUT after 90s for %s", state.get("filename"))
        return {"status": "needs_review", "error": "Parsing timed out after 90s — LLM APIs may be unavailable"}

    updates = {}
    if parsed:
        updates["parsed_data"] = parsed.model_dump()
        updates["status"] = "parsed"
    else:
        # Keep empty dict if None
        updates["parsed_data"] = {}
        updates["status"] = "needs_review"
        updates["error"] = "Gemini & Groq parsing both failed"

    if embedding:
        updates["embedding"] = embedding
        if updates.get("status") == "parsed":
            updates["status"] = "ready_for_dedup"

    return updates


async def run_dedup_check_node(state: IngestionState) -> dict:
    """Run the dedup engine against existing candidates."""
    if state.get("status") == "needs_review":
        return {"dedup_classification": DedupClassification.NEW_CANDIDATE.value}

    parsed_data = state.get("parsed_data", {})
    embedding = state.get("embedding")

    import time
    start_time = time.time()
    async with AsyncSessionLocal() as session:
        result = await run_dedup_check(
            session=session,
            parsed_data=parsed_data,
            embedding=embedding,
            user_id=state.get("user_id"),
        )
    duration = time.time() - start_time
    logger.info("run_dedup_check_node DONE for %s in %.2fs. Classification: %s", 
                state.get("filename"), duration, result.classification.value)

    return {
        "dedup_classification": result.classification.value,
        "dedup_match_id": result.best_match_id,
        "dedup_score": result.best_score,
        "dedup_breakdown": result.score_breakdown,
        "status": "dedup_complete",
    }


async def save_to_db_node(state: IngestionState) -> dict:
    """Persist the candidate — behavior depends on dedup classification.

    NEW_CANDIDATE:  Insert as a new row.
    AUTO_MERGE:     Merge into the existing record, log to CandidateMergeHistory.
    MANUAL_REVIEW:  Insert as new row, create a DedupQueue entry linking both.
    """
    parsed = state.get("parsed_data", {})
    classification = state.get("dedup_classification", DedupClassification.NEW_CANDIDATE.value)
    match_id = state.get("dedup_match_id")
    is_failed = state.get("status") == "needs_review"

    async with AsyncSessionLocal() as session:
        # ── AUTO MERGE ────────────────────────────────────────
        if classification == DedupClassification.AUTO_MERGE.value and match_id and not is_failed:
            from sqlalchemy import select
            result = await session.execute(
                select(Candidate).where(Candidate.id == uuid.UUID(match_id))
            )
            primary = result.scalar_one_or_none()

            if primary:
                score_reason = _build_score_reason(state)
                merge_result = await merge_candidates(
                    session=session,
                    primary=primary,
                    new_data=parsed,
                    new_embedding=state.get("embedding"),
                    merge_type="auto",
                    score_reason=score_reason,
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
                
                resolved_name = parsed.get("full_name")
                if not resolved_name or resolved_name == "Unknown":
                    resolved_name = (state.get("filename") or "Unknown").replace(".pdf", "").replace(".docx", "").replace(".txt", "").replace("_", " ").title()
                    
                await ws_manager.broadcast({
                    "type": "INGESTION_COMPLETE",
                    "candidate_id": merge_result["candidate_id"],
                    "candidate_name": resolved_name,
                    "status": "auto_merged",
                    "source": state.get("source", "resume_upload"),
                })
                return {
                    "candidate_id": merge_result["candidate_id"],
                    "status": "auto_merged",
                }

        # ── NEW CANDIDATE or MANUAL REVIEW — insert new row ──
        fallback_name = (state.get("filename") or "Unknown").replace(".pdf", "").replace(".docx", "").replace(".txt", "").replace("_", " ").title()
        
        resolved_name = parsed.get("full_name")
        if not resolved_name or resolved_name == "Unknown":
            resolved_name = fallback_name
        
        # Ensure we have a summary to show in the UI if parsing failed
        fallback_summary = state.get("error") or "No structured data could be extracted from this document."
        if is_failed and not parsed.get("summary"):
            summary_val = f"Extraction failed: {fallback_summary}"
        else:
            summary_val = parsed.get("summary")
            
        candidate = Candidate(
            full_name=resolved_name,
            email=parsed.get("email"),
            phone=parsed.get("phone"),
            linkedin_url=parsed.get("linkedin_url"),
            location=parsed.get("location"),
            current_title=parsed.get("current_title"),
            years_experience=parsed.get("years_experience"),
            skills=parsed.get("skills"),
            education=[e for e in parsed.get("education", [])],
            experience=[e for e in parsed.get("experience", [])],
            certifications=[c for c in parsed.get("certifications", [])],
            projects=[p for p in parsed.get("projects", [])],
            publications=[p for p in parsed.get("publications", [])],
            summary=summary_val,
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
        await session.flush()  # get the ID before creating dedup queue entry

        # ── MANUAL REVIEW — also create DedupQueue entry ─────
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
                    metadata={"user_id": state.get("user_id", ""), "full_name": parsed.get("full_name", resolved_name)},
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
            "candidate_name": resolved_name,
            "status": status,
            "source": state.get("source", "resume_upload"),
        })

        return {"candidate_id": str(candidate.id), "status": status}


# ── Routing ───────────────────────────────────────────────────────


def _route_or_save(state: IngestionState, next_node: str) -> str:
    if state.get("status") == "needs_review":
        return "save_to_db"
    return next_node


def route_after_extract(state: IngestionState) -> str:
    return _route_or_save(state, "parse_and_embed")


def route_after_parse_embed(state: IngestionState) -> str:
    return _route_or_save(state, "run_dedup_check")


def route_after_dedup(state: IngestionState) -> str:
    return "save_to_db"


# ── Graph assembly ────────────────────────────────────────────────


def build_ingestion_graph() -> StateGraph:
    graph = StateGraph(IngestionState)

    graph.add_node("extract_text", extract_text_node)
    graph.add_node("parse_and_embed", parse_and_embed_node)
    graph.add_node("run_dedup_check", run_dedup_check_node)
    graph.add_node("save_to_db", save_to_db_node)

    graph.set_entry_point("extract_text")
    graph.add_conditional_edges(
        "extract_text",
        route_after_extract,
        {"parse_and_embed": "parse_and_embed", "save_to_db": "save_to_db"},
    )
    graph.add_conditional_edges(
        "parse_and_embed",
        route_after_parse_embed,
        {"run_dedup_check": "run_dedup_check", "save_to_db": "save_to_db"},
    )
    graph.add_edge("run_dedup_check", "save_to_db")
    graph.add_edge("save_to_db", END)

    return graph.compile()


# ── Helpers ───────────────────────────────────────────────────────


def _build_embedding_text(state: IngestionState) -> str:
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
    return "\n".join(parts)


def _build_score_reason(state: IngestionState) -> str:
    """Build a human-readable merge reason from score breakdown."""
    breakdown = state.get("dedup_breakdown", {})
    score = state.get("dedup_score", 0.0)
    parts = []
    for signal, val in (breakdown or {}).items():
        if val > 0:
            parts.append(f"{signal}({val})")
    return f"composite={score:.2f}: " + " + ".join(parts) if parts else f"composite={score:.2f}"


# Singleton compiled graph
ingestion_graph = build_ingestion_graph()
