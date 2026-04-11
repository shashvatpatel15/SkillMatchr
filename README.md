<h1 align="center">
  🧠 SkillMatchr
</h1>

<h3 align="center">AI-Powered Resume Parsing, Skill Matching & Talent Intelligence Platform</h3>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-blue?logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/LangGraph-1.1-purple" />
  <img src="https://img.shields.io/badge/ChromaDB-Vector_Store-orange" />
  <img src="https://img.shields.io/badge/PostgreSQL-Supabase-336791?logo=postgresql&logoColor=white" />
</p>

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [What SkillMatchr Does](#-what-skillmatchr-does)
- [How the Ingestion Pipeline Works](#-how-the-ingestion-pipeline-works)
- [How Job Matching Works](#-how-job-matching-works)
- [Tech Stack](#-tech-stack)
- [API Endpoints](#-api-endpoints)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)

---

## 🎯 Problem Statement

> **Problem Statement 9: Multi-Agent AI & Talent Intelligence**

Recruiters process resumes in diverse formats (PDF, DOCX, LinkedIn exports) with inconsistent skill terminology. A candidate listing "React.js" won't match a job requiring "ReactJS". Current ATS systems rely on keyword matching that misses qualified candidates.

**Goal:** Build an AI system that parses resumes into structured data, normalizes skills to a canonical taxonomy, performs semantic matching against job descriptions, and exposes it all through REST APIs.

---

## 💡 What SkillMatchr Does

SkillMatchr is a full-stack web application that:

1. **Accepts resume uploads** (PDF, DOCX, TXT) and **LinkedIn PDF exports**
2. **Extracts text** using pdfplumber/python-docx
3. **Parses structured data** via Gemini 2.0 Flash (with Groq LLaMA 3.3 70B as fallback) — extracts name, email, skills, education, experience, etc.
4. **Generates 768-dimensional embeddings** via `gemini-embedding-001` and stores them in ChromaDB
5. **Detects duplicate candidates** using multi-signal scoring (name, email, phone, embedding similarity)
6. **Persists everything** to PostgreSQL with a full audit trail
7. **Matches candidates to jobs** using composite scoring: vector cosine similarity + skill overlap + experience fit + title relevance
8. **Normalizes skills** on-demand using a separate LangGraph that maps raw skill names to canonical forms (e.g., "JS" → "JavaScript")
9. **Provides a dashboard** with dynamic analytics computed from actual database state

All pipeline steps are orchestrated as a **LangGraph directed acyclic graph** — not plain sequential function calls.

---

## 🔄 How the Ingestion Pipeline Works

The pipeline is built with **LangGraph** (`backend/services/workflows/ingestion_graph.py`) as a state machine with 4 nodes:

```
                    ┌──────────────┐
                    │ extract_text │   pdfplumber / python-docx
                    └──────┬───────┘
                           │
              ┌────────────▼─────────────┐
              │    parse_and_embed       │   Gemini 2.0 Flash → Groq fallback
              │  (LLM parse + embedding  │   gemini-embedding-001 (768d)
              │   run in parallel)       │   Both tasks via asyncio.gather()
              └────────────┬─────────────┘
                           │
                ┌──────────▼──────────┐
                │  run_dedup_check    │   Multi-signal dedup scoring
                │  (name+email+phone  │   against existing candidates
                │   +embedding cosine)│
                └──────────┬──────────┘
                           │
                  ┌────────▼────────┐
                  │   save_to_db    │   PostgreSQL + ChromaDB upsert
                  │  (handles new,  │   + WebSocket notification
                  │  merge, review) │   + Activity log entry
                  └────────┬────────┘
                           │
                          END
```

**Conditional routing:** If any node fails, the pipeline short-circuits to `save_to_db` with status `needs_review` — the candidate is still saved with raw text so it can be re-parsed later.

**LLM Fallback:** `gemini_parser.py` tries Gemini first (50s timeout). On any error (429, timeout, malformed response), it falls back to Groq LLaMA 3.3 70B (40s timeout). Both use an aggressive JSON extraction layer (find `{` to `}`) followed by Pydantic validation.

---

## 🎯 How Job Matching Works

Job matching (`backend/services/jobs/job_matching_engine.py`) does **not** use an LLM — it's pure math for speed:

**Composite Score Formula:**
```
score = 0.50 × semantic_similarity    (cosine distance via ChromaDB)
      + 0.25 × skill_match            (fuzzy string matching via thefuzz)
      + 0.15 × experience_match       (years difference)
      + 0.10 × title_relevance        (token sort ratio via thefuzz)
```

**Two-pass approach:**
1. **Pass 1 (fast):** Query ChromaDB for nearest-neighbor candidates by embedding similarity, then compute full composite score
2. **Pass 2 (fallback):** Score remaining candidates without embeddings using skill/experience/title only — skipped if Pass 1 returns enough results

**Performance:** Job embeddings are cached in a 3-level hierarchy (SQLAlchemy → in-process memory → Gemini API). First match on a new job: ~3-5s. All subsequent matches: <200ms.

---

## 🛠 Tech Stack

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Python | 3.11+ | Runtime |
| FastAPI | 0.115.6 | Async REST framework with auto-generated OpenAPI docs |
| LangGraph | 1.1.4 | Orchestrates the ingestion pipeline as a DAG with conditional routing |
| LangChain | 1.2.14 | LLM abstraction layer for Gemini and Groq integration |
| Gemini 2.0 Flash | via langchain-google-genai | Primary LLM for resume parsing |
| Groq LLaMA 3.3 70B | via langchain-groq | Fallback LLM when Gemini fails |
| gemini-embedding-001 | via google-genai SDK | 768-dimensional text embeddings |
| PostgreSQL | via Supabase | Relational data store (users, candidates, jobs, activity logs) |
| ChromaDB | ≥0.5.0 | Local persistent vector database for semantic search |
| SQLAlchemy | 2.0.36 | Async ORM with Alembic for migrations |
| pdfplumber | 0.11.9 | PDF text extraction |
| python-docx | 1.2.0 | DOCX text extraction |
| thefuzz | 0.22.1 | Fuzzy string matching for skill normalization and title relevance |
| Redis | ≥5.0 (optional) | Distributed cache — falls back to in-memory TTL cache if not set |

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19 | UI framework |
| Vite | 8 | Build tool + dev server |
| Tailwind CSS | 4 | Utility-first styling |
| Recharts | 3 | Dashboard charts (area, pie, bar, radial) |
| Framer Motion | 12 | Page transitions and micro-animations |
| Lucide React | 1.7 | Icon set |
| Axios | 1.14 | HTTP client with JWT interceptor |
| React Router | 7 | Client-side routing |

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `GET` | `/api/auth/google/url` | Get Google OAuth consent URL |
| `POST` | `/api/auth/google/callback` | Exchange OAuth code for JWT |

### Resume Ingestion
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ingest/upload` | Upload single resume (PDF/DOCX/TXT) — runs full LangGraph pipeline |
| `POST` | `/api/ingest/upload/batch` | Upload up to 50 resumes |

### Candidates
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/candidates` | List with pagination, sorting, filters |
| `GET` | `/api/candidates/{id}` | Full candidate details |
| `PUT` | `/api/candidates/{id}` | Update candidate fields |
| `DELETE` | `/api/candidates/{id}` | Delete candidate + embeddings |
| `POST` | `/api/candidates/{id}/reparse` | Re-run LLM parsing on stored raw text |
| `GET` | `/api/candidates/{id}/similar` | Find similar candidates via ChromaDB |
| `GET` | `/api/candidates/{id}/analysis` | Run skill normalization (separate LangGraph) |

### Jobs & Matching
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/jobs` | Create job with auto-embedding generation |
| `GET` | `/api/jobs` | List jobs |
| `PUT` | `/api/jobs/{id}` | Update job (title, status, skills, etc.) |
| `DELETE` | `/api/jobs/{id}` | Delete job |
| `POST` | `/api/jobs/{id}/match` | Find best candidates via composite scoring |
| `POST` | `/api/jobs/{id}/compare` | Compare specific candidates against a job |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/analytics/overview` | Dashboard metrics (cached, computed from DB) |
| `GET` | `/api/activity` | Audit log of all operations |
| `GET/POST` | `/api/shortlists` | Manage candidate shortlists |
| `GET` | `/api/search` | Semantic candidate search |
| `GET/POST` | `/api/dedup/queue` | Manage duplicate candidate pairs |

### V1 External API (API Key Auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/parse` | Parse a resume through the pipeline |
| `POST` | `/api/v1/match` | Semantic job matching with gap analysis |
| `GET` | `/api/v1/candidates/{id}/skills` | Get normalized skill profile |
| `GET` | `/api/v1/skills/taxonomy` | Browse/search skill taxonomy |
| `GET` | `/api/v1/metrics` | Pipeline evaluation metrics |

> Full interactive docs at `http://localhost:8000/docs`

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL database (local or [Supabase](https://supabase.com) free tier)
- [Gemini API Key](https://aistudio.google.com/apikey) (free)
- [Groq API Key](https://console.groq.com) (free)

### 1. Clone

```bash
git clone https://github.com/shashvatpatel15/SkillMatchr.git
cd SkillMatchr
```

### 2. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Environment Variables

```bash
cp .env.example .env
```

Edit `backend/.env`:
```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/skillmatchr
GEMINI_API_KEY=your-key
GROQ_API_KEY=your-key
JWT_SECRET=change-this
```

### 4. Database Migrations

```bash
cd ..  # back to project root
alembic upgrade head
```

### 5. Start Backend

```bash
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

API live at `http://localhost:8000` · Docs at `http://localhost:8000/docs`

### 6. Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

App live at `http://localhost:5173`

### 7. Use It

1. Register at `http://localhost:5173`
2. Upload a resume on the **Ingest** page
3. View parsed candidate on **Candidates** page
4. Create a job on **Jobs** page → click **Find Matches**
5. Shortlist top candidates from match results

---

## 📁 Project Structure

```
SkillMatchr/
├── backend/
│   ├── api/                          # FastAPI route handlers
│   │   ├── auth.py                   # Register, login, Google OAuth
│   │   ├── ingest.py                 # Resume upload (single + batch)
│   │   ├── candidates.py             # CRUD + reparse + similar + analysis
│   │   ├── jobs.py                   # Job CRUD + matching + compare
│   │   ├── analytics.py              # Dashboard metrics (cached)
│   │   ├── activity.py               # Audit trail
│   │   ├── shortlists.py             # Shortlist management
│   │   ├── search.py                 # Semantic search
│   │   ├── dedup.py                  # Duplicate queue management
│   │   └── v1/                       # External API (API key auth)
│   │       ├── endpoints.py          # V1 endpoints
│   │       ├── auth_middleware.py     # API key validation
│   │       └── schemas.py            # V1 request/response models
│   ├── core/
│   │   ├── config.py                 # Pydantic settings (reads .env)
│   │   ├── database.py               # SQLAlchemy async engine
│   │   ├── auth.py                   # JWT creation + validation
│   │   ├── oauth.py                  # Google OAuth2 flow
│   │   ├── cache.py                  # Redis + in-memory TTL cache
│   │   ├── chromadb_client.py        # ChromaDB operations
│   │   └── websocket_manager.py      # WebSocket broadcast
│   ├── models/                       # SQLAlchemy ORM models
│   ├── schemas/                      # Pydantic request/response schemas
│   ├── services/
│   │   ├── parsing/
│   │   │   ├── extractor.py          # PDF + DOCX text extraction
│   │   │   ├── gemini_parser.py      # LLM parsing (Gemini → Groq fallback)
│   │   │   └── embedding.py          # gemini-embedding-001 (768d)
│   │   ├── skills/
│   │   │   └── normalization_agent.py # LangGraph for skill taxonomy mapping
│   │   ├── dedup/
│   │   │   ├── engine.py             # Duplicate detection orchestrator
│   │   │   ├── scorer.py             # Multi-signal scoring
│   │   │   └── merger.py             # Candidate merge logic
│   │   ├── jobs/
│   │   │   └── job_matching_engine.py # Composite scoring engine
│   │   ├── search/
│   │   │   └── semantic_search.py    # ChromaDB + keyword search
│   │   └── workflows/
│   │       ├── ingestion_graph.py    # LangGraph: 4-node ingestion pipeline
│   │       └── search_graph.py       # LangGraph: search orchestration
│   └── scripts/
│       ├── seed.py                   # Demo data seeder
│       └── sync_embeddings_to_chroma.py # Backfill embeddings
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx         # Analytics dashboard
│   │   │   ├── CandidatesPage.jsx    # Candidate list + detail drawer
│   │   │   ├── IngestPage.jsx        # Resume upload
│   │   │   ├── JobsPage.jsx          # Job management + match results
│   │   │   ├── MatchPage.jsx         # 1:1 candidate-to-job matching
│   │   │   ├── AnalyticsPage.jsx     # Deep analytics
│   │   │   ├── ActivityPage.jsx      # Audit trail timeline
│   │   │   ├── SearchPage.jsx        # Semantic search
│   │   │   ├── TaxonomyPage.jsx      # Skill taxonomy browser
│   │   │   └── ...
│   │   ├── components/               # Sidebar, TopNav
│   │   └── context/                  # Auth context
│   └── package.json
├── alembic.ini
└── README.md
```

---

<p align="center">
  <sub>Built for the Multi-Agent AI & Talent Intelligence Hackathon</sub>
</p>
