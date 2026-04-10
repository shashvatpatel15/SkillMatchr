"""One-time script: Sync existing PostgreSQL embeddings to ChromaDB.

Run from project root:
  python -m backend.scripts.sync_embeddings_to_chroma
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import select
from backend.core.database import AsyncSessionLocal
from backend.models.candidate import Candidate
from backend.models.job import Job
from backend.core.chromadb_client import upsert_candidate_embedding, upsert_job_embedding


async def sync():
    print("Syncing PostgreSQL embeddings -> ChromaDB ...\n")

    async with AsyncSessionLocal() as session:
        # ── Candidates ────────────────────────────────────────
        result = await session.execute(
            select(Candidate).where(Candidate.embedding.isnot(None))
        )
        candidates = result.scalars().all()
        print(f"Found {len(candidates)} candidates with embeddings")

        synced_c = 0
        for c in candidates:
            try:
                upsert_candidate_embedding(
                    candidate_id=str(c.id),
                    embedding=list(c.embedding),
                    metadata={
                        "user_id": str(c.created_by) if c.created_by else "",
                        "full_name": c.full_name or "",
                    },
                )
                synced_c += 1
            except Exception as e:
                print(f"  Failed Candidate {c.id}: {e}")

        print(f"  Synced {synced_c}/{len(candidates)} candidates\n")

        # ── Jobs ──────────────────────────────────────────────
        result = await session.execute(
            select(Job).where(Job.embedding.isnot(None))
        )
        jobs = result.scalars().all()
        print(f"Found {len(jobs)} jobs with embeddings")

        synced_j = 0
        for j in jobs:
            try:
                upsert_job_embedding(
                    job_id=str(j.id),
                    embedding=list(j.embedding),
                    metadata={
                        "user_id": str(j.created_by) if j.created_by else "",
                        "title": j.title or "",
                    },
                )
                synced_j += 1
            except Exception as e:
                print(f"  Failed Job {j.id}: {e}")

        print(f"  Synced {synced_j}/{len(jobs)} jobs\n")

    print("Done! ChromaDB is now in sync with PostgreSQL.")


if __name__ == "__main__":
    asyncio.run(sync())
