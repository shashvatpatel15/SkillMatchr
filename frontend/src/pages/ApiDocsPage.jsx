import React, { useState } from 'react';
import {
  Code2, Copy, Check, ChevronDown, ChevronRight, ExternalLink,
  FileText, Zap, Search, Users, Target, BookOpen, Key, Webhook,
  Terminal, Sparkles, ArrowRight, Shield, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ENDPOINTS = [
  {
    group: 'Resume Parsing',
    icon: FileText,
    color: 'from-blue-500 to-cyan-500',
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/parse',
        desc: 'Parse a single resume file (PDF/DOCX). Returns structured candidate data with normalized skills.',
        auth: 'API Key',
        params: 'file (multipart/form-data)',
        response: `{
  "candidate_id": "550e8400-...",
  "status": "completed",
  "parsed_data": {
    "full_name": "John Doe",
    "email": "john@example.com",
    "skills": ["Python", "React", "PostgreSQL"],
    "years_experience": 5,
    "current_title": "Senior Developer"
  },
  "skill_profile": {
    "total_canonical": 3,
    "total_inferred": 2
  },
  "pipeline_run_id": "run-abc123",
  "latency_ms": 4500
}`,
      },
      {
        method: 'POST',
        path: '/api/v1/parse/batch',
        desc: 'Batch process multiple resumes with async job tracking and optional webhook callback.',
        auth: 'API Key',
        params: 'files[] (multipart/form-data), webhook_url (optional)',
        response: `{
  "job_id": "batch-xyz789",
  "status": "queued",
  "total": 15,
  "message": "Batch job created. Poll GET /api/v1/parse/batch/{job_id} for status."
}`,
      },
      {
        method: 'GET',
        path: '/api/v1/parse/batch/{job_id}',
        desc: 'Check status of a batch parsing job.',
        auth: 'API Key',
        params: 'job_id (path)',
        response: `{
  "job_id": "batch-xyz789",
  "status": "completed",
  "total": 15,
  "processed": 15,
  "succeeded": 14,
  "failed": 1,
  "results": [...]
}`,
      },
    ],
  },
  {
    group: 'Skill Profiles',
    icon: Users,
    color: 'from-violet-500 to-purple-500',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/candidates/{id}/skills',
        desc: 'Retrieve the full skill profile for a candidate, including canonical mappings, inferred skills, and proficiency levels.',
        auth: 'API Key',
        params: 'id (path) – Candidate UUID',
        response: `{
  "candidate_id": "550e8400-...",
  "candidate_name": "John Doe",
  "skills": [
    {
      "canonical_name": "Python",
      "original_name": "python3",
      "match_type": "synonym",
      "proficiency": "advanced",
      "category": "Programming Languages"
    }
  ],
  "inferred_skills": [
    {
      "canonical_name": "FastAPI",
      "inferred_from": "Python + REST API experience",
      "confidence": 0.82
    }
  ],
  "total_canonical": 12,
  "total_inferred": 4
}`,
      },
    ],
  },
  {
    group: 'Job Matching',
    icon: Target,
    color: 'from-emerald-500 to-teal-500',
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/match',
        desc: 'Run semantic skill-to-job matching with gap analysis and upskilling recommendations.',
        auth: 'API Key',
        params: 'JSON body: candidate_id, job_title, job_description, skills_required[], experience_required, match_threshold',
        response: `{
  "job_title": "Senior Python Developer",
  "candidate": {
    "candidate_id": "550e8400-...",
    "overall_score": 0.78,
    "breakdown": {
      "semantic_similarity": 0.85,
      "skill_match": 0.72,
      "experience_match": 0.80,
      "title_relevance": 0.75
    },
    "matched_skills": ["Python", "PostgreSQL", "REST APIs"],
    "gap_analysis": [
      {
        "skill": "Kubernetes",
        "importance": "nice_to_have",
        "upskilling_suggestions": [
          "Complete CKA certification",
          "K8s workshops on KodeKloud"
        ]
      }
    ],
    "recommendation": "good_match"
  }
}`,
      },
    ],
  },
  {
    group: 'Skill Taxonomy',
    icon: BookOpen,
    color: 'from-amber-500 to-orange-500',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/skills/taxonomy',
        desc: 'Browse and search the skill taxonomy. Filter by category or search query.',
        auth: 'API Key',
        params: 'q (query string), category (optional)',
        response: `{
  "query": "react",
  "total": 3,
  "categories": [
    { "id": "...", "name": "Frontend Development", "skill_count": 24 }
  ],
  "skills": [
    {
      "canonical_name": "React",
      "category": "Frontend Development",
      "skill_type": "technical",
      "synonyms": ["ReactJS", "React.js"]
    }
  ]
}`,
      },
    ],
  },
  {
    group: 'Webhooks',
    icon: Webhook,
    color: 'from-rose-500 to-pink-500',
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/webhooks',
        desc: 'Subscribe to event callbacks (parse.completed, batch.completed, match.completed).',
        auth: 'API Key',
        params: 'JSON body: url, events[], secret (optional)',
        response: `{
  "id": "wh-abc123",
  "url": "https://your-app.com/webhook",
  "events": ["parse.completed", "batch.completed"],
  "is_active": true
}`,
      },
    ],
  },
  {
    group: 'Pipeline Observability',
    icon: Zap,
    color: 'from-indigo-500 to-blue-500',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/pipeline/runs',
        desc: 'List recent pipeline execution runs with agent counts and latency.',
        auth: 'JWT or API Key',
        params: 'limit (optional, default 20)',
        response: `[
  {
    "run_id": "run-abc123",
    "status": "completed",
    "elapsed_ms": 4200,
    "agent_count": 6,
    "candidate_id": "550e8400-..."
  }
]`,
      },
      {
        method: 'GET',
        path: '/api/v1/metrics',
        desc: 'Comprehensive evaluation metrics: parsing accuracy, normalization precision, matching quality, orchestration reliability.',
        auth: 'JWT or API Key',
        params: 'None',
        response: `{
  "parsing_accuracy": { "f1_score": 0.92, "successfully_parsed": 847 },
  "normalization_precision": { "canonical_mapping_rate": 0.89 },
  "matching_quality": { "ndcg": 0.85, "expert_correlation": 0.78 },
  "orchestration_reliability": { "success_rate": 0.97 },
  "latency": { "avg_agent_latency_ms": 380, "p95_latency_ms": 1200 }
}`,
      },
    ],
  },
];

