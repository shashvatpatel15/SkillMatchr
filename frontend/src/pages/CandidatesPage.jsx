import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Search as SearchIcon, MapPin, Briefcase,
  ChevronLeft, ChevronRight, Trash2, Download, Filter,
  Mail, X, Star, Clock, CheckCircle2, AlertCircle,
  TrendingUp, UserCheck, Layers, SlidersHorizontal, XCircle,
  LayoutGrid, LayoutList, Phone, GraduationCap, FileText,
  Bookmark, BookmarkPlus, Eye, Sparkles, ArrowUpRight, Hash,
  RefreshCw, MoreHorizontal, Copy, ExternalLink, Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import useWebSocket from '../hooks/useWebSocket';

/* ─── helpers ──────────────────────────────────── */
const initials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

const PALETTES = [
  'from-violet-500 to-indigo-600',
  'from-indigo-500 to-blue-600',
  'from-sky-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-fuchsia-500 to-purple-600',
];
const avatarGradient = (name = '') => PALETTES[name.charCodeAt(0) % PALETTES.length] || PALETTES[0];

const STATUS_CFG = {
  completed:    { label: 'Completed',    icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending:      { label: 'Pending',      icon: Clock,        cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  failed:       { label: 'Failed',       icon: XCircle,      cls: 'bg-red-50 text-red-700 border-red-200' },
  needs_review: { label: 'Review',       icon: AlertCircle,  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || { label: status || 'Unknown', icon: Star, cls: 'bg-slate-50 text-slate-600 border-slate-200' };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border font-semibold ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
};

const ScoreBar = ({ score }) => {
  if (score == null) return <span className="text-slate-300 text-xs">—</span>;
  const pct = Math.min(Math.round(score * 100), 100);
  const color = pct >= 75 ? 'from-emerald-400 to-teal-400' : pct >= 50 ? 'from-indigo-400 to-violet-400' : 'from-amber-400 to-orange-400';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-500">{pct}%</span>
    </div>
  );
};

const ScoreRing = ({ score }) => {
  if (score == null) return <span className="text-slate-300 text-xs">—</span>;
  const pct = Math.min(Math.round(score * 100), 100);
  const r = 18, c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const col = pct >= 75 ? '#10b981' : pct >= 50 ? '#6366f1' : '#f59e0b';
  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <svg className="w-12 h-12 -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#f1f5f9" strokeWidth="3" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={col} strokeWidth="3" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <span className="absolute text-[10px] font-black text-slate-700">{pct}</span>
    </div>
  );
};

/* ─── skeleton ─────────────────────────────────── */
const SkeletonRow = () => (
  <tr>
    {[40, 200, 80, 90, 100, 80, 60].map((w, i) => (
      <td key={i} className="px-5 py-4">
        <div className="skeleton h-3.5 rounded-full" style={{ width: w }} />
      </td>
    ))}
  </tr>
);

const SkeletonCard = () => (
  <div className="glass-card p-5 space-y-4 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-slate-200" />
      <div className="space-y-2 flex-1">
        <div className="skeleton h-3.5 rounded-full w-3/4" />
        <div className="skeleton h-2.5 rounded-full w-1/2" />
      </div>
    </div>
    <div className="skeleton h-2 rounded-full w-full" />
    <div className="flex gap-2">
      <div className="skeleton h-6 rounded-lg w-16" />
      <div className="skeleton h-6 rounded-lg w-16" />
    </div>
  </div>
);

/* ─── stat card ────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="glass-card p-4 flex items-center gap-4 group hover-lift">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} shadow-lg group-hover:scale-110 transition-transform`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-900 leading-none">{value ?? '—'}</p>
      <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
    </div>
  </div>
);

/* ─── DETAIL MODAL TABS ────────────────────────── */
const TABS = [
  { id: 'overview', label: 'Overview', icon: Eye },
  { id: 'skills',   label: 'Skills AI', icon: Sparkles },
  { id: 'timeline', label: 'Experience', icon: Briefcase },
];

/* ══════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════ */
export default function CandidatesPage() {
  const [candidates, setCandidates] = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(0);
  const limit                       = 15;

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
      if (lastMessage.type === 'INGESTION_COMPLETE') {
        showToast(`Candidate ${lastMessage.candidate_name || 'uploaded'} ready!`, 'success');
      }
    }
  }, [lastMessage]);

  const modalRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* debounce search */
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQuery(searchQuery); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => { fetchCandidates(); }, [page, debouncedQuery, statusFilter, minExp]);

  useEffect(() => { fetchShortlists(); }, []);

  /* Escape to close modal */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') closeModal(); };
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
      const [candidateRes, analysisRes] = await Promise.allSettled([
        api.get(`/api/candidates/${id}`),
        api.get(`/api/candidates/${id}/analysis`),
      ]);
      if (candidateRes.status === 'fulfilled') setSelectedCandidate(candidateRes.value.data);
      if (analysisRes.status === 'fulfilled')  setCandidateAnalysis(analysisRes.value.data);

      // fetch similar in background
      api.get(`/api/candidates/${id}/similar?limit=4`).then(r => setSimilarCandidates(r.data?.results || [])).catch(() => {});
    } catch {
      setError('Failed to load candidate details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => { setSelectedCandidate(null); setCandidateAnalysis(null); setSimilarCandidates([]); };

  const deleteCandidate = async (id) => {
    if (!confirm('Permanently delete this candidate?')) return;
    try {
      await api.delete(`/api/candidates/${id}`);
      fetchCandidates();
      if (selectedCandidate?.id === id) closeModal();
      setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      showToast('Candidate deleted');
    } catch {
      showToast('Failed to delete', 'error');
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

  const toggleSelection = (id) =>
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const handleSelectAll = (e) =>
    setSelectedIds(e.target.checked ? new Set(candidates.map(c => c.id)) : new Set());

  const exportCSV = () => {
    const rows = [
      ['Name', 'Email', 'Title', 'Location', 'Experience', 'Status'],
      ...candidates.map(c => [c.full_name, c.email, c.current_title, c.location, c.years_experience, c.ingestion_status].map(v => `"${v ?? ''}"`)),
    ];
    const a = Object.assign(document.createElement('a'), {
      href: 'data:text/csv;charset=utf-8,' + encodeURI(rows.map(r => r.join(',')).join('\n')),
      download: 'candidates_export.csv',
    });
    document.body.appendChild(a); a.click(); a.remove();
  };

  const copyEmail = (email) => { navigator.clipboard.writeText(email); showToast('Email copied'); };

  const totalPages  = Math.ceil(total / limit);
  const completed   = candidates.filter(c => c.ingestion_status === 'completed').length;
  const withScore   = candidates.filter(c => c.confidence_score != null).length;
  const avgScore    = withScore ? Math.round(candidates.reduce((s, c) => s + (c.confidence_score ?? 0), 0) / withScore * 100) : null;
  const activeFilters = [searchQuery, statusFilter, minExp].filter(Boolean).length;

  /* ─── RENDER ───────────────────────────────────── */
  return (
    <div className="space-y-6 pb-10">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}
          >
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
              <Users className="w-5 h-5 text-white" />
            </span>
            Candidates Directory
          </h2>
          <p className="text-slate-500 text-sm mt-1.5 ml-1">
            {total.toLocaleString()} total profiles indexed and ready to match
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {selectedIds.size > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 px-3.5 py-2 bg-indigo-50 border border-indigo-200 rounded-xl">
              <span className="text-sm font-bold text-indigo-700">{selectedIds.size} selected</span>
              {shortlists.length > 0 && (
                <select
                  onChange={(e) => { if (e.target.value) selectedIds.forEach(id => addToShortlist(e.target.value, id)); e.target.value = ''; }}
                  className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg font-semibold cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>+ Shortlist</option>
                  {shortlists.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
              <button onClick={() => setSelectedIds(new Set())} className="text-indigo-400 hover:text-indigo-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-xl p-0.5 border border-slate-200">
            <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <LayoutList className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button onClick={fetchCandidates} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-all shadow-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-semibold shadow-sm">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* ── Stat Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Users}      label="Total Profiles"      value={total.toLocaleString()}                        color="bg-gradient-to-br from-indigo-500 to-violet-600" />
        <StatCard icon={CheckCircle2} label="Completed This Page" value={completed}                                    color="bg-gradient-to-br from-emerald-500 to-teal-500" />
        <StatCard icon={TrendingUp} label="Avg. AI Score"        value={avgScore != null ? `${avgScore}%` : '—'}       color="bg-gradient-to-br from-amber-500 to-orange-500" />
        <StatCard icon={Layers}     label="Current Page"         value={`${page + 1} / ${totalPages || 1}`}            color="bg-gradient-to-br from-sky-500 to-blue-600" />
      </div>

      {/* ── Filters ── */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search name, title, skills…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <SlidersHorizontal className="w-4 h-4" />
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
            className="py-2.5 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 cursor-pointer text-slate-700 font-medium">
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="needs_review">Needs Review</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <Briefcase className="w-4 h-4" />
          <select value={minExp} onChange={e => { setMinExp(e.target.value); setPage(0); }}
            className="py-2.5 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 cursor-pointer text-slate-700 font-medium">
            <option value="">Any Exp.</option>
            <option value="1">1+ Years</option>
            <option value="3">3+ Years</option>
            <option value="5">5+ Years</option>
            <option value="8">8+ Years</option>
          </select>
        </div>

        {activeFilters > 0 && (
          <button onClick={() => { setSearchQuery(''); setStatusFilter(''); setMinExp(''); setPage(0); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-2 rounded-xl transition-colors">
            <X className="w-3 h-3" /> Clear {activeFilters} filter{activeFilters > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* ═══ TABLE VIEW ═══ */}
      {viewMode === 'table' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-5 py-3.5 w-10">
                    <input type="checkbox" checked={candidates.length > 0 && selectedIds.size === candidates.length} onChange={handleSelectAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                  </th>
                  <th className="text-left py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Candidate</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Exp</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Source</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">AI Score</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                : candidates.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="py-20 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><UserCheck className="w-8 h-8 text-slate-300" /></div>
                      <p className="text-slate-500 font-semibold">No candidates found</p>
                      <p className="text-slate-400 text-sm mt-1">Try adjusting your filters or search query</p>
                    </div>
                  </td></tr>
                ) : candidates.map((c, i) => {
                  const isSelected = selectedIds.has(c.id);
                  const isActive = selectedCandidate?.id === c.id;
                  return (
                    <motion.tr key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02, duration: 0.2 }}
                      onClick={() => viewCandidate(c.id)}
                      className={`cursor-pointer transition-colors group ${isActive ? 'bg-indigo-50/70' : isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50/80'}`}>
                      <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(c.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarGradient(c.full_name)} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}>
                            {initials(c.full_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{c.full_name || '—'}</p>
                            <p className="text-xs text-slate-500 truncate">{c.current_title || 'No title'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600 font-medium whitespace-nowrap">{c.years_experience != null ? `${c.years_experience} yrs` : '—'}</td>
                      <td className="px-5 py-4"><span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 font-medium">{c.source || '—'}</span></td>
                      <td className="px-5 py-4"><StatusBadge status={c.ingestion_status} /></td>
                      <td className="px-5 py-4"><ScoreBar score={c.confidence_score} /></td>
                      <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                        <button onClick={() => deleteCandidate(c.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {!loading && candidates.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
              <span className="text-xs text-slate-500 font-medium">
                Showing <span className="font-bold text-slate-700">{page * limit + 1}</span>–<span className="font-bold text-slate-700">{Math.min((page + 1) * limit, total)}</span> of <span className="font-bold text-slate-700">{total.toLocaleString()}</span>
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white rounded-lg border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm">
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white rounded-lg border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm">
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ GRID (CARD) VIEW ═══ */}
      {viewMode === 'grid' && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : candidates.length === 0 ? (
            <div className="glass-card py-20 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><UserCheck className="w-8 h-8 text-slate-300" /></div>
              <p className="text-slate-500 font-semibold">No candidates found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidates.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  onClick={() => viewCandidate(c.id)}
                  className={`glass-card p-5 cursor-pointer group transition-all hover:shadow-lg hover:border-indigo-200 ${selectedIds.has(c.id) ? 'ring-2 ring-indigo-400' : ''}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${avatarGradient(c.full_name)} flex items-center justify-center text-white text-sm font-bold shadow-md`}>
                        {initials(c.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate text-sm">{c.full_name}</p>
                        <p className="text-xs text-slate-500 truncate">{c.current_title || 'No title'}</p>
                      </div>
                    </div>
                    <ScoreRing score={c.confidence_score} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <StatusBadge status={c.ingestion_status} />
                    {c.years_experience != null && (
                      <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium border border-slate-200">
                        {c.years_experience} yrs
                      </span>
                    )}
                    {c.location && (
                      <span className="text-[11px] px-2 py-0.5 text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {c.location}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">{c.source}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={() => toggleSelection(c.id)} className={`p-1.5 rounded-lg transition-colors ${selectedIds.has(c.id) ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 text-slate-400'}`}>
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteCandidate(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          {/* Grid Pagination */}
          {!loading && candidates.length > 0 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="flex items-center gap-1 px-4 py-2 text-sm font-semibold bg-white rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm">
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <span className="text-sm text-slate-500 font-medium">Page {page + 1} of {totalPages || 1}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
                className="flex items-center gap-1 px-4 py-2 text-sm font-semibold bg-white rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* ═══ DETAIL MODAL ═══ */}
      <AnimatePresence>
        {(selectedCandidate || detailLoading) && (
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div
              key="detail-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
              ref={modalRef}
              className="w-full max-w-5xl bg-white shadow-2xl rounded-2xl flex flex-col max-h-full overflow-hidden"
            >
              {detailLoading ? (
                <div className="flex-1 flex items-center justify-center py-32">
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-t-indigo-500 border-indigo-100 rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-slate-500 font-medium">Loading profile…</p>
                  </div>
                </div>
              ) : selectedCandidate ? (
                <>
                  {/* Modal Header */}
                  <div className="relative p-6 pb-4 border-b border-slate-100 shrink-0">
                    <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${avatarGradient(selectedCandidate.full_name)} rounded-t-2xl`} />
                    <div className="flex items-start justify-between mt-1">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGradient(selectedCandidate.full_name)} flex items-center justify-center text-white text-xl font-bold shadow-lg`}>
                          {initials(selectedCandidate.full_name)}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-900 leading-tight">{selectedCandidate.full_name}</h3>
                          <p className="text-indigo-600 font-semibold text-sm mt-0.5">{selectedCandidate.current_title || 'No Title'}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-1.5">
                            {selectedCandidate.location && <span className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="w-3 h-3" /> {selectedCandidate.location}</span>}
                            {selectedCandidate.years_experience != null && <span className="flex items-center gap-1 text-xs text-slate-500"><Briefcase className="w-3 h-3" /> {selectedCandidate.years_experience} yrs</span>}
                            <StatusBadge status={selectedCandidate.ingestion_status} />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {selectedCandidate.confidence_score != null && <ScoreRing score={selectedCandidate.confidence_score} />}
                        
                        {/* Quick Actions inside Modal */}
                        {shortlists.length > 0 && (
                          <div className="relative group/shortlist hidden sm:block">
                            <select
                              onChange={(e) => { 
                                if (e.target.value) {
                                  addToShortlist(e.target.value, selectedCandidate.id);
                                  e.target.value = '';
                                }
                              }}
                              className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg font-semibold cursor-pointer outline-none hover:bg-indigo-100 transition-colors"
                              defaultValue=""
                            >
                              <option value="" disabled>+ Shortlist</option>
                              {shortlists.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </div>
                        )}
                        
                        <button 
                          onClick={() => deleteCandidate(selectedCandidate.id)} 
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 hidden sm:block"
                          title="Delete Candidate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors ml-1">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mt-4 -mb-4 pl-1">
                      {TABS.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-all ${
                            activeTab === t.id ? 'text-indigo-600 border-indigo-500 bg-indigo-50/50' : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50'
                          }`}>
                          <t.icon className="w-3.5 h-3.5" /> {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scrollable Body */}
                  <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* ─── LEFT COLUMN ─── */}
                      <div className="lg:col-span-2 space-y-6">

                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                          <>
                            {selectedCandidate.summary && (
                              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">Executive Summary</h4>
                                <p className="text-slate-700 text-sm leading-relaxed p-4 bg-slate-50 rounded-xl border border-slate-100 italic">
                                  &ldquo;{selectedCandidate.summary}&rdquo;
                                </p>
                              </div>
                            )}
                            {selectedCandidate.education && (
                              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Education</h4>
                                <div className="space-y-2">
                                  {(Array.isArray(selectedCandidate.education) ? selectedCandidate.education : [selectedCandidate.education]).map((edu, i) => (
                                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                      <p className="text-sm font-semibold text-slate-800">{typeof edu === 'object' ? edu.degree || edu.institution || JSON.stringify(edu) : String(edu)}</p>
                                      {typeof edu === 'object' && edu.institution && <p className="text-xs text-slate-500 mt-0.5">{edu.institution}</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {selectedCandidate.skills?.length > 0 && (
                              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                  {selectedCandidate.skills.map((s, i) => (
                                    <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 font-semibold">{s}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {selectedCandidate.certifications?.length > 0 && (
                              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                                  <FileText className="w-4 h-4" /> Certifications
                                </h4>
                                <div className="space-y-2">
                                  {selectedCandidate.certifications.map((c, i) => (
                                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                                      <div>
                                        <p className="text-sm font-semibold text-slate-800">{c.name || 'Certification'}</p>
                                        {c.issuer && <p className="text-xs text-slate-500 mt-0.5">{c.issuer}</p>}
                                      </div>
                                      {c.year && <span className="text-xs font-bold text-slate-400">{c.year}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {selectedCandidate.projects?.length > 0 && (
                              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                                  <Layers className="w-4 h-4" /> Projects
                                </h4>
                                <div className="space-y-4">
                                  {selectedCandidate.projects.map((p, i) => (
                                    <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                      <div className="flex justify-between items-start mb-2">
                                        <p className="text-sm font-bold text-slate-800">{p.name || 'Project'}</p>
                                        {p.url && (
                                          <a href={p.url.startsWith('http') ? p.url : `https://${p.url}`} target="_blank" rel="noreferrer" className="text-indigo-500 hover:text-indigo-700">
                                            <ExternalLink className="w-3.5 h-3.5" />
                                          </a>
                                        )}
                                      </div>
                                      {p.description && <p className="text-xs text-slate-600 mb-2 leading-relaxed">{p.description}</p>}
                                      {p.technologies?.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                          {p.technologies.map((t, idx) => (
                                            <span key={idx} className="text-[10px] bg-white border border-slate-200 px-2.5 py-1 rounded-md text-slate-500 font-semibold">{t}</span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {selectedCandidate.publications?.length > 0 && (
                              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                                  <Bookmark className="w-4 h-4" /> Publications / Papers
                                </h4>
                                <div className="space-y-2">
                                  {selectedCandidate.publications.map((pub, i) => (
                                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                      <div className="flex justify-between items-start">
                                        <p className="text-sm font-semibold text-slate-800">{pub.title || 'Publication'}</p>
                                        {pub.url && (
                                          <a href={pub.url.startsWith('http') ? pub.url : `https://${pub.url}`} target="_blank" rel="noreferrer" className="text-indigo-500 hover:text-indigo-700 ml-2 shrink-0">
                                            <ExternalLink className="w-3.5 h-3.5" />
                                          </a>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                        {pub.publisher_or_conference && <span>{pub.publisher_or_conference}</span>}
                                        {pub.publisher_or_conference && pub.year && <span>•</span>}
                                        {pub.year && <span>{pub.year}</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Skills AI Tab */}
                        {activeTab === 'skills' && (
                          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                            <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                              <Sparkles className="w-5 h-5 text-indigo-500" /> Skill Analysis Overview
                            </h4>
                            {!candidateAnalysis ? (
                              <p className="text-sm text-slate-500 italic">Analysis data not available for this candidate.</p>
                            ) : (
                              <div className="space-y-6">
                                <div className="grid grid-cols-3 gap-4">
                                  {[
                                    { v: candidateAnalysis.skill_profile?.total_canonical || 0, l: 'Normalized', bg: 'bg-emerald-50 border-emerald-100', tc: 'text-emerald-600', lc: 'text-emerald-800' },
                                    { v: candidateAnalysis.skill_profile?.total_inferred || 0, l: 'Inferred', bg: 'bg-blue-50 border-blue-100', tc: 'text-blue-600', lc: 'text-blue-800' },
                                    { v: candidateAnalysis.skill_profile?.total_emerging || 0, l: 'Emerging', bg: 'bg-amber-50 border-amber-100', tc: 'text-amber-600', lc: 'text-amber-800' },
                                  ].map((s, i) => (
                                    <div key={i} className={`rounded-xl p-3 border text-center ${s.bg}`}>
                                      <p className={`text-2xl font-black ${s.tc}`}>{s.v}</p>
                                      <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${s.lc}`}>{s.l}</p>
                                    </div>
                                  ))}
                                </div>

                                {candidateAnalysis.normalized_skills?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3 border-b border-slate-100 pb-1">Taxonomy Mapped Skills</p>
                                    <div className="flex flex-wrap gap-2">
                                      {candidateAnalysis.normalized_skills.map((s, i) => (
                                        <div key={i} className="inline-flex flex-col bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                                          <div className="px-3 py-1.5 bg-white flex items-center justify-between gap-3 border-b border-slate-100">
                                            <span className="text-sm font-semibold text-slate-800">{s.canonical_name}</span>
                                            {s.proficiency && (
                                              <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                                                s.proficiency === 'expert' ? 'bg-indigo-100 text-indigo-700' :
                                                s.proficiency === 'advanced' ? 'bg-blue-100 text-blue-700' :
                                                s.proficiency === 'intermediate' ? 'bg-teal-100 text-teal-700' :
                                                'bg-slate-100 text-slate-600'
                                              }`}>{s.proficiency}</span>
                                            )}
                                          </div>
                                          <div className="px-3 py-1 bg-slate-50 text-[10px] text-slate-500 flex justify-between">
                                            <span>From: &ldquo;{s.original_name}&rdquo;</span>
                                            {s.estimated_years && <span>{s.estimated_years} yrs</span>}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {candidateAnalysis.inferred_skills?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3 border-b border-slate-100 pb-1">AI Inferred Capabilities</p>
                                    <div className="flex flex-wrap gap-2">
                                      {candidateAnalysis.inferred_skills.map((s, i) => (
                                        <div key={`inf-${i}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/50 border border-blue-100 rounded-lg text-sm text-blue-800">
                                          <span className="font-semibold">{s.canonical_name}</span>
                                          <span className="text-[10px] text-blue-500">(via {s.inferred_from})</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {candidateAnalysis.emerging_skills?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3 border-b border-slate-100 pb-1 flex items-center justify-between">
                                      <span>Emerging / Unmapped</span>
                                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px]">Flagged</span>
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {candidateAnalysis.emerging_skills.map((s, i) => (
                                        <span key={`emg-${i}`} className="inline-flex px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 font-medium">
                                          {s.canonical_name || s}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Experience Tab */}
                        {activeTab === 'timeline' && (
                          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-5">Experience Timeline</h4>
                            {selectedCandidate.experience?.length > 0 ? (
                              <div className="relative space-y-5 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-indigo-300 before:to-slate-200">
                                {selectedCandidate.experience.map((e, i) => (
                                  <div key={i} className="relative pl-8">
                                    <span className="absolute left-[3.5px] top-1.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white shadow-md z-10" />
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                      <p className="text-slate-800 font-bold text-sm">{typeof e === 'object' && e !== null ? e.title || 'Role' : String(e)}</p>
                                      {typeof e === 'object' && e !== null && (
                                        <>
                                          <p className="text-indigo-600 text-xs font-semibold mt-0.5">{e.company}</p>
                                          <p className="text-slate-500 text-xs mt-1">{e.duration}</p>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-400 italic">No experience data available.</p>
                            )}
                          </div>
                        )}

                        {/* Similar Candidates */}
                        {similarCandidates.length > 0 && (
                          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                              <Zap className="w-4 h-4 text-amber-500" /> Similar Profiles
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                              {similarCandidates.map((sc, i) => (
                                <button key={i} onClick={() => viewCandidate(sc.id)}
                                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-left">
                                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${avatarGradient(sc.full_name)} flex items-center justify-center text-white text-[10px] font-bold`}>
                                    {initials(sc.full_name)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-slate-800 truncate">{sc.full_name}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{sc.current_title || ''}</p>
                                  </div>
                                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{sc.similarity_pct}%</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ─── RIGHT COLUMN ─── */}
                      <div className="space-y-5">
                        {/* Contact */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
                          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Contact & Actions</h4>
                          {selectedCandidate.email && (
                            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                              <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase">Email</p>
                                <p className="text-xs font-medium text-slate-700 truncate max-w-[180px]">{selectedCandidate.email}</p>
                              </div>
                              <button onClick={() => copyEmail(selectedCandidate.email)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          {selectedCandidate.phone && (
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase">Phone</p>
                              <p className="text-xs font-medium text-slate-700">{selectedCandidate.phone}</p>
                            </div>
                          )}
                          <div className="flex flex-col gap-2 pt-1">
                            {selectedCandidate.email && (
                              <a href={`mailto:${selectedCandidate.email}`} className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
                                <Mail className="w-4 h-4" /> Send Email
                              </a>
                            )}
                            {selectedCandidate.linkedin_url && (
                              <a href={selectedCandidate.linkedin_url} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-sm font-bold rounded-xl transition-colors">
                                <ExternalLink className="w-4 h-4" /> LinkedIn
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Shortlist */}
                        {shortlists.length > 0 && (
                          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2"><BookmarkPlus className="w-4 h-4" /> Add to Shortlist</h4>
                            <div className="space-y-2">
                              {shortlists.slice(0, 4).map(s => (
                                <button key={s.id} onClick={() => addToShortlist(s.id, selectedCandidate.id)}
                                  className="w-full flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-left">
                                  <span className="text-xs font-semibold text-slate-700 truncate">{s.name}</span>
                                  <span className="text-[10px] text-slate-400">{s.candidate_count} candidates</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Danger */}
                        <div className="pt-4 border-t border-slate-200">
                          <button onClick={() => deleteCandidate(selectedCandidate.id)}
                            className="w-full py-2.5 text-sm font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-xl transition-all flex items-center justify-center gap-2">
                            <Trash2 className="w-4 h-4" /> Delete Profile
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
