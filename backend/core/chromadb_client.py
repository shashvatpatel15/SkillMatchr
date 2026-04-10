"""ChromaDB client — persistent local vector database.

Provides two collections:
  - `candidates`: candidate embeddings keyed by candidate UUID
  - `jobs`: job embeddings keyed by job UUID

Each document stores lightweight metadata (name, user_id) alongside
the embedding vector.  Full candidate/job data stays in PostgreSQL.
"""

from __future__ import annotations

import logging
from pathlib import Path

import chromadb
from chromadb.config import Settings as ChromaSettings

from backend.core.config import get_settings

logger = logging.getLogger(__name__)

_client: chromadb.ClientAPI | None = None


def get_chroma_client() -> chromadb.ClientAPI:
    """Return (or lazily create) the persistent ChromaDB client."""
    global _client
    if _client is not None:
        return _client

    settings = get_settings()
    persist_dir = settings.CHROMA_PERSIST_DIR

    # Ensure the directory exists
    Path(persist_dir).mkdir(parents=True, exist_ok=True)

    _client = chromadb.PersistentClient(
        path=persist_dir,
        settings=ChromaSettings(
            anonymized_telemetry=False,
            allow_reset=True,
        ),
    )
    logger.info("ChromaDB client initialized at %s", persist_dir)
    return _client


def get_candidates_collection() -> chromadb.Collection:
    """Get or create the 'candidates' collection (cosine distance)."""
    client = get_chroma_client()
    return client.get_or_create_collection(
        name="candidates",
        metadata={"hnsw:space": "cosine"},
    )


def get_jobs_collection() -> chromadb.Collection:
    """Get or create the 'jobs' collection (cosine distance)."""
    client = get_chroma_client()
    return client.get_or_create_collection(
        name="jobs",
        metadata={"hnsw:space": "cosine"},
    )


# ── Helper functions ──────────────────────────────────────────────


def upsert_candidate_embedding(
    candidate_id: str,
    embedding: list[float],
    metadata: dict | None = None,
) -> None:
    """Store/update a candidate's embedding in ChromaDB."""
    col = get_candidates_collection()
    meta = metadata or {}
    col.upsert(
        ids=[candidate_id],
        embeddings=[embedding],
        metadatas=[meta],
    )


def upsert_job_embedding(
    job_id: str,
    embedding: list[float],
    metadata: dict | None = None,
) -> None:
    """Store/update a job's embedding in ChromaDB."""
    col = get_jobs_collection()
    meta = metadata or {}
    col.upsert(
        ids=[job_id],
        embeddings=[embedding],
        metadatas=[meta],
    )


def query_similar_candidates(
    query_embedding: list[float],
    n_results: int = 20,
    where: dict | None = None,
) -> dict:
    """Find candidate embeddings nearest to query_embedding.

    Returns ChromaDB result dict with keys: ids, distances, metadatas.
    Distances are cosine distances (0 = identical, 2 = opposite).
    """
    col = get_candidates_collection()
    kwargs: dict = {
        "query_embeddings": [query_embedding],
        "n_results": min(n_results, col.count() or 1),
    }
    if where:
        kwargs["where"] = where
    return col.query(**kwargs)


def query_similar_jobs(
    query_embedding: list[float],
    n_results: int = 20,
    where: dict | None = None,
) -> dict:
    """Find job embeddings nearest to query_embedding."""
    col = get_jobs_collection()
    kwargs: dict = {
        "query_embeddings": [query_embedding],
        "n_results": min(n_results, col.count() or 1),
    }
    if where:
        kwargs["where"] = where
    return col.query(**kwargs)


def delete_candidate_embedding(candidate_id: str) -> None:
    """Remove a candidate's embedding from ChromaDB."""
    col = get_candidates_collection()
    try:
        col.delete(ids=[candidate_id])
    except Exception:
        pass  # Silently ignore if not found


def delete_job_embedding(job_id: str) -> None:
    """Remove a job's embedding from ChromaDB."""
    col = get_jobs_collection()
    try:
        col.delete(ids=[job_id])
    except Exception:
        pass


def get_candidate_embedding(candidate_id: str) -> list[float] | None:
    """Retrieve a single candidate's embedding from ChromaDB."""
    col = get_candidates_collection()
    try:
        result = col.get(ids=[candidate_id], include=["embeddings"])
        if result["embeddings"] and result["embeddings"][0]:
            return result["embeddings"][0]
    except Exception:
        pass
    return None
