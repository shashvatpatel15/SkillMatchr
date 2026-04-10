<h1 align="center">SkillMatchr ✨</h1>
<p align="center">
  <strong>Multi-Agent AI & Talent Intelligence Platform</strong><br>
  <em>Intelligent Resume Parsing, Semantic Job Matching, and Taxonomy Normalization</em>
</p>

## 🚀 Overview
**SkillMatchr** is an enterprise-grade Applicant Tracking System (ATS) built for the modern recruiter. Processing thousands of resumes can result in lost talent due to rigid keyword matching. SkillMatchr solves this using a **Multi-Agent AI Pipeline** that extracts, normalizes, and semantically maps candidates' skills against dynamic job descriptions.

Instead of matching "React" and "ReactJS" loosely, SkillMatchr understands deep technical taxonomies, uncovers inferred skills, and calculates robust composite matching scores (Semantic + Experience + Skills + Titles) utilizing embedding graphs and LLM orchestrations.

---

## 🌟 Key Features
- **Intelligent Ingestion Pipeline:** Multi-agent pipeline to extract unstructured info from PDFs, DOCX, and text.
- **Skill Taxonomy Engine:** Maps messy resume keywords to Canonical Skills. Uncovers "Inferred" and "Emerging" skills contextually using AI.
- **Semantic Vector Matching:** Leverages **ChromaDB** for rapid cosine similarity semantic queries.
- **Real-Time Observability:** Tracks multi-agent latency, success rate, execution time, and F1-score accuracy in a real-time dashboard.
- **Enterprise UI/UX:** Ultra-premium glassmorphic interfaces with real-time websocket updates on candidate processing statuses.
- **V1 External APIs:** Full developer suite for embedding ATS integrations natively with API Keys and webhooks.

---

## 🛠️ Technology Stack
### Backend
* **Framework:** Python 3.11 / FastAPI (Async native)
* **AI & Orchestration:** Gemini 2.0 Flash / LangGraph / LangChain
* **Vector Database:** ChromaDB (Local SQLite-backed persistent vectors)
* **Relational Database:** PostgreSQL (Supabase/Local) / SQLAlchemy / Alembic
* **Concurrency:** WebSockets, Asyncio, Background Tasks

### Frontend
* **Framework:** React 18 / Vite
* **Styling & UI:** TailwindCSS, Framer Motion, Lucide-React
* **State Management:** React Context API
* **Charting:** Recharts / Custom SVG rings

---

## ⚙️ Getting Started (Local Development)

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- A running PostgreSQL Database

### 2. Backend Setup
Navigate to the root directory, then move into the backend foldler:
```bash
cd backend
```

Create a virtual environment and install dependencies:
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

Set up your environment variables. Look at `.env.example` as a baseline and create your own `.env` file:
```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/skillmatchr
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=super_secret_jwt_string_for_dev
CHROMA_PERSIST_DIR=chroma_data
```

Run database migrations and seed the taxonomy metadata:
```bash
alembic upgrade head
python scripts/seed.py
```

Boot up the FastAPI server:
```bash
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```
*(The backend will run on `http://localhost:8000`. You can visit `http://localhost:8000/docs` to see the live OpenAPI specification).*

---

### 3. Frontend Setup
Open a new terminal window and navigate to the frontend folder:
```bash
cd frontend
```

Install dependencies and start the Vite development server:
```bash
npm install
npm run dev
```
*(The React application will run on `http://localhost:5173`).*

---

## 🗄️ Database Architecture
- **Postgres:** Sits as the ultimate source of truth holding `Users`, `Candidates` (nested JSON representations), `Jobs`, `Shortlists`, and the complex `SkillTaxonomy` map.
- **ChromaDB:** A dedicated local persistent store mapped strictly to UUIDs processing 768-1536 dimensional document embeddings to power semantic vector searches globally.

---

## ©️ Hackathon Scope
This project was conceptualized and engineered for the **Multi-Agent AI & Talent Intelligence** Hackathon. 
We directly address the Problem Statement of: *Extracting and normalizing skills against unstructured data to prevent poor keyword caching & enhance placement success rates.*
