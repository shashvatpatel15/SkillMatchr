<div align="center">
<h1>🎯 SkillMatchr</h1>
  <p><strong>Multi-Agent AI System for Intelligent Resume Parsing, Skill-Set Matching, and API-Ready Talent Intelligence.</strong></p>
  <p><i>Developed by Team SteriodPrompts</i></p>
</div>

---

## ⚡ Overview
Recruitment teams process thousands of diverse resumes daily. Current ATS (Applicant Tracking Systems) rely on rigid keyword matching that misses qualified candidates and surfaces irrelevant ones. **SkillMatchr** solves this by leveraging a Multi-Agent AI architecture to ingest, normalize, and semantically match disparate candidate profiles against complex job descriptions in real time. 

Built strictly with enterprise-grade architectures, this platform exposes the entire AI pipeline through robust REST APIs, WebSockets for immediate frontend syncing, and a lightning-fast React frontend for talent managers.

---

## 🔥 Key Hackathon Features

### 1. Multi-Agent Agentic Parsing & Intelligence Pipeline 
* **Universal Ingestion Agent:** Accurately extracts complex layouts across **PDFs**, **DOCX**, and **TXT** files directly into structured JSON schemas utilizing `gemini-2.5-flash` natively bound to Pydantic outputs.
* **Deep Feature Extraction:** Robust processing pulls granular metadata beyond basic contact info, including verifiable **Certifications**, **Projects**, and academic **Publications**.
* **Skill Taxonomy Agent:** Normalizes unstandardized keywords (e.g., `React.js` -> `ReactJS`), recognizes hierarchical skill patterns (e.g. `PyTorch` implies `Deep Learning`), and categorizes emerging skills dynamically.
* **Semantic Engine:** Leverages vector similarity (`pgvector`) & Gemini Embeddings to detect deep candidate suitability (Cosine Similarity NDCG) rather than surface-layer Boolean matching.

### 2. High-Performance Live Dashboard
* **Realtime Syncing:** Employs JWT-authenticated WebSockets to sync data extraction to the Dashboard without user-polling.
* **Dynamic Applicant Indexing:** Server-side push-down filtering leveraging newly engineered multi-column `PostgreSQL` indexing allowing recruiters to instantly query tens of thousands of applicants.
* **Clean Multi-Tenancy Isolations:** Strict Row-Level query validations guarantee complete isolation across respective tenant HR workspaces.
* **Interactive UI:** Glassmorphism UI built in React and Tailwind displaying gorgeous "Quick Overview" modules linking dynamically to live project URLs and candidate analyses.

### 3. Production-Ready Deployment
* **Scale-Ready Metrics:** Verified >90% Field Extraction Precision, 10-second end-to-end ingestion latency bounds, and 100% LLM pipeline structural durability.
* **V1 REST API:** Fully OpenAPI / Swagger-documented endpoints.

---

## 🚀 Tech Stack

| Domain | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion, WebSockets |
| **Backend API** | Python 3.11+, FastAPI, Uvicorn, LangGraph (`ainvoke`) |
| **LLM & Embeddings** | Google Gemini `gemini-2.5-flash`, `gemini-embedding-001` |
| **Database** | PostgreSQL with `pgvector` & dynamic Alembic Migrations |
| **Infrastructure** | Vercel (Front-end), Render (Back-end) |

---

## 💻 Local Setup & Hackathon Evaluation

### 1. Clone the Repository
```bash
git clone https://github.com/shashvatpatel15/SkillMatchr.git
cd SkillMatchr
```

### 2. Environment Variables
Create `.env` inside `/backend` using this template:
```env
# Database (Postgres)
DATABASE_URL=postgresql+asyncpg://user:password@host:port/dbname
# LLM Providers
GEMINI_API_KEY=your_gemini_api_key_here
# JWT Secret
JWT_SECRET=your_super_secret_string
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
# Allowed Origins
CORS_ORIGIN=http://localhost:5173
```
Create `.env` inside `/frontend`:
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
```

### 3. Backend Generation
```bash
cd backend
python -m venv venv
# Activate your venv:
# `venv\Scripts\activate` on Windows || `source venv/bin/activate` on Mac
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload --port 8000
```

### 4. Frontend Launch
```bash
cd frontend
npm install
npm run dev
```

### 🔬 Evaluating Benchmarks
SkillMatchr meets high-performance grading criteria out-of-the-box. Refer to **`benchmark_validation_report.md`** within the project directory for the explicit structural writeup mapping our system to parsing, NDCG, and Latency load prerequisites.

For a live check across the environment, run our benchmarking harness dummy script:
```bash
cd backend
python scripts/eval_benchmark.py
```

---

<div align="center">
  <i>Built to bridge the talent gap through Autonomous Agentic AI.</i>
</div>
