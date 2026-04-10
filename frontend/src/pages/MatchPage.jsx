import React, { useState, useEffect } from 'react';
import { Target, Search, Loader2, CheckCircle2, XCircle, AlertTriangle, ArrowRight, TrendingUp, Star, BookOpen, ChevronDown } from 'lucide-react';
import api from '../lib/api';

const SCORE_COLOR = (score) => {
  if (score >= 0.75) return { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'from-emerald-400 to-emerald-500' };
  if (score >= 0.55) return { text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', bar: 'from-blue-400 to-blue-500' };
  if (score >= 0.35) return { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', bar: 'from-amber-400 to-amber-500' };
  return { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', bar: 'from-red-400 to-red-500' };
};

const REC_LABELS = {
  strong_match: { label: 'Strong Match', icon: Star, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  good_match: { label: 'Good Match', icon: CheckCircle2, color: 'text-blue-700 bg-blue-50 border-blue-200' },
  partial_match: { label: 'Partial Match', icon: AlertTriangle, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  weak_match: { label: 'Weak Match', icon: XCircle, color: 'text-red-700 bg-red-50 border-red-200' },
};

function ScoreBar({ label, value }) {
  const cols = SCORE_COLOR(value);
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className={`text-xs font-bold ${cols.text}`}>{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${cols.bar} transition-all duration-700`}
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  );
}

function GapCard({ gap }) {
  const [open, setOpen] = useState(false);
  const isRequired = gap.importance === 'required';
  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${isRequired ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          <XCircle className={`w-4 h-4 shrink-0 ${isRequired ? 'text-red-500' : 'text-amber-500'}`} />
          <span className={`font-medium text-sm ${isRequired ? 'text-red-700' : 'text-amber-700'}`}>{gap.skill}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isRequired ? 'bg-red-200 text-red-700' : 'bg-amber-200 text-amber-700'}`}>
            {isRequired ? 'Required' : 'Nice to have'}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && gap.upskilling_suggestions?.length > 0 && (
        <div className="px-4 pb-4 border-t border-current/10">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3 mb-2 flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> Upskilling Resources
          </p>
          <ul className="space-y-1.5">
            {gap.upskilling_suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <ArrowRight className="w-3 h-3 mt-0.5 shrink-0 text-indigo-400" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function MatchPage() {
  const [candidates, setCandidates] = useState([]);
  const [candidateId, setCandidateId] = useState('');
  const [candQuery, setCandQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [niceSkills, setNiceSkills] = useState('');
  const [expRequired, setExpRequired] = useState('');
  const [threshold, setThreshold] = useState(0.3);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/candidates?limit=50')
      .then(r => setCandidates(r.data?.results || []))
      .catch(() => {});
  }, []);

  const handleMatch = async (e) => {
    e.preventDefault();
    if (!candidateId || !jobTitle || !jobDesc) {
      setError('Please fill in Candidate, Job Title, and Job Description.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/api/v1/match', {
        candidate_id: candidateId,
        job_title: jobTitle,
        job_description: jobDesc,
        skills_required: requiredSkills.split(',').map(s => s.trim()).filter(Boolean),
        skills_nice_to_have: niceSkills.split(',').map(s => s.trim()).filter(Boolean),
        experience_required: expRequired ? parseFloat(expRequired) : null,
        match_threshold: threshold,
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail?.message || err.response?.data?.detail || 'Matching failed.');
    } finally {
      setLoading(false);
    }
  };

  const cand = result?.candidate;
  const rec = cand ? REC_LABELS[cand.recommendation] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <Target className="w-5 h-5 text-white" />
          </div>
          Smart Matching & Gap Analysis
        </h1>
        <p className="text-slate-500 text-sm mt-1">Semantic skill-to-job matching with upskilling recommendations</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Form */}
        <div className="xl:col-span-2">
          <form onSubmit={handleMatch} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
            <h2 className="font-semibold text-slate-800 text-base">Configure Match</h2>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div className="relative">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Candidate</label>
              <div 
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white flex items-center justify-between cursor-pointer"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <div className="flex-1 truncate">
                  {candidateId 
                    ? (() => {
                        const c = candidates.find(x => x.id === candidateId);
                        return c ? (
                          <span className="font-semibold text-indigo-700">
                            {c.full_name} <span className="text-slate-400 font-normal text-xs ml-1">(#{c.id.split('-')[0]})</span>
                          </span>
                        ) : 'Select candidate…';
                      })()
                    : <span className="text-slate-400">Search by Name or Unique ID...</span>}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </div>
              
              {showDropdown && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                  <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input 
                      autoFocus
                      placeholder="Type name or ID to filter..." 
                      className="w-full text-sm outline-none bg-transparent"
                      value={candQuery}
                      onChange={e => setCandQuery(e.target.value)}
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto p-1">
                    {candidates
                      .filter(c => (c.full_name || '').toLowerCase().includes(candQuery.toLowerCase()) || c.id.toLowerCase().includes(candQuery.toLowerCase()))
                      .map(c => (
                      <div 
                        key={c.id} 
                        onClick={() => { setCandidateId(c.id); setShowDropdown(false); setCandQuery(''); }}
                        className="px-3 py-2 hover:bg-indigo-50 rounded-lg cursor-pointer flex flex-col"
                      >
                        <span className="font-semibold text-slate-800 text-sm">{c.full_name}</span>
                        <span className="text-xs text-slate-500 font-mono">ID: {c.id}</span>
                      </div>
                    ))}
                    {candidates.filter(c => (c.full_name || '').toLowerCase().includes(candQuery.toLowerCase()) || c.id.toLowerCase().includes(candQuery.toLowerCase())).length === 0 && (
                      <div className="px-3 py-4 text-center text-sm text-slate-500">No candidates match your search.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Job Title *</label>
              <input
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Python Developer"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Job Description *</label>
              <textarea
                value={jobDesc}
                onChange={e => setJobDesc(e.target.value)}
                rows={4}
                placeholder="Paste job description here…"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Required Skills</label>
              <input
                value={requiredSkills}
                onChange={e => setRequiredSkills(e.target.value)}
                placeholder="Python, FastAPI, PostgreSQL"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <p className="text-xs text-slate-400 mt-1">Comma-separated</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Nice-to-Have Skills</label>
              <input
                value={niceSkills}
                onChange={e => setNiceSkills(e.target.value)}
                placeholder="Docker, Kubernetes"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Exp. Required (yrs)</label>
                <input
                  type="number" min="0" step="0.5"
                  value={expRequired}
                  onChange={e => setExpRequired(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Threshold: {threshold}
                </label>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={threshold}
                  onChange={e => setThreshold(parseFloat(e.target.value))}
                  className="w-full mt-2.5"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              style={{ background: loading ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #3b82f6)', boxShadow: loading ? 'none' : '0 4px 15px rgba(99,102,241,0.3)' }}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Matching…</> : <><Target className="w-4 h-4" /> Run Match</>}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="xl:col-span-3 space-y-4">
          {!result && !loading && (
            <div className="flex flex-col items-center justify-center h-64 bg-white border border-slate-200 rounded-2xl border-dashed">
              <Target className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">Configure match parameters</p>
              <p className="text-slate-400 text-sm">Results with gap analysis will appear here</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center h-64 bg-white border border-slate-200 rounded-2xl">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
              <p className="text-slate-600 font-medium">Running semantic match…</p>
              <p className="text-slate-400 text-xs mt-1">Analyzing skills, experience & semantics</p>
            </div>
          )}

          {result && cand && (
            <>
              {/* Overall score card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{cand.candidate_name}</h2>
                    <p className="text-slate-500 text-sm">vs. {result.job_title}</p>
                  </div>
                  {rec && (
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold border ${rec.color}`}>
                      <rec.icon className="w-4 h-4" />
                      {rec.label}
                    </span>
                  )}
                </div>

                {/* Big score */}
                <div className="flex items-center justify-center py-4">
                  <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                      <circle
                        cx="50" cy="50" r="42" fill="none"
                        stroke="url(#scoreGrad)" strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${cand.overall_score * 263.8} 263.8`}
                        className="transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-slate-900">{(cand.overall_score * 100).toFixed(0)}%</span>
                      <span className="text-xs text-slate-400">match</span>
                    </div>
                  </div>
                </div>

                {/* Score breakdown */}
                <div className="space-y-3 mt-2">
                  <ScoreBar label="Semantic Similarity" value={cand.breakdown?.semantic_similarity || 0} />
                  <ScoreBar label="Skill Match" value={cand.breakdown?.skill_match || 0} />
                  <ScoreBar label="Experience Match" value={cand.breakdown?.experience_match || 0} />
                  <ScoreBar label="Title Relevance" value={cand.breakdown?.title_relevance || 0} />
                </div>
              </div>

              {/* Matched Skills */}
              {cand.matched_skills?.length > 0 && (
                <div className="bg-white border border-emerald-200 rounded-2xl p-5">
                  <h3 className="font-semibold text-emerald-800 text-sm flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4" />
                    Matched Skills ({cand.matched_skills.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {cand.matched_skills.map(s => (
                      <span key={s} className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold">
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Gap Analysis */}
              {cand.gap_analysis?.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    Gap Analysis & Upskilling Path ({cand.gap_analysis.length} gaps)
                  </h3>
                  <div className="space-y-2">
                    {cand.gap_analysis.map((gap, i) => <GapCard key={i} gap={gap} />)}
                  </div>
                </div>
              )}

              {/* No gaps */}
              {cand.gap_analysis?.length === 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <div>
                    <p className="font-semibold text-emerald-800">No Skill Gaps!</p>
                    <p className="text-sm text-emerald-600">This candidate meets all skill requirements.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}