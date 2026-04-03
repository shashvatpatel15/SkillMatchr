<div align="center">
  <img src="https://img.shields.io/badge/Status-Hackathon_Ready-success" />
  <img src="https://img.shields.io/badge/Powered_By-Google_Gemini-blue" />
  <img src="https://img.shields.io/badge/Stack-FastAPI_%7C_React-black" />
  <br />
  <h1>🎯 HireOps</h1>
  <p><strong>Multi-Agent AI System for Intelligent Resume Parsing, Skill-Set Matching, and API-Ready Talent Intelligence.</strong></p>
  <p><i>Developed for Prama Innovations India Pvt. Ltd. (Problem Statement 10)</i></p>
</div>

---

## ⚡ Overview
Recruitment teams process thousands of diverse resumes daily. Current ATS (Applicant Tracking Systems) rely on rigid keyword matching that misses qualified candidates and surfaces irrelevant ones. **HireOps** solves this by leveraging a Multi-Agent AI architecture to ingest, normalize, and semantically match disparate candidate profiles against complex job descriptions in real time. 

Built strictly with enterprise-grade architectures, this platform exposes the entire AI pipeline through robust REST APIs, webhooks, and a lightning-fast React frontend for talent managers.

---

## 🔥 Key Features

### 1. Multi-Agent OCR & Intelligence Pipeline
* **Ingestion Agent:** Accurately extracts complex layouts (PDFs, DOCX, TXT) into structured JSON formats.
* **Skill Taxonomy Agent:** Normalizes unstandardized keywords (e.g., `React.js` -> `ReactJS`), recognizes hierarchical skill patterns (e.g. `PyTorch` implies `Deep Learning`), and categorizes emerging skills dynamically.
* **Semantic Engine:** Leverages vector similarity (`pgvector`) & Gemini Embeddings to detect deep candidate suitability rather than surface-layer text matching.

### 2. High-Performance Front-end Dashboard
* **Dynamic Applicant Indexing:** Server-side push-down filtering to instantly navigate tens of thousands of applicants seamlessly.
* **Talent Gap Analysis:** Intelligent visual timelines of career trajectories and exact gap reporting for job mismatches.
* **Modern UX:** Fully responsive, glassmorphic UI built using React, Vite, Framer Motion, and Tailwind CSS.

### 3. Production-Ready Deployment
* **V1 REST API:** Fully swagger-documented `/api/v1/` endpoints.
* **Fully Containerized:** Multi-stage `docker-compose` environment linking Redis, PostgreSQL, FastAPI, and Nginx.

---

## 🚀 Tech Stack

| Domain | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion, Recharts |
| **Backend API** | Python 3.11+, FastAPI, Uvicorn, LangGraph |
| **LLM & Embeddings** | Google Gemini `gemini-1.5-flash`, `gemini-embedding-001` |
| **Database** | PostgreSQL (Supabase) with `pgvector` |
| **Cache & Queue** | Redis (In-Memory queues & rate logic) |
| **Infrastructure** | Docker, Nginx, Vercel, Render |

---

## 💻 Local Setup from Scratch

### 1. Clone the Repository
```bash
git clone https://github.com/YourUsername/HireOps.git
cd HireOps
```

### 2. Environment Variables
You must set up your secrets inside `backend/.env`. Create the file using this template:
```env
# Database (Postgres)
DATABASE_URL=postgresql+asyncpg://user:password@host:port/dbname
# LLM Providers
GEMINI_API_KEY=your_gemini_api_key_here
# JWT Secret
JWT_SECRET=your_super_secret_string
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
# Rate Limiting
REDIS_URL=redis://localhost:6379
# Allowed Origins
CORS_ORIGIN=http://localhost:5173
```

### 3. Option A: Run via Docker (Recommended)
This will spin up both the FastAPI backend (port `8000`) and the Vite frontend (port `3000`).
```bash
docker-compose up --build -d
```

### 4. Option B: Run via Standard Terminal 
**Backend Setup:**
```bash
cd backend
python -m venv venv
source venv/Scripts/activate # OR `venv\Scripts\activate` on Windows
pip install -r requirements.txt
cd ..
uvicorn backend.main:app --reload --port 8000
```
**Frontend Setup:**
```bash
cd frontend
npm install
npm run dev
```

---

## 📡 API Endpoints (V1 Third-Party Layer)

HireOps acts as an autonomous operating system capable of integration into any external client via Standard REST.
_(Full OpenAPI / Swagger specification is available dynamically at `http://localhost:8000/docs`)_

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/parse` | `POST` | Upload and synchronously parse an individual resume. |
| `/api/v1/parse/batch` | `POST` | Upload ZIP files/batch archives for asynchronous processing. |
| `/api/v1/candidates/{id}/skills` | `GET` | Fetch specific extracted sub-skills of a normalized candidate. |
| `/api/v1/match` | `POST` | Run deep semantic matching algorithm linking Candidate ↔ Job Request. |
| `/api/v1/skills/taxonomy` | `GET` | Browse the dynamically generated hierarchical taxonomy tree. |

---

## 🌩 Serverless Deployment Architecture

1. **Frontend (Vercel):** Connect your GitHub repo to Vercel, point the "Root Directory" to `frontend`, and inject the `VITE_API_URL` environment variable.
2. **Backend (Render):** Deploy the `backend` folder as a standard Python Web Service. Use `uvicorn main:app --host 0.0.0.0 --port 10000` as the startup binding command.

---
<div align="center">
  <i>Built to bridge the talent gap through AI.</i>
</div>
