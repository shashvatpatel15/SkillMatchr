import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.health import router as health_router
from backend.api.auth import router as auth_router
from backend.api.ingest import router as ingest_router
from backend.api.dedup import router as dedup_router
from backend.api.sources import router as sources_router
from backend.api.search import router as search_router
from backend.api.candidates import router as candidates_router
from backend.api.shortlists import router as shortlists_router
from backend.api.activity import router as activity_router
from backend.api.analytics import router as analytics_router
from backend.api.jobs import router as jobs_router
from backend.api.employees import router as employees_router
from backend.api.referrals import router as referrals_router
from backend.api.ws import router as ws_router
from backend.api.v1.endpoints import router as v1_router

app = FastAPI(
    title="SkillMatchr — Multi-Agent Talent Intelligence Platform",
    description=(
        "Production-grade REST API for intelligent resume parsing, "
        "skill-set matching, and talent intelligence.\n\n"
        "## Authentication\n"
        "- **JWT Bearer Token**: For frontend/internal use\n"
        "- **API Key (X-API-Key header)**: For third-party integrations\n\n"
        "## v1 API Endpoints\n"
        "All third-party endpoints are under `/api/v1/` with API key auth and rate limiting.\n\n"
        "## Multi-Agent Pipeline\n"
        "Resume processing flows through: Text Extraction → LLM Parsing → "
        "Skill Normalization → Embedding → Dedup → Persist\n"
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "V1 API", "description": "Production API for third-party consumption"},
        {"name": "Health", "description": "Health check endpoints"},
        {"name": "Auth", "description": "Authentication & user management"},
        {"name": "Ingestion", "description": "Resume upload & parsing"},
        {"name": "Jobs", "description": "Job management & matching"},
        {"name": "Candidates", "description": "Candidate CRUD"},
        {"name": "Search", "description": "Semantic candidate search"},
    ],
)


# Support comma-separated CORS origins (e.g. "https://app.vercel.app,https://custom-domain.com")
_raw_origins = os.environ.get("CORS_ORIGIN", "")
_extra_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

_allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "https://skill-matchr.vercel.app",
] + _extra_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, tags=["Health"])
app.include_router(auth_router)
app.include_router(ingest_router)
app.include_router(dedup_router)
app.include_router(sources_router)
app.include_router(search_router)
app.include_router(candidates_router)
app.include_router(shortlists_router)
app.include_router(activity_router)
app.include_router(analytics_router)
app.include_router(jobs_router)
app.include_router(employees_router)
app.include_router(referrals_router)
app.include_router(ws_router)
app.include_router(v1_router)
