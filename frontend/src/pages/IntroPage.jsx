import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, MapPin, Code, Cpu, Database, Server, Building, Layers, Zap } from 'lucide-react';

export default function IntroPage() {
  return (
    <div className="max-w-5xl mx-auto pb-16 space-y-10">
      
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-widest border border-indigo-100">
          <BookOpen className="w-4 h-4" /> Official Documentation
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
          Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">SkillMatchr</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Multi-Agent AI System for Intelligent Resume Parsing, Skill-Set Matching, and API-Ready Talent Intelligence.
        </p>
      </motion.div>

      {/* Prama Innovations Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} 
        className="glass-card p-6 border-l-4 border-l-fuchsia-500 bg-gradient-to-r from-white to-fuchsia-50/10">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-fuchsia-50 text-fuchsia-600 rounded-xl">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900">Prama Innovations India Pvt. Ltd.</h3>
            <p className="text-slate-600 text-sm mt-1 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" /> 602 Shapath-5 Building, SG Highway, Ahmedabad 380015
            </p>
            <a href="http://www.prama.ai" target="_blank" rel="noreferrer" className="text-sm font-semibold text-fuchsia-600 hover:text-fuchsia-700 mt-2 inline-block">
              www.prama.ai
            </a>
          </div>
        </div>
      </motion.div>

      {/* Problem Statement */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-6 h-6 text-indigo-500" /> Problem Statement 10
        </h2>
        <div className="glass-card p-8 border border-slate-200/60 prose prose-slate max-w-none text-slate-600">
          <p className="lead text-lg font-medium text-slate-800">
            Recruitment and talent acquisition teams process thousands of resumes daily across diverse formats (PDF, DOCX, LinkedIn exports, plain text).
          </p>
          <p>
            Each comes with inconsistent layouts, terminology, and skill representations. A candidate might list 'React.js' while a job description requires 'ReactJS'; one resume uses 'ML Engineering' while the skill database categorizes it as 'Machine Learning Engineering.' Current ATS rely on rigid keyword matching that misses qualified candidates and surfaces irrelevant ones, leading to poor hiring outcomes and wasted recruiter time.
          </p>
          <p>
            <strong>The Challenge:</strong> Build a Multi-Agent AI system that intelligently parses resumes from multiple formats, extracts and normalizes skills against a structured taxonomy, performs semantic matching against job descriptions, and exposes the entire pipeline through well-documented REST APIs for seamless third-party integration by HR platforms.
          </p>
        </div>
      </section>

      {/* API Layer */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Server className="w-6 h-6 text-emerald-500" /> API Layer for Third-Party Consumption
        </h2>
        <div className="glass-card border border-slate-200/60 overflow-hidden">
          <div className="bg-slate-900 text-slate-300 p-6">
            <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
              <Cpu className="w-5 h-5 text-emerald-400" /> Production-Grade REST API
            </h3>
            <p className="text-sm">Expose the entire pipeline through standard REST APIs (OpenAPI/Swagger documented). The system implements API key authentication, rate limiting, request validation, and comprehensive error responses.</p>
          </div>
          
          <div className="p-6 space-y-4 bg-white/50">
            {[
              { method: 'POST', ext: '/api/v1/parse', desc: 'Single resume parsing with file upload' },
              { method: 'POST', ext: '/api/v1/parse/batch', desc: 'Batch resume processing with async job tracking' },
              { method: 'GET', ext: '/api/v1/candidates/{id}/skills', desc: 'Skill profile retrieval' },
              { method: 'POST', ext: '/api/v1/match', desc: 'Job matching with candidate ID and JD' },
              { method: 'GET', ext: '/api/v1/skills/taxonomy', desc: 'Skill taxonomy browsing and search' },
              { method: 'POST', ext: '/api/v1/webhooks', desc: 'Webhook callbacks for async completion' },
            ].map((api, i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                <span className={`px-2 py-1 text-xs font-bold rounded ${api.method === 'POST' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  {api.method}
                </span>
                <code className="text-slate-800 font-semibold flex-1">{api.ext}</code>
                <span className="text-sm text-slate-500 hidden md:block">{api.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Examples */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Code className="w-6 h-6 text-blue-500" /> SDKs & Integration Examples
        </h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Python */}
          <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-700 bg-slate-900">
            <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 text-xs font-mono text-slate-400 flex justify-between items-center">
              <span>Python Example</span>
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">requests</span>
            </div>
            <pre className="p-4 text-sm text-slate-300 overflow-x-auto">
{`import requests

url = "https://skillmatchr.api/v1/parse"
headers = {"X-API-Key": "your_api_key"}

with open("resume.pdf", "rb") as f:
    files = {"file": f}
    response = requests.post(
        url, headers=headers, files=files
    )

print(response.json())`}
            </pre>
          </div>

          {/* JavaScript */}
          <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-700 bg-slate-900">
            <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 text-xs font-mono text-slate-400 flex justify-between items-center">
              <span>JavaScript Example</span>
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded">fetch</span>
            </div>
            <pre className="p-4 text-sm text-slate-300 overflow-x-auto">
{`const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch(
  'https://skillmatchr.api/v1/parse', {
  method: 'POST',
  headers: {
    'X-API-Key': 'your_api_key'
  },
  body: formData
});

const data = await response.json();
console.log(data);`}
            </pre>
          </div>
        </div>
      </section>

    </div>
  );
}
