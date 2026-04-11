import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Briefcase, Plus, X, MapPin, DollarSign, Users, Zap, Trash2, Clock,
  CheckCircle2, AlertCircle, BookmarkPlus, ChevronRight, Search,
  Filter, ToggleLeft, ToggleRight, Building2, Calendar, Star,
  RefreshCw, Layers, TrendingUp, XCircle, Check, SlidersHorizontal,
  Eye, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

/* ─── Helpers ────────────────────────────────────────────── */
const TYPE_LABELS = {
  full_time: 'Full Time', part_time: 'Part Time',
  contract: 'Contract', internship: 'Internship',
};

const TYPE_COLORS = {
  full_time: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  part_time: 'bg-sky-50 text-sky-700 border-sky-200',
  contract: 'bg-amber-50 text-amber-700 border-amber-200',
  internship: 'bg-violet-50 text-violet-700 border-violet-200',
};

const PALETTES = [
  'from-violet-500 to-indigo-600', 'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-600', 'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-500', 'from-fuchsia-500 to-purple-600',
];
const jobGradient = (name = '') => PALETTES[(name.charCodeAt(0) || 0) % PALETTES.length];
const initials = (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

/* ─── Sub-components ─────────────────────────────────────── */
const InputField = ({ label, name, type = 'text', placeholder, required = false, form, setForm }) => (
  <div>
    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <input
      type={type} required={required}
      value={form[name]}
      onChange={e => setForm({ ...form, [name]: e.target.value })}
      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none bg-white text-sm transition-all"
      placeholder={placeholder}
    />
  </div>
);

const Toast = ({ toast }) => (
  <AnimatePresence>
    {toast && (
      <motion.div
        key="toast"
        initial={{ opacity: 0, y: -30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.95 }}
        className={`fixed top-6 right-6 z-[200] px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-2.5 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'
        }`}
      >
        {toast.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
        {toast.msg}
      </motion.div>
    )}
  </AnimatePresence>
);

/* ─── Match Results Slide-over ───────────────────────────── */
function MatchResultsPanel({ job, onClose, shortlists, onShortlistsChange }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [shortlistingIds, setShortlistingIds] = useState(new Set());
  const [newSlName, setNewSlName] = useState('');
  const [showNewSl, setShowNewSl] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    api.post(`/api/jobs/${job.id}/match`, { top_k: 20 })
      .then(r => { setResults(r.data); setLoading(false); })
      .catch(() => { setLoading(false); showToast('Matching failed. Ensure candidates have embeddings.', 'error'); });
  }, [job.id]);

  const toggleSelect = (id) => setSelectedIds(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });
  const toggleAll = () => {
    if (selectedIds.size === results?.results?.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(results.results.map(m => m.candidate_id)));
  };

  const addToShortlist = async (shortlistId, candidateIds) => {
    const ids = Array.isArray(candidateIds) ? candidateIds : [candidateIds];
    let added = 0, skipped = 0;
    for (const id of ids) {
      setShortlistingIds(prev => new Set([...prev, id]));
      try {
        await api.post(`/api/shortlists/${shortlistId}/candidates`, { candidate_id: id });
        added++;
      } catch (err) { if (err.response?.status === 409) skipped++; }
      finally { setShortlistingIds(prev => { const s = new Set(prev); s.delete(id); return s; }); }
    }
    showToast(`${added} added${skipped ? `, ${skipped} already shortlisted` : ''}`);
  };

  const createAndShortlist = async () => {
    if (!newSlName.trim()) return;
    try {
      const res = await api.post('/api/shortlists', { name: newSlName.trim(), description: `Matches for: ${job.title}` });
      onShortlistsChange();
      setShowNewSl(false); setNewSlName('');
      const toAdd = selectedIds.size > 0 ? [...selectedIds] : results.results.map(m => m.candidate_id);
      await addToShortlist(res.data.id, toAdd);
    } catch { showToast('Failed to create shortlist', 'error'); }
  };

  const matchColor = (score) => {
    if (score >= 0.75) return { ring: 'ring-emerald-400', text: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (score >= 0.55) return { ring: 'ring-blue-400', text: 'text-blue-600', bg: 'bg-blue-50' };
    if (score >= 0.35) return { ring: 'ring-amber-400', text: 'text-amber-600', bg: 'bg-amber-50' };
    return { ring: 'ring-red-400', text: 'text-red-600', bg: 'bg-red-50' };
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-stretch justify-end"
      onClick={onClose}
    >
      <Toast toast={toast} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 py-5 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-blue-600 text-white shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-5 h-5 text-yellow-300" />
                <h2 className="text-xl font-black">AI Match Results</h2>
              </div>
              <p className="text-indigo-200 text-sm font-medium">{job.title} · {job.company || 'No company'}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-700">AI is analyzing candidates…</p>
              <p className="text-sm text-slate-400 mt-1">Semantic matching + skill analysis in progress</p>
            </div>
          </div>
        ) : results?.results?.length > 0 ? (
          <>
            {/* Stats + Bulk actions */}
            <div className="px-7 py-4 bg-slate-50 border-b border-slate-200 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-sm font-semibold text-slate-700">
                    <span className="text-2xl font-black text-indigo-600">{results.total}</span> candidates matched
                  </p>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-500 cursor-pointer">
                    <input type="checkbox" checked={selectedIds.size === results.results.length} onChange={toggleAll}
                      className="rounded border-slate-300 text-indigo-600" />
                    Select all
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  {!showNewSl ? (
                    <>
                      {selectedIds.size > 0 && shortlists.length > 0 && (
                        <select
                          defaultValue=""
                          onChange={e => { if (e.target.value) { addToShortlist(e.target.value, [...selectedIds]); e.target.value = ''; } }}
                          className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-semibold cursor-pointer outline-none hover:bg-indigo-700"
                        >
                          <option value="" disabled>+ Shortlist {selectedIds.size} selected</option>
                          {shortlists.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      )}
                      <button
                        onClick={() => { setNewSlName(`${job.title} Candidates`); setShowNewSl(true); }}
                        className="flex items-center gap-1 text-xs font-semibold bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" /> New List
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={newSlName}
                        onChange={e => setNewSlName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') createAndShortlist(); if (e.key === 'Escape') setShowNewSl(false); }}
                        className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-400 w-44"
                        placeholder="Shortlist name…"
                      />
                      <button onClick={createAndShortlist} className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700">
                        Create & Add {selectedIds.size > 0 ? `(${selectedIds.size})` : 'All'}
                      </button>
                      <button onClick={() => setShowNewSl(false)} className="p-1.5 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Results list */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {results.results.map((m, i) => {
                const col = matchColor(m.composite_score);
                const isSelected = selectedIds.has(m.candidate_id);
                return (
                  <motion.div
                    key={m.candidate_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`rounded-2xl border-2 p-4 transition-all cursor-pointer ${
                      isSelected ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm'
                    }`}
                    onClick={() => toggleSelect(m.candidate_id)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </div>

                      {/* Rank badge */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        i === 0 ? 'bg-yellow-400 text-yellow-900' :
                        i === 1 ? 'bg-slate-300 text-slate-700' :
                        i === 2 ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>#{i + 1}</div>

                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${jobGradient(m.full_name)} flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0`}>
                        {initials(m.full_name)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm">{m.full_name}</p>
                        <p className="text-xs text-slate-500 truncate">{m.current_title}{m.location ? ` · ${m.location}` : ''}</p>
                        {m.missing_skills?.length > 0 && (
                          <p className="text-[10px] text-amber-600 font-medium mt-0.5">
                            ⚠ Missing: {m.missing_skills.slice(0, 3).join(', ')}{m.missing_skills.length > 3 ? ` +${m.missing_skills.length - 3}` : ''}
                          </p>
                        )}
                      </div>

                      {/* Score */}
                      <div className={`shrink-0 w-16 h-16 rounded-2xl ${col.bg} flex flex-col items-center justify-center ring-2 ${col.ring}`}>
                        <span className={`text-xl font-black ${col.text}`}>{(m.composite_score * 100).toFixed(0)}</span>
                        <span className={`text-[10px] font-bold ${col.text} opacity-70`}>% match</span>
                      </div>

                      {/* Individual shortlist (stop propagation) */}
                      {shortlists.length > 0 && (
                        <div onClick={e => e.stopPropagation()}>
                          <select
                            defaultValue=""
                            onChange={e => { if (e.target.value) { addToShortlist(e.target.value, m.candidate_id); e.target.value = ''; } }}
                            disabled={shortlistingIds.has(m.candidate_id)}
                            className="text-[10px] bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg cursor-pointer outline-none hover:bg-indigo-50 hover:border-indigo-200 transition"
                          >
                            <option value="" disabled>+ List</option>
                            {shortlists.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Skills row */}
                    {m.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3 pl-[6.25rem]">
                        {m.skills.slice(0, 7).map((s, j) => (
                          <span key={j} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                            m.missing_skills?.includes(s) ? 'bg-red-50 text-red-500 border-red-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                          }`}>{s}</span>
                        ))}
                        {m.skills.length > 7 && <span className="text-[10px] text-slate-400">+{m.skills.length - 7}</span>}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
            <Users className="w-14 h-14 text-slate-200" />
            <p className="font-bold text-slate-600 text-lg">No matching candidates</p>
            <p className="text-sm text-slate-400">Try uploading more resumes or reducing skill requirements</p>
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body
  );
}

/* ─── Job Detail Modal ───────────────────────────────────── */
function JobDetailModal({ job, onClose, shortlists, onFindMatches, onDelete, onToggleStatus }) {
  const col = TYPE_COLORS[job.employment_type] || 'bg-slate-100 text-slate-600 border-slate-200';
  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
    >
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className={`px-8 py-6 bg-gradient-to-br ${jobGradient(job.title)} text-white shrink-0`}>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1 block">{job.company}</span>
              <h2 className="text-2xl font-black leading-tight">{job.title}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border bg-white/20 text-white border-white/30`}>
                  {TYPE_LABELS[job.employment_type] || job.employment_type}
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${job.status === 'open' ? 'bg-emerald-400/30 text-white border border-emerald-300/50' : 'bg-white/20 text-white border border-white/30'}`}>
                  {job.status}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {job.location && <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100"><MapPin className="w-4 h-4 text-slate-400" /><span className="text-sm font-medium text-slate-700">{job.location}</span></div>}
            {job.experience_required && <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100"><Star className="w-4 h-4 text-slate-400" /><span className="text-sm font-medium text-slate-700">{job.experience_required}+ years experience</span></div>}
            {job.department && <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100"><Building2 className="w-4 h-4 text-slate-400" /><span className="text-sm font-medium text-slate-700">{job.department}</span></div>}
            {(job.salary_min || job.salary_max) && <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100"><DollarSign className="w-4 h-4 text-slate-400" /><span className="text-sm font-medium text-slate-700">{job.salary_min?.toLocaleString()}{job.salary_max ? ` – ${job.salary_max.toLocaleString()}` : '+'}</span></div>}
          </div>

          {job.skills_required?.length > 0 && (
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Required Skills</h4>
              <div className="flex flex-wrap gap-2">
                {job.skills_required.map((s, i) => <span key={i} className="text-xs font-semibold px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl">{s}</span>)}
              </div>
            </div>
          )}

          {job.job_description && (
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Description</h4>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{job.job_description}</p>
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => onToggleStatus(job)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-slate-200 bg-white rounded-xl hover:bg-slate-100 transition text-slate-600">
              {job.status === 'open' ? <><ToggleRight className="w-4 h-4 text-emerald-500" /> Open</> : <><ToggleLeft className="w-4 h-4 text-slate-400" /> Closed</>}
            </button>
            <button onClick={() => { onDelete(job.id); onClose(); }} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-red-100 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
          <button onClick={() => { onFindMatches(job); onClose(); }} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition text-sm">
            <Zap className="w-4 h-4" /> Find Candidates
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [detailJob, setDetailJob] = useState(null);
  const [matchJob, setMatchJob] = useState(null);
  const [toast, setToast] = useState(null);
  const [shortlists, setShortlists] = useState([]);
  const [selectedJobIds, setSelectedJobIds] = useState(new Set());
  const [searchQ, setSearchQ] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Create form
  const [form, setForm] = useState({
    title: '', company: '', department: '', location: '',
    employment_type: 'full_time', experience_required: '',
    salary_min: '', salary_max: '', skills_required: '', job_description: '',
  });
  const [creating, setCreating] = useState(false);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/jobs');
      setJobs(res.data || []);
      setError(null);
    } catch { setError('Failed to load jobs.'); }
    finally { setLoading(false); }
  }, []);

  const fetchShortlists = useCallback(async () => {
    try { const res = await api.get('/api/shortlists'); setShortlists(res.data || []); } catch { }
  }, []);

  useEffect(() => { fetchJobs(); fetchShortlists(); }, [fetchJobs, fetchShortlists]);

  const createJob = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { showToast('Job title is required', 'error'); return; }
    setCreating(true);
    try {
      await api.post('/api/jobs', {
        ...form,
        experience_required: form.experience_required ? Number(form.experience_required) : null,
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        skills_required: form.skills_required.split(',').map(s => s.trim()).filter(Boolean),
      });
      setShowCreate(false);
      setForm({ title: '', company: '', department: '', location: '', employment_type: 'full_time', experience_required: '', salary_min: '', salary_max: '', skills_required: '', job_description: '' });
      await fetchJobs();
      showToast('Job created successfully ✨');
    } catch (err) { showToast(err.response?.data?.detail || 'Failed to create job', 'error'); }
    finally { setCreating(false); }
  };

  const deleteJob = async (jobId) => {
    try { await api.delete(`/api/jobs/${jobId}`); fetchJobs(); showToast('Job deleted'); }
    catch { showToast('Failed to delete job', 'error'); }
  };

  const deleteSelected = async () => {
    if (!selectedJobIds.size) return;
    if (!confirm(`Delete ${selectedJobIds.size} job(s)?`)) return;
    setDeleting(true);
    let done = 0;
    for (const id of selectedJobIds) {
      try { await api.delete(`/api/jobs/${id}`); done++; } catch { }
    }
    setSelectedJobIds(new Set());
    await fetchJobs();
    showToast(`${done} job(s) deleted`);
    setDeleting(false);
  };

  const toggleStatus = async (job) => {
    const newStatus = job.status === 'open' ? 'closed' : 'open';
    try {
      await api.put(`/api/jobs/${job.id}`, { status: newStatus });
      fetchJobs();
      showToast(`Job ${newStatus === 'open' ? 'reopened' : 'closed'}`);
    } catch { showToast('Failed to update status', 'error'); }
  };

  const toggleJobSelect = (id) => setSelectedJobIds(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  const filteredJobs = jobs.filter(j => {
    const q = searchQ.toLowerCase();
    const matchQ = !q || j.title.toLowerCase().includes(q) || (j.company || '').toLowerCase().includes(q) || (j.department || '').toLowerCase().includes(q);
    const matchType = !filterType || j.employment_type === filterType;
    const matchStatus = !filterStatus || j.status === filterStatus;
    return matchQ && matchType && matchStatus;
  });

  return (
    <div className="space-y-6 page-enter">
      <Toast toast={toast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            Jobs & Matching
          </h1>
          <p className="text-slate-500 text-sm mt-1">{jobs.length} open position{jobs.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedJobIds.size > 0 && (
            <button onClick={deleteSelected} disabled={deleting}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 font-semibold rounded-xl hover:bg-red-100 transition text-sm disabled:opacity-60">
              <Trash2 className="w-4 h-4" />
              Delete {selectedJobIds.size} selected
            </button>
          )}
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition text-sm">
            <Plus className="w-4 h-4" /> New Job
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Search jobs, companies…"
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm cursor-pointer outline-none focus:ring-2 focus:ring-indigo-200">
          <option value="">All Types</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm cursor-pointer outline-none focus:ring-2 focus:ring-indigo-200">
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        {(searchQ || filterType || filterStatus) && (
          <button onClick={() => { setSearchQ(''); setFilterType(''); setFilterStatus(''); }}
            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 rounded-xl transition">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

      {/* Jobs Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <div className="h-4 bg-slate-100 rounded skeleton w-2/3" />
              <div className="h-3 bg-slate-100 rounded skeleton w-1/2" />
              <div className="h-3 bg-slate-100 rounded skeleton w-3/4 mt-2" />
            </div>
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
          <Briefcase className="w-14 h-14 mx-auto mb-4 text-slate-200" />
          <p className="text-lg font-semibold text-slate-500">{jobs.length === 0 ? 'No jobs posted yet' : 'No jobs match your filters'}</p>
          <p className="text-sm text-slate-400 mt-1">{jobs.length === 0 ? 'Create your first job opening to start matching candidates' : 'Try clearing the filters'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((job, i) => {
            const isSelected = selectedJobIds.has(job.id);
            const gradient = jobGradient(job.title);
            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`group relative bg-white rounded-2xl border-2 transition-all duration-200 overflow-hidden cursor-pointer hover:shadow-lg ${
                  isSelected ? 'border-indigo-400 shadow-md shadow-indigo-100' : 'border-slate-200 hover:border-indigo-200'
                }`}
                onClick={() => setDetailJob(job)}
              >
                {/* Gradient top bar */}
                <div className={`h-1.5 w-full bg-gradient-to-r ${gradient}`} />

                <div className="p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-bold text-slate-900 text-base leading-tight truncate">{job.title}</h3>
                      <p className="text-sm text-slate-500 mt-0.5 truncate">{job.company}{job.department ? ` · ${job.department}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      {/* Checkbox */}
                      <div
                        onClick={() => toggleJobSelect(job.id)}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
                          isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 hover:border-indigo-400'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </div>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${job.status === 'open' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {job.status === 'open' ? '● Open' : '○ Closed'}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${TYPE_COLORS[job.employment_type] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {TYPE_LABELS[job.employment_type] || job.employment_type}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 mb-4">
                    {job.location && <p className="text-xs text-slate-500 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" />{job.location}</p>}
                    {job.experience_required && <p className="text-xs text-slate-500 flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-slate-400" />{job.experience_required}+ years</p>}
                    {(job.salary_min || job.salary_max) && <p className="text-xs text-slate-500 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-slate-400" />{job.salary_min?.toLocaleString()}{job.salary_max ? ` – ${job.salary_max.toLocaleString()}` : '+'}</p>}
                  </div>

                  {/* Skills */}
                  {job.skills_required?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {job.skills_required.slice(0, 4).map((s, j) => (
                        <span key={j} className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg border border-blue-100 font-medium">{s}</span>
                      ))}
                      {job.skills_required.length > 4 && (
                        <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-200">+{job.skills_required.length - 4}</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { setMatchJob(job); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition text-xs shadow-sm"
                    >
                      <Zap className="w-3.5 h-3.5" /> Find Matches
                    </button>
                    <button onClick={() => setDetailJob(job)}
                      className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteJob(job.id)}
                      className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Job Modal */}
      {createPortal(
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCreate(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            >
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
              >
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 shrink-0">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">Create New Job</h3>
                    <p className="text-sm text-slate-400 mt-0.5">Fill in the details to start matching candidates</p>
                  </div>
                  <button onClick={() => setShowCreate(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={createJob} className="flex-1 overflow-y-auto p-8 space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <InputField label="Job Title" name="title" placeholder="Senior Frontend Developer" required form={form} setForm={setForm} />
                    <InputField label="Company" name="company" placeholder="Acme Corp" form={form} setForm={setForm} />
                    <InputField label="Department" name="department" placeholder="Engineering" form={form} setForm={setForm} />
                    <InputField label="Location" name="location" placeholder="Bangalore, India" form={form} setForm={setForm} />
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Employment Type</label>
                      <select value={form.employment_type} onChange={e => setForm({ ...form, employment_type: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none bg-white text-sm">
                        <option value="full_time">Full Time</option>
                        <option value="part_time">Part Time</option>
                        <option value="contract">Contract</option>
                        <option value="internship">Internship</option>
                      </select>
                    </div>
                    <InputField label="Experience (years)" name="experience_required" type="number" placeholder="5" form={form} setForm={setForm} />
                    <InputField label="Min Salary" name="salary_min" type="number" placeholder="80,000" form={form} setForm={setForm} />
                    <InputField label="Max Salary" name="salary_max" type="number" placeholder="120,000" form={form} setForm={setForm} />
                  </div>
                  <InputField label="Required Skills (comma-separated)" name="skills_required" placeholder="React, TypeScript, Node.js, PostgreSQL" form={form} setForm={setForm} />
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Job Description</label>
                    <textarea value={form.job_description} onChange={e => setForm({ ...form, job_description: e.target.value })} rows={5}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none bg-white text-sm resize-none"
                      placeholder="Describe the role, responsibilities, and what makes it great…" />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setShowCreate(false)} className="px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 font-semibold transition text-sm">Cancel</button>
                    <button type="submit" disabled={creating}
                      className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all text-sm disabled:opacity-60 flex items-center gap-2">
                      {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><Plus className="w-4 h-4" /> Create Job</>}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {detailJob && (
          <JobDetailModal
            job={detailJob}
            onClose={() => setDetailJob(null)}
            shortlists={shortlists}
            onFindMatches={(job) => setMatchJob(job)}
            onDelete={deleteJob}
            onToggleStatus={toggleStatus}
          />
        )}
      </AnimatePresence>

      {/* Match Results Slide-over */}
      <AnimatePresence>
        {matchJob && (
          <MatchResultsPanel
            job={matchJob}
            onClose={() => setMatchJob(null)}
            shortlists={shortlists}
            onShortlistsChange={fetchShortlists}
          />
        )}
      </AnimatePresence>
    </div>
  );
}