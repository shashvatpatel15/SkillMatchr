import React, { useState, useEffect, useRef } from 'react';
import {
  Users, Search as SearchIcon, MapPin, Briefcase,
  ChevronLeft, ChevronRight, Trash2, Download,
  Mail, X, Clock, CheckCircle2, AlertCircle,
  TrendingUp, UserCheck, Layers, SlidersHorizontal, XCircle,
  LayoutGrid, LayoutList, GraduationCap, FileText,
  Bookmark, BookmarkPlus, Eye, Sparkles, Zap,
  RefreshCw, Copy, ExternalLink, Activity, Target, Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import useWebSocket from '../hooks/useWebSocket';

/* ─── Helpers ──────────────────────────────────── */
const initials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

const PALETTES = [
  'from-violet-500 to-indigo-600',
  'from-blue-500 to-cyan-600',
  'from-teal-500 to-emerald-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-500',
  'from-fuchsia-500 to-purple-600',
];
const avatarGradient = (name = '') => PALETTES[name.charCodeAt(0) % PALETTES.length] || PALETTES[0];

const STATUS_CFG = {
  completed:    { label: 'Completed',    icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending:      { label: 'Processing',   icon: Clock,        cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  failed:       { label: 'Failed',       icon: XCircle,      cls: 'bg-red-50 text-red-700 border-red-200' },
  needs_review: { label: 'Review Needed',icon: AlertCircle,  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || { label: status || 'Unknown', icon: Activity, cls: 'bg-slate-50 text-slate-600 border-slate-200' };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-bold border ${cfg.cls}`}>
      <Icon className="w-3.5 h-3.5" /> {cfg.label}
    </span>
  );
};

const ScoreRing = ({ score, size = 48 }) => {
  if (score == null) return <span className="text-slate-300 text-xs">—</span>;
  const pct = Math.min(Math.round(score * 100), 100);
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const col = pct >= 75 ? '#10b981' : pct >= 50 ? '#6366f1' : '#f59e0b';
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="4" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <span className="absolute text-xs font-black text-slate-700">{pct}</span>
    </div>
  );
};

const ScoreBar = ({ score }) => {
  if (score == null) return <span className="text-slate-300 text-xs font-medium">—</span>;
  const pct = Math.min(Math.round(score * 100), 100);
  const colorClass = pct >= 75 ? 'from-emerald-400 to-teal-500' : pct >= 50 ? 'from-indigo-400 to-violet-500' : 'from-amber-400 to-orange-500';
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${colorClass} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-600 w-6">{pct}%</span>
    </div>
  );
};

/* ─── Skeletons ─────────────────────────────────── */
const SkeletonRow = () => (
  <tr className="border-b border-slate-50 last:border-0">
    {[40, 250, 80, 100, 120, 100, 60].map((w, i) => (
      <td key={i} className="px-5 py-4"><div className="skeleton h-3 rounded-full" style={{ width: w }} /></td>
    ))}
  </tr>
);

const SkeletonCard = () => (
  <div className="glass-card p-5 space-y-4 border border-slate-100">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl skeleton" />
      <div className="space-y-2 flex-1">
        <div className="skeleton h-3.5 rounded-full w-2/3" />
        <div className="skeleton h-2.5 rounded-full w-1/3" />
      </div>
    </div>
    <div className="skeleton h-2 rounded-full w-full mt-4" />
    <div className="flex gap-2">
      <div className="skeleton h-6 rounded-lg w-16" />
      <div className="skeleton h-6 rounded-lg w-16" />
    </div>
  </div>
);

/* ─── Components ───────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="glass-card p-5 flex items-center gap-5 group hover:border-indigo-100 transition-colors border border-slate-200/60 shadow-sm hover:shadow-md">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${color} shadow-lg shadow-current/20 group-hover:scale-110 transition-transform`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <p className="text-3xl font-black text-slate-900 tracking-tight leading-none">{value ?? '—'}</p>
      <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">{label}</p>
    </div>
  </div>
);

const TABS = [
  { id: 'overview', label: 'Overview', icon: Eye },
  { id: 'skills',   label: 'AI Analysis', icon: Sparkles },
  { id: 'timeline', label: 'Experience', icon: Briefcase },
];


/* ══════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════ */
export default function CandidatesPage() {
  const [candidates, setCandidates] = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(0);
  const [limit, setLimit]           = useState(25);

  const [searchQuery, setSearchQuery]       = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter]     = useState('');
  const [minExp, setMinExp]                 = useState('');

  const [loading, setLoading]                     = useState(true);
  const [error, setError]                         = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateAnalysis, setCandidateAnalysis] = useState(null);
  const [detailLoading, setDetailLoading]         = useState(false);
  const [selectedIds, setSelectedIds]             = useState(new Set());
  const [viewMode, setViewMode]                   = useState('table');
  const [activeTab, setActiveTab]                 = useState('overview');
  const [similarCandidates, setSimilarCandidates] = useState([]);
  const [shortlists, setShortlists]               = useState([]);
  const [toast, setToast]                         = useState(null);

  const { lastMessage } = useWebSocket();

  // Watch for real-time ingestion events
  useEffect(() => {
    if (lastMessage?.type === 'INGESTION_COMPLETE' || lastMessage?.type === 'DEDUP_UPDATE') {
      fetchCandidates();
      if (lastMessage.type === 'INGESTION_COMPLETE') showToast(`Candidate ${lastMessage.candidate_name || 'uploaded'} ready!`);
    }
  }, [lastMessage]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* debounce search */
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQuery(searchQuery); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => { fetchCandidates(); }, [page, debouncedQuery, statusFilter, minExp, limit]);
  useEffect(() => { fetchShortlists(); }, []);
  
  /* Escape to close panel */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') closePanel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const fetchShortlists = async () => {
    try {
      const res = await api.get('/api/shortlists');
      setShortlists(res.data || []);
    } catch { /* silent */ }
  };

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      let url = `/api/candidates?skip=${page * limit}&limit=${limit}`;
      if (debouncedQuery) url += `&q=${encodeURIComponent(debouncedQuery)}`;
      if (statusFilter)   url += `&status=${statusFilter}`;
      if (minExp)         url += `&min_exp=${minExp}`;
      const res = await api.get(url);
      setCandidates(res.data.results || []);
      setTotal(res.data.total || 0);
      setError(null);
    } catch (err) {
      console.error('Failed to load candidates:', err);
      setError('Failed to load candidates. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const viewCandidate = async (id) => {
    setDetailLoading(true);
    setSelectedCandidate(null);
    setCandidateAnalysis(null);
    setSimilarCandidates([]);
    setActiveTab('overview');
    try {
      // Load candidate data to open slide-over immediately
      const candidateRes = await api.get(`/api/candidates/${id}`);
      setSelectedCandidate(candidateRes.data);
      setDetailLoading(false);

      // Lazy-load heavier data
      api.get(`/api/candidates/${id}/analysis`).then(r => setCandidateAnalysis(r.data)).catch(() => {});
      api.get(`/api/candidates/${id}/similar?limit=3`).then(r => setSimilarCandidates(r.data?.results || [])).catch(() => {});
    } catch {
      setError('Failed to load candidate details.');
      setDetailLoading(false);
    }
  };

  const closePanel = () => { setSelectedCandidate(null); setTimeout(() => { setCandidateAnalysis(null); setSimilarCandidates([]); }, 300); };

  const [reparsing, setReparsing] = useState(false);
  const reparseCandidate = async (id) => {
    setReparsing(true);
    try {
      const res = await api.post(`/api/candidates/${id}/reparse`);
      setSelectedCandidate(res.data);
      showToast('Re-parsed successfully!');
      fetchCandidates();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Re-parse failed.', 'error');
    } finally {
      setReparsing(false);
    }
  };

  const deleteCandidate = async (id) => {
    if (!confirm('Permanently delete this candidate?')) return;
    try {
      await api.delete(`/api/candidates/${id}`);
      fetchCandidates();
      if (selectedCandidate?.id === id) closePanel();
      setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      showToast('Candidate deleted');
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  const deleteSelected = async () => {
    if (!confirm(`Permanently delete ${selectedIds.size} candidates?`)) return;
    try {
      await Promise.allSettled(Array.from(selectedIds).map(id => api.delete(`/api/candidates/${id}`)));
      setSelectedIds(new Set());
      fetchCandidates();
      showToast(`${selectedIds.size} candidates deleted`);
    } catch {
      showToast('Failed to delete some items', 'error');
    }
  };

  const addToShortlist = async (shortlistId, candidateId) => {
    try {
      await api.post(`/api/shortlists/${shortlistId}/candidates`, { candidate_id: candidateId });
      showToast('Added to shortlist');
    } catch (err) {
      showToast(err.response?.status === 409 ? 'Already in shortlist' : 'Failed to add', 'error');
    }
  };

  const toggleSelection = (id) => setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const handleSelectAll = (e) => setSelectedIds(e.target.checked ? new Set(candidates.map(c => c.id)) : new Set());

  const exportCSV = () => {
    const rows = [
      ['Name', 'Email', 'Title', 'Location', 'Experience', 'Status'],
      ...candidates.map(c => [c.full_name, c.email, c.current_title, c.location, c.years_experience, c.ingestion_status].map(v => `"${v ?? ''}"`)),
    ];
    const a = Object.assign(document.createElement('a'), { href: 'data:text/csv;charset=utf-8,' + encodeURI(rows.map(r => r.join(',')).join('\n')), download: 'talents_export.csv' });
    document.body.appendChild(a); a.click(); a.remove();
  };

  const totalPages  = Math.ceil(total / limit);
  const completed   = candidates.filter(c => c.ingestion_status === 'completed').length;
  const withScore   = candidates.filter(c => c.confidence_score != null).length;
  const avgScore    = withScore ? Math.round(candidates.reduce((s, c) => s + (c.confidence_score ?? 0), 0) / withScore * 100) : null;
  const activeFilters = [searchQuery, statusFilter, minExp].filter(Boolean).length;

  /* ─── RENDER ───────────────────────────────────── */
  return (
    <div className="space-y-6 pb-10">
      <AnimatePresence>
        {toast && (
          <motion.div key="toast" initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-2xl shadow-xl border text-sm font-bold flex items-center gap-3 ${toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-900 text-white border-slate-700'}`}>
            {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
              <Users className="w-6 h-6 text-white" />
            </span>
            Talent Pool
          </h2>
          <p className="text-slate-500 text-sm mt-1.5 ml-1 font-medium">{total.toLocaleString()} extraordinary profiles indexed and ready for AI matching.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex bg-slate-200/50 rounded-xl p-1 border border-slate-200/60 shadow-inner">
            <button onClick={() => setViewMode('table')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow border border-slate-200 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
              <LayoutList className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow border border-slate-200 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button onClick={fetchCandidates} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition-all shadow-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all text-sm font-bold shadow-md">
            <Download className="w-4 h-4 text-slate-300" /> Export CSV
          </button>
        </div>
      </div>

      {/* Stat Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Resumes" value={total.toLocaleString()} color="from-indigo-500 to-violet-600" />
        <StatCard icon={Zap} label="Parsed & Ready" value={completed} color="from-emerald-500 to-teal-500" />
        <StatCard icon={Target} label="Avg Parsing Score" value={avgScore != null ? `${avgScore}%` : '—'} color="from-amber-500 to-orange-500" />
        <StatCard icon={Layers} label="Pages Rendered" value={`${page + 1} / ${totalPages || 1}`} color="from-sky-500 to-blue-600" />
      </div>

      {/* Filters Strip */}
      <div className="glass-card p-3 flex flex-wrap items-center gap-3 border border-slate-200 shadow-sm sticky top-[72px] z-20 backdrop-blur-xl bg-white/80">
        <div className="flex-1 min-w-[250px] relative group">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input type="text" placeholder="Search across everything: full name, job title, company, skills..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all placeholder:text-slate-400" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-200 hover:bg-slate-300 p-1 rounded-full text-slate-500 transition-colors">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 relative">
          <SlidersHorizontal className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
            className="py-3 pl-10 pr-10 bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 cursor-pointer text-slate-700 font-bold transition-all appearance-none min-w-[150px]">
            <option value="">Status: All</option>
            <option value="completed">Status: Completed</option>
            <option value="pending">Status: Processing</option>
            <option value="needs_review">Status: Needs Review</option>
            <option value="failed">Status: Failed</option>
          </select>
        </div>

        <div className="flex items-center gap-2 relative">
          <Briefcase className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
          <select value={minExp} onChange={e => { setMinExp(e.target.value); setPage(0); }}
            className="py-3 pl-10 pr-10 bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 cursor-pointer text-slate-700 font-bold transition-all appearance-none min-w-[140px]">
            <option value="">Exp: Any</option>
            <option value="1">1+ Years</option>
            <option value="3">3+ Years</option>
            <option value="5">5+ Years</option>
            <option value="8">8+ Years</option>
          </select>
        </div>

        <div className="flex items-center gap-2 relative">
          <Layers className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
          <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(0); }}
            className="py-3 pl-10 pr-10 bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 cursor-pointer text-slate-700 font-bold transition-all appearance-none">
            <option value={25}>View 25</option>
            <option value={50}>View 50</option>
            <option value={100}>View 100</option>
          </select>
        </div>

        {activeFilters > 0 && (
          <button onClick={() => { setSearchQuery(''); setStatusFilter(''); setMinExp(''); setPage(0); }}
            className="flex items-center justify-center bg-slate-900 text-white w-12 h-12 rounded-xl hover:bg-slate-800 transition-colors shrink-0 shadow-sm" title="Clear Filters">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Selected Action Strip */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div initial={{ opacity: 0, height: 0, mb: 0 }} animate={{ opacity: 1, height: 'auto', mb: 16 }} exit={{ opacity: 0, height: 0, mb: 0 }} className="overflow-hidden">
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3 pl-2">
                <span className="flex items-center justify-center w-6 h-6 bg-indigo-600 text-white text-xs font-black rounded-md">{selectedIds.size}</span>
                <span className="text-sm font-bold text-indigo-800">Profiles Selected</span>
              </div>
              <div className="flex items-center gap-2">
                {shortlists.length > 0 && (
                  <select onChange={(e) => { if (e.target.value) selectedIds.forEach(id => addToShortlist(e.target.value, id)); e.target.value = ''; }}
                    className="text-xs bg-white text-indigo-700 border border-indigo-200 focus:outline-none px-3 py-2 rounded-lg font-bold cursor-pointer hover:bg-indigo-50" defaultValue="">
                    <option value="" disabled>Add to Shortlist...</option>
                    {shortlists.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
                <button onClick={deleteSelected} className="flex items-center gap-1.5 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" /> Delete Selected
                </button>
                <button onClick={() => setSelectedIds(new Set())} className="text-indigo-400 hover:text-indigo-700 p-2">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-semibold flex items-center gap-2"><AlertCircle className="w-5 h-5" /> {error}</div>}

      {/* ═══ TABLE VIEW ═══ */}
      {viewMode === 'table' && (
        <div className="glass-card shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 w-12 py-4">
                    <input type="checkbox" checked={candidates.length > 0 && selectedIds.size === candidates.length} onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                  </th>
                  <th className="text-left font-black text-xs text-slate-500 uppercase tracking-widest py-4">Talent Profile</th>
                  <th className="text-left font-black text-xs text-slate-500 uppercase tracking-widest px-5 py-4">Experience</th>
                  <th className="text-left font-black text-xs text-slate-500 uppercase tracking-widest px-5 py-4">Ingestion AI Status</th>
                  <th className="text-left font-black text-xs text-slate-500 uppercase tracking-widest px-5 py-4">Parsing Quality</th>
                  <th className="px-5 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60 bg-white">
                {loading ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
                : candidates.length === 0 ? (
                  <tr><td colSpan={6} className="py-24 text-center">
                    <UserCheck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-600 font-bold text-lg">No extraordinary talent found</p>
                    <p className="text-slate-400 text-sm font-medium mt-1">Adjust your filters to see more profiles.</p>
                  </td></tr>
                ) : candidates.map((c, i) => {
                  const isSelected = selectedIds.has(c.id);
                  const isActive = selectedCandidate?.id === c.id;
                  return (
                    <motion.tr key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}
                      onClick={() => viewCandidate(c.id)}
                      className={`cursor-pointer transition-colors group ${isActive ? 'bg-indigo-50/80' : isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50'}`}>
                      <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(c.id)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                      </td>
                      <td className="py-4 pr-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarGradient(c.full_name)} flex items-center justify-center text-white text-sm font-black shadow-md border-2 border-white/20 shrink-0`}>
                            {initials(c.full_name)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-[15px]">{c.full_name === 'Unknown' ? 'Candidate Missing Name' : c.full_name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5" onClick={e => e.stopPropagation()}>
                              <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">ID: {String(c.id).split('-')[0]}</span>
                              <button onClick={() => { navigator.clipboard.writeText(c.id); }} className="text-slate-300 hover:text-indigo-500 transition-colors" title="Copy full ID"><Copy className="w-3 h-3" /></button>
                            </div>
                            <p className="text-[13px] text-slate-500 font-medium truncate max-w-sm mt-0.5">{c.current_title || 'Title not extracted'}</p>
                            {c.location && <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold mt-1"><MapPin className="w-3 h-3" /> {c.location}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center justify-center min-w-[3rem] px-3 py-1.5 rounded-lg font-black text-sm bg-slate-50 border border-slate-200 text-slate-700">
                          {c.years_experience != null ? `${c.years_experience}Y` : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4"><StatusBadge status={c.ingestion_status} /></td>
                      <td className="px-5 py-4"><ScoreBar score={c.confidence_score} /></td>
                      <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                        <button onClick={() => deleteCandidate(c.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer */}
          {!loading && candidates.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
              <span className="text-sm text-slate-500 font-medium">Showing <b className="text-slate-800">{page * limit + 1}-{Math.min((page + 1) * limit, total)}</b> of <b className="text-slate-800">{total.toLocaleString()}</b></span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-sm"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
                <div className="px-4 text-sm font-bold text-slate-700">Page {page + 1}</div>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-sm"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ GRID VIEW ═══ */}
      {viewMode === 'grid' && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : candidates.length === 0 ? (
             <div className="glass-card py-32 text-center">
                <UserCheck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-600 font-bold text-lg">No extraordinary talent found</p>
                <p className="text-slate-400 text-sm font-medium mt-1">Adjust your filters to see more profiles.</p>
              </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {candidates.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }}
                  onClick={() => viewCandidate(c.id)}
                  className={`glass-card p-0 overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 border ${selectedIds.has(c.id) ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-indigo-300'}`}>
                  
                  {/* Card Header Top Strip */}
                  <div className="h-14 w-full bg-slate-50 border-b border-slate-100 flex items-center justify-between px-4 relative">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <div onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelection(c.id)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                    </div>
                    <ScoreRing score={c.confidence_score} size={36} />
                  </div>

                  {/* Body */}
                  <div className="p-5 relative -mt-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGradient(c.full_name)} flex items-center justify-center text-white text-lg font-black shadow-lg border-4 border-white mx-auto mb-3`}>
                      {initials(c.full_name)}
                    </div>
                    <div className="text-center mb-4">
                      <p className="font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors text-[15px] truncate">{c.full_name === 'Unknown' ? 'Unknown' : c.full_name}</p>
                      <div className="flex items-center justify-center gap-1.5 mt-1" onClick={e => e.stopPropagation()}>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">#{String(c.id).split('-')[0]}</span>
                        <button onClick={() => navigator.clipboard.writeText(c.id)} className="text-slate-300 hover:text-indigo-500 transition-colors" title="Copy full ID"><Copy className="w-3 h-3" /></button>
                      </div>
                      <p className="text-[13px] text-slate-500 font-medium truncate mt-0.5">{c.current_title || 'No Title'}</p>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-xs font-semibold px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-500">Exp. Years</span>
                        <span className="text-slate-800 font-bold">{c.years_experience != null ? `${c.years_experience}Y` : '—'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-500">Location</span>
                        <span className="text-slate-800 font-bold truncate max-w-[120px]">{c.location || '—'}</span>
                      </div>
                      <div className="flex justify-center mt-2">
                        <StatusBadge status={c.ingestion_status} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          {/* Grid pagination */}
          {!loading && candidates.length > 0 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-sm"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
              <span className="text-sm font-bold text-slate-700 bg-white px-4 py-2 border border-slate-200 rounded-xl shadow-sm">Page {page + 1} of {totalPages || 1}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-sm"><ChevronRight className="w-5 h-5 text-slate-600" /></button>
            </div>
          )}
        </>
      )}

      {/* ═══ SLIDE-OVER DETAIL PANEL ═══ */}
      <AnimatePresence>
        {(selectedCandidate || detailLoading) && (
          <React.Fragment key="panel">
            {/* Backdrop */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closePanel} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />
            
            {/* Slide-over */}
            <motion.div
              initial={{ x: '100%', boxShadow: '-10px 0 30px rgba(0,0,0,0)' }}
              animate={{ x: 0, boxShadow: '-10px 0 30px rgba(0,0,0,0.1)' }}
              exit={{ x: '100%', boxShadow: '-10px 0 30px rgba(0,0,0,0)' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl lg:max-w-4xl bg-white border-l border-slate-200 flex flex-col shadow-2xl"
            >
              {detailLoading ? (
                 <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-t-indigo-600 border-indigo-100 rounded-full animate-spin" />
                      <p className="text-sm font-bold tracking-widest text-slate-400 uppercase">Loading Profile Ecosystem</p>
                    </div>
                 </div>
              ) : selectedCandidate ? (
                <>
                  {/* Panel Header */}
                  <div className="px-8 py-6 border-b border-slate-200 bg-white shrink-0 relative overflow-hidden">
                    {/* Header Background Pattern */}
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none transform translate-x-1/3 -translate-y-1/3 blur-sm">
                       <Users className="w-64 h-64" />
                    </div>
                    
                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex items-center gap-5">
                        <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${avatarGradient(selectedCandidate.full_name)} flex items-center justify-center text-white text-3xl font-black shadow-xl border border-white/20`}>
                          {initials(selectedCandidate.full_name)}
                        </div>
                        <div>
                          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
                            {selectedCandidate.full_name === 'Unknown' ? 'Unidentified Profile' : selectedCandidate.full_name}
                          </h2>
                          <p className="text-indigo-600 font-bold text-base mt-0.5">{selectedCandidate.current_title || 'No Extractable Title'}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">ID: {selectedCandidate.id}</span>
                            <button onClick={() => { navigator.clipboard.writeText(selectedCandidate.id); }} className="text-slate-400 hover:text-indigo-600 transition-colors p-1 hover:bg-indigo-50 rounded-lg" title="Copy Unique ID"><Copy className="w-4 h-4" /></button>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-3">
                            <StatusBadge status={selectedCandidate.ingestion_status} />
                            {selectedCandidate.location && <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full"><MapPin className="w-3.5 h-3.5" /> {selectedCandidate.location}</span>}
                            {selectedCandidate.years_experience != null && <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full"><Briefcase className="w-3.5 h-3.5" /> {selectedCandidate.years_experience}Y Experience</span>}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-4 h-full pt-1">
                        <button onClick={closePanel} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-3 mt-auto mb-1">
                          {selectedCandidate.confidence_score != null && (
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 items-center flex gap-1"><Sparkles className="w-3 h-3 text-amber-500"/> AI Confidence</span>
                              <ScoreBar score={selectedCandidate.confidence_score} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Panel Actions Ribbon */}
                  <div className="px-8 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                     <div className="flex gap-2">
                      {TABS.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                            activeTab === t.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                          }`}>
                          <t.icon className="w-4 h-4" /> {t.label}
                        </button>
                      ))}
                     </div>
                     <div className="flex items-center gap-2">
                        {shortlists.length > 0 && (
                          <select onChange={(e) => { if (e.target.value) { addToShortlist(e.target.value, selectedCandidate.id); e.target.value = ''; } }}
                            className="text-xs bg-white text-indigo-700 border border-indigo-200 px-3 py-2.5 rounded-xl font-bold cursor-pointer outline-none hover:bg-indigo-50 transition-colors shadow-sm" defaultValue="">
                            <option value="" disabled>+ Add to Shortlist</option>
                            {shortlists.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        )}
                        <a href={`mailto:${selectedCandidate.email}`} className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 shadow-sm transition-colors" title="Email Candidate">
                          <Mail className="w-4 h-4" />
                        </a>
                        {selectedCandidate.linkedin_url && (
                          <a href={selectedCandidate.linkedin_url.startsWith('http') ? selectedCandidate.linkedin_url : `https://${selectedCandidate.linkedin_url}`} target="_blank" rel="noreferrer" className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 shadow-sm transition-colors" title="LinkedIn Profile">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button onClick={() => deleteCandidate(selectedCandidate.id)} className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-red-200 text-red-500 hover:bg-red-50 shadow-sm transition-colors ml-2" title="Delete Pipeline Profile">
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                  </div>

                  {/* Panel Content Area */}
                  <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8 scroll-smooth">
                    
                    {/* OVERVIEW CONTENT */}
                    {activeTab === 'overview' && (
                      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Empty state handler */}
                        {!selectedCandidate.summary && !selectedCandidate.education?.length && !selectedCandidate.skills?.length && (
                          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200 border-dashed text-center">
                            <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
                            <h3 className="text-xl font-black text-slate-800 mb-2">Extraction Incomplete</h3>
                            <p className="text-slate-500 font-medium text-sm max-w-md">The parsing graph couldn't establish a complete taxonomy model for this resume text.</p>
                            <button onClick={() => reparseCandidate(selectedCandidate.id)} disabled={reparsing} className="mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md disabled:opacity-60 transition-all">
                              {reparsing ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                              Force Reparse Document
                            </button>
                          </div>
                        )}

                        {selectedCandidate.summary && (
                          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-colors">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-purple-500 rounded-l-3xl" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2"><FileText className="w-4 h-4" /> AI Executive Summary</h4>
                            <p className="text-slate-700 text-base leading-loose font-medium">{selectedCandidate.summary}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {selectedCandidate.education?.length > 0 && (
                            <div className="space-y-4">
                              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Education Vector</h4>
                              <div className="space-y-3">
                                {Array.isArray(selectedCandidate.education) ? selectedCandidate.education.map((edu, i) => (
                                  <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                    <p className="font-bold text-slate-900 leading-snug">{typeof edu === 'object' ? edu.degree || edu.institution || JSON.stringify(edu) : String(edu)}</p>
                                    {typeof edu === 'object' && edu.institution && <p className="text-sm font-semibold text-indigo-600 mt-1">{edu.institution}</p>}
                                    {typeof edu === 'object' && edu.year && <p className="text-xs font-bold text-slate-400 mt-2">{edu.year}</p>}
                                  </div>
                                )) : null}
                              </div>
                            </div>
                          )}

                          {selectedCandidate.skills?.length > 0 && (
                            <div className="space-y-4">
                              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Extracted Skillset</h4>
                              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-2.5">
                                {selectedCandidate.skills.map((s, i) => (
                                  <span key={i} className="px-3.5 py-1.5 bg-indigo-50/70 border border-indigo-100 text-indigo-800 text-xs font-extrabold rounded-lg hover:bg-indigo-100 transition-colors cursor-default">{s}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* AI ANALYSIS CONTENT */}
                    {activeTab === 'skills' && (
                      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {candidateAnalysis ? (
                          <>
                            <div className="grid grid-cols-3 gap-6 mb-8">
                              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center group hover:border-emerald-200 transition-colors relative overflow-hidden">
                                <div className="absolute top-0 inset-x-0 h-1 bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="w-12 h-12 mx-auto bg-emerald-50 text-emerald-600 flex items-center justify-center rounded-2xl mb-3"><CheckCircle2 className="w-6 h-6" /></div>
                                <p className="text-4xl font-black text-slate-900 tracking-tighter">{candidateAnalysis.skill_profile?.total_canonical || 0}</p>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Explicit</p>
                              </div>
                              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center group hover:border-indigo-200 transition-colors relative overflow-hidden">
                                <div className="absolute top-0 inset-x-0 h-1 bg-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.8)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="w-12 h-12 mx-auto bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-2xl mb-3"><Brain className="w-6 h-6" /></div>
                                <p className="text-4xl font-black text-slate-900 tracking-tighter">{candidateAnalysis.skill_profile?.total_inferred || 0}</p>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Inferred (AI)</p>
                              </div>
                              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center group hover:border-amber-200 transition-colors relative overflow-hidden">
                                <div className="absolute top-0 inset-x-0 h-1 bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.8)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="w-12 h-12 mx-auto bg-amber-50 text-amber-600 flex items-center justify-center rounded-2xl mb-3"><Sparkles className="w-6 h-6" /></div>
                                <p className="text-4xl font-black text-slate-900 tracking-tighter">{candidateAnalysis.skill_profile?.total_emerging || 0}</p>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Emerging</p>
                              </div>
                            </div>

                            <div className="space-y-6">
                              {candidateAnalysis.normalized_skills?.length > 0 && (
                                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-6 flex items-center gap-2"><Layers className="w-4 h-4 text-emerald-500" /> Ground Truth Capabilities</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {candidateAnalysis.normalized_skills.map((s, i) => (
                                      <div key={i} className="flex flex-col bg-slate-50 border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                                        <div className="px-4 py-3 bg-white flex items-center justify-between border-b border-slate-100">
                                          <span className="text-sm font-extrabold text-slate-900">{s.canonical_name}</span>
                                          {s.proficiency && (
                                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${
                                              s.proficiency === 'expert' ? 'bg-indigo-600 text-white' :
                                              s.proficiency === 'advanced' ? 'bg-indigo-100 text-indigo-700' :
                                              s.proficiency === 'intermediate' ? 'bg-sky-100 text-sky-700' :
                                              'bg-slate-100 text-slate-600'
                                            }`}>{s.proficiency}</span>
                                          )}
                                        </div>
                                        <div className="px-4 py-2.5 bg-slate-50 text-xs font-semibold text-slate-500 flex justify-between items-center">
                                          <span>Extracted from: "{s.original_name}"</span>
                                          {s.estimated_years && <span className="text-slate-800 bg-white px-2 py-0.5 rounded shadow-sm border border-slate-200">{s.estimated_years} Yos</span>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {candidateAnalysis.inferred_skills?.length > 0 && (
                                <div className="bg-indigo-50/50 rounded-3xl p-8 border border-indigo-100 shadow-sm relative overflow-hidden">
                                  <div className="absolute -right-10 -top-10 text-indigo-100 pointer-events-none"><Brain className="w-48 h-48" /></div>
                                  <h4 className="text-sm font-black uppercase tracking-widest text-indigo-900 mb-6 flex items-center gap-2 relative z-10"><Brain className="w-4 h-4 text-indigo-500" /> AI Synthesized Knowledge</h4>
                                  <div className="flex flex-wrap gap-3 relative z-10">
                                    {candidateAnalysis.inferred_skills.map((s, i) => (
                                      <div key={i} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-indigo-200 shadow-sm rounded-xl text-sm transition-all hover:bg-indigo-50 cursor-pointer group">
                                        <span className="font-extrabold text-indigo-900 tracking-tight">{s.canonical_name}</span>
                                        <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 group-hover:text-indigo-600 transition-colors">via {s.inferred_from}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-12 text-center">
                            <Activity className="w-10 h-10 text-slate-300 mb-4 animate-pulse" />
                            <p className="text-slate-500 font-semibold text-sm">Evaluating agent tracing data...</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* EXPERIENCE CONTENT */}
                    {activeTab === 'timeline' && (
                      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {selectedCandidate.experience?.length > 0 ? (
                          <div className="bg-white rounded-3xl p-8 md:p-10 border border-slate-200 shadow-sm">
                            <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-8"><span className="text-indigo-500 mr-2">/</span> Career Trajectory</h4>
                            <div className="relative space-y-2 before:absolute before:left-[11px] before:top-4 before:bottom-4 before:w-1 before:bg-gradient-to-b before:from-indigo-400 before:via-violet-200 before:to-transparent rounded-l-full">
                              {selectedCandidate.experience.map((e, i) => (
                                <div key={i} className="relative pl-12 py-4 group">
                                  {/* Timeline node */}
                                  <span className="absolute left-[7px] top-6 w-3 h-3 rounded-full bg-white border-2 border-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.1)] group-hover:shadow-[0_0_0_6px_rgba(99,102,241,0.2)] group-hover:bg-indigo-500 transition-all z-10" />
                                  
                                  {typeof e === 'object' && e !== null ? (
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group-hover:border-indigo-200">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                        <h3 className="text-lg font-black text-slate-900 leading-none">{e.title || 'Role Undefined'}</h3>
                                        {e.duration && <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider rounded-lg shrink-0 border border-slate-200">{e.duration}</span>}
                                      </div>
                                      <p className="text-indigo-600 font-bold text-sm mb-4">{e.company}</p>
                                      {e.description && <p className="text-sm text-slate-600 leading-relaxed font-medium">{e.description}</p>}
                                    </div>
                                  ) : (
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                      <p className="font-medium text-slate-800">{String(e)}</p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white p-12 rounded-3xl border border-slate-200 border-dashed text-center">
                            <Briefcase className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="font-bold text-slate-600">No trajectory timeline generated.</p>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </>
              ) : null}
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>
    </div>
  );
}