const PYTHON_SDK = `import requests

API_URL = "https://your-api.com"
API_KEY = "sk-your-api-key"
headers = {"X-API-Key": API_KEY}

# ── Parse a single resume ──────────────────────
with open("resume.pdf", "rb") as f:
    response = requests.post(
        f"{API_URL}/api/v1/parse",
        headers=headers,
        files={"file": ("resume.pdf", f, "application/pdf")}
    )
    result = response.json()
    print(f"Candidate: {result['parsed_data']['full_name']}")
    print(f"Skills: {result['parsed_data']['skills']}")
    print(f"Latency: {result['latency_ms']}ms")

# ── Get skill profile ──────────────────────────
candidate_id = result["candidate_id"]
profile = requests.get(
    f"{API_URL}/api/v1/candidates/{candidate_id}/skills",
    headers=headers
).json()

print(f"Canonical skills: {profile['total_canonical']}")
print(f"Inferred skills: {profile['total_inferred']}")

# ── Job matching with gap analysis ─────────────
match = requests.post(
    f"{API_URL}/api/v1/match",
    headers=headers,
    json={
        "candidate_id": candidate_id,
        "job_title": "Senior Python Developer",
        "job_description": "We need a Python expert with FastAPI...",
        "skills_required": ["Python", "FastAPI", "PostgreSQL"],
        "skills_nice_to_have": ["Docker", "Kubernetes"],
        "experience_required": 5,
        "match_threshold": 0.3
    }
).json()

print(f"Overall Score: {match['candidate']['overall_score']:.0%}")
print(f"Recommendation: {match['candidate']['recommendation']}")

# ── Browse skill taxonomy ──────────────────────
taxonomy = requests.get(
    f"{API_URL}/api/v1/skills/taxonomy?q=react",
    headers=headers
).json()

for skill in taxonomy["skills"]:
    print(f"  {skill['canonical_name']} ({skill['category']})")`;

const JS_SDK = `const API_URL = "https://your-api.com";
const API_KEY = "sk-your-api-key";
const headers = { "X-API-Key": API_KEY };

// ── Parse a single resume ──────────────────────
const formData = new FormData();
formData.append("file", fileInput.files[0]);

const parseRes = await fetch(\`\${API_URL}/api/v1/parse\`, {
  method: "POST",
  headers: { "X-API-Key": API_KEY },
  body: formData,
});
const parsed = await parseRes.json();
console.log("Candidate:", parsed.parsed_data.full_name);
console.log("Skills:", parsed.parsed_data.skills);

// ── Get skill profile ──────────────────────────
const profileRes = await fetch(
  \`\${API_URL}/api/v1/candidates/\${parsed.candidate_id}/skills\`,
  { headers }
);
const profile = await profileRes.json();
console.log(\`Canonical: \${profile.total_canonical}, Inferred: \${profile.total_inferred}\`);

// ── Job matching ───────────────────────────────
const matchRes = await fetch(\`\${API_URL}/api/v1/match\`, {
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify({
    candidate_id: parsed.candidate_id,
    job_title: "Senior Python Developer",
    job_description: "We need a Python expert with FastAPI...",
    skills_required: ["Python", "FastAPI", "PostgreSQL"],
    match_threshold: 0.3,
  }),
});
const match = await matchRes.json();
console.log(\`Score: \${(match.candidate.overall_score * 100).toFixed(0)}%\`);
console.log(\`Recommendation: \${match.candidate.recommendation}\`);

// ── Taxonomy search ────────────────────────────
const taxRes = await fetch(
  \`\${API_URL}/api/v1/skills/taxonomy?q=react\`,
  { headers }
);
const taxonomy = await taxRes.json();
taxonomy.skills.forEach(s => console.log(\`  \${s.canonical_name} (\${s.category})\`));`;

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all border border-white/10">
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function EndpointCard({ ep }) {
  const [expanded, setExpanded] = useState(false);
  const methodColors = {
    GET:    'bg-emerald-500',
    POST:   'bg-blue-500',
    PUT:    'bg-amber-500',
    DELETE: 'bg-red-500',
    PATCH:  'bg-violet-500',
  };

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${expanded ? 'border-indigo-200 shadow-md' : 'border-slate-200 shadow-sm hover:shadow-md'}`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left px-5 py-4 flex items-center gap-4">
        <span className={`${methodColors[ep.method]} text-white text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider min-w-[52px] text-center`}>
          {ep.method}
        </span>
        <code className="text-sm font-mono text-slate-800 font-semibold flex-1">{ep.path}</code>
        <span className="text-xs text-slate-400 hidden sm:inline">{ep.auth}</span>
        {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-100"
          >
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600">{ep.desc}</p>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Parameters</p>
                <p className="text-sm text-slate-700 font-mono bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">{ep.params}</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Response</p>
                  <CopyButton text={ep.response} />
                </div>
                <pre className="text-xs font-mono bg-slate-900 text-emerald-300 p-4 rounded-xl overflow-x-auto leading-relaxed border border-slate-700">
                  {ep.response}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ApiDocsPage() {
  const [sdkTab, setSdkTab] = useState('python');
  const [expandedGroup, setExpandedGroup] = useState(0);

  return (
    <div className="space-y-8 max-w-6xl mx-auto page-enter">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl p-8 sm:p-10"
        style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81, #3730a3)' }}>
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-2.5">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-200 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-400/20">
              V1 REST API
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            API Documentation
          </h1>
          <p className="text-indigo-200 text-base max-w-2xl leading-relaxed">
            Production-grade REST API for intelligent resume parsing, skill normalization, semantic matching, and talent intelligence. 
            OpenAPI/Swagger documented with comprehensive error handling.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            {[
              { icon: Shield, label: 'API Key Auth' },
              { icon: Clock, label: '< 10s Latency' },
              { icon: Zap, label: 'Rate Limited' },
              { icon: Webhook, label: 'Webhook Callbacks' },
            ].map((b, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs font-medium text-indigo-200 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl backdrop-blur-md">
                <b.icon className="w-3.5 h-3.5" />{b.label}
              </span>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <a href="/docs" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-900 font-semibold rounded-xl text-sm shadow-lg hover:shadow-xl transition-all">
              <ExternalLink className="w-4 h-4" />
              Open Swagger UI
            </a>
            <a href="/redoc" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white font-semibold rounded-xl text-sm border border-white/10 hover:bg-white/20 transition-all backdrop-blur-md">
              ReDoc
            </a>
          </div>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          'Python / FastAPI', 'LangGraph Agents', 'PostgreSQL + pgvector',
          'Sentence-Transformers', 'Redis Queue', 'Docker Compose',
        ].map((tech, i) => (
          <motion.div key={tech} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="text-center p-3 rounded-xl border border-slate-200 bg-white/80 shadow-sm">
            <p className="text-xs font-semibold text-slate-700">{tech}</p>
          </motion.div>
        ))}
      </div>

      {/* Endpoints */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-indigo-500" />
          API Endpoints
        </h2>
        <div className="space-y-6">
          {ENDPOINTS.map((group, gi) => (
            <div key={group.group}>
              <button
                onClick={() => setExpandedGroup(expandedGroup === gi ? -1 : gi)}
                className="flex items-center gap-3 mb-3 group"
              >
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${group.color} flex items-center justify-center shadow-sm`}>
                  <group.icon className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{group.group}</h3>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{group.endpoints.length} endpoint{group.endpoints.length > 1 ? 's' : ''}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedGroup === gi ? 'rotate-180' : ''}`} />
              </button>
              {expandedGroup === gi && (
                <div className="space-y-3 ml-11">
                  {group.endpoints.map((ep, ei) => (
                    <EndpointCard key={ei} ep={ep} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SDK Examples */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
          <Code2 className="w-5 h-5 text-indigo-500" />
          Integration SDKs
        </h2>
        <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
          {/* Tab bar */}
          <div className="bg-slate-900 px-5 py-3 flex items-center justify-between">
            <div className="flex gap-1">
              <button onClick={() => setSdkTab('python')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  sdkTab === 'python' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}>
                🐍 Python
              </button>
              <button onClick={() => setSdkTab('javascript')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  sdkTab === 'javascript' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}>
                ⚡ JavaScript
              </button>
            </div>
            <CopyButton text={sdkTab === 'python' ? PYTHON_SDK : JS_SDK} />
          </div>
          {/* Code */}
          <pre className="bg-[#0d1117] text-green-300 text-xs font-mono p-6 overflow-x-auto leading-relaxed max-h-[500px] overflow-y-auto">
            {sdkTab === 'python' ? PYTHON_SDK : JS_SDK}
          </pre>
        </div>
      </div>

      {/* Evaluation Criteria */}
      <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl border border-slate-200/60 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          Evaluation Criteria
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Resume Parsing Accuracy', desc: 'Field-level F1-score on ground-truth labeled resumes', metric: 'F1 ≥ 0.90' },
            { label: 'Skill Normalization', desc: 'Correct canonical mapping rate using taxonomy', metric: 'Precision ≥ 0.85' },
            { label: 'Matching Quality', desc: 'NDCG and correlation with expert rankings', metric: 'NDCG ≥ 0.80' },
            { label: 'API Completeness', desc: 'Endpoint coverage, docs quality, error handling', metric: '100% Coverage' },
            { label: 'Orchestration Reliability', desc: 'Multi-agent success rate under concurrent load', metric: '≥ 97% uptime' },
            { label: 'End-to-End Latency', desc: 'Single resume processing time target', metric: '< 10 seconds' },
          ].map((c, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-800">{c.label}</p>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
                  {c.metric}
                </span>
              </div>
              <p className="text-xs text-slate-500">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* architecture info */}
      <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Multi-Agent Pipeline Architecture</h2>
        <p className="text-sm text-slate-600 mb-4">
          Resume processing flows through a LangGraph-orchestrated pipeline with 6 specialized agents:
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { name: 'Text Extraction', icon: '📄', desc: 'pdfplumber / PyMuPDF / python-docx' },
            { name: 'LLM Parsing', icon: '🧠', desc: 'Structured data extraction via LLM' },
            { name: 'Skill Normalization', icon: '🏷️', desc: 'Canonical mapping with taxonomy' },
            { name: 'Embedding Generation', icon: '🔢', desc: 'sentence-transformers vectors' },
            { name: 'Dedup Check', icon: '🔍', desc: 'pgvector similarity detection' },
            { name: 'Database Persist', icon: '💾', desc: 'PostgreSQL structured storage' },
          ].map((agent, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                <span className="text-lg">{agent.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-slate-800">{agent.name}</p>
                  <p className="text-[10px] text-slate-500">{agent.desc}</p>
                </div>
              </div>
              {i < 5 && <ArrowRight className="w-4 h-4 text-slate-300 self-center hidden lg:block" />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
