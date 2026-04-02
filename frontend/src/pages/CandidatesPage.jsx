import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search as SearchIcon, MapPin, Briefcase, ChevronLeft, ChevronRight, Eye, Trash2, Download, Filter, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit] = useState(15);
  
  // Advanced filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [minExp, setMinExp] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Debounce search input for high performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(0); // Reset page on search
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchCandidates();
  }, [page, debouncedQuery, statusFilter, minExp]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      let url = `/api/candidates?skip=${page * limit}&limit=${limit}`;
      if (debouncedQuery) url += `&q=${encodeURIComponent(debouncedQuery)}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (minExp) url += `&min_exp=${minExp}`;
      
      const res = await api.get(url);
      setCandidates(res.data.results || []);
      setTotal(res.data.total || 0);
      setError(null);
    } catch (err) {
      setError('Failed to load candidates.');
    } finally {
      setLoading(false);
    }
  };

  const viewCandidate = async (id) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/api/candidates/${id}`);
      setSelectedCandidate(res.data);
    } catch {
      setError('Failed to load candidate details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const deleteCandidate = async (id) => {
    if (!confirm('Delete this candidate?')) return;
    try {
      await api.delete(`/api/candidates/${id}`);
      fetchCandidates();
      if (selectedCandidate?.id === id) setSelectedCandidate(null);
      // Remove from selected
      const newSelected = new Set(selectedIds);
      newSelected.delete(id);
      setSelectedIds(newSelected);
    } catch {
      setError('Failed to delete candidate.');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(candidates.map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelection = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const exportCSV = () => {
    const rows = [
      ['Name', 'Email', 'Title', 'Location', 'Experience', 'Status'],
      ...candidates.map(c => [
        c.full_name || '', 
        c.email || '', 
        c.current_title || '', 
        c.location || '', 
        c.years_experience || '', 
        c.ingestion_status || ''
      ])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "candidates_export.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const totalPages = Math.ceil(total / limit);

  const statusColor = (s) => {
    const map = {
      completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      failed: 'bg-red-50 text-red-700 border-red-200',
      needs_review: 'bg-blue-50 text-blue-700 border-blue-200',
    };
    return map[s] || 'bg-slate-50 text-slate-600 border-slate-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Candidates Directory</h2>
          <p className="text-slate-500 text-sm mt-1">{total} total profiles optimized for fast retrieval</p>
        </div>
        
        {/* Recruiter Action Bar */}
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 mr-4 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
              <span className="text-sm font-semibold text-indigo-700">{selectedIds.size} Selected</span>
              <button onClick={() => alert('Bulk Add to Shortlist Triggered')} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg shadow-sm hover:bg-indigo-700">Add to List</button>
            </div>
          )}
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, title, or skills..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select 
            value={statusFilter} 
            onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
            className="py-2 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="needs_review">Needs Review</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-slate-400" />
          <select 
            value={minExp} 
            onChange={e => { setMinExp(e.target.value); setPage(0); }}
            className="py-2 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">Any Experience</option>
            <option value="1">1+ Years</option>
            <option value="3">3+ Years</option>
            <option value="5">5+ Years</option>
            <option value="8">8+ Years</option>
          </select>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{error}</div>}

      <div className="flex gap-6">
        {/* Table */}
        <div className="flex-1 glass-card overflow-hidden border border-slate-200/80">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="w-7 h-7 border-3 border-t-blue-500 border-slate-200 rounded-full animate-spin" />
            </div>
          ) : candidates.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-lg font-medium">No candidates found</p>
              <p className="text-sm">Try adjusting your advanced filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200">
                      <th className="px-5 py-3.5 w-10">
                        <input 
                          type="checkbox" 
                          checked={candidates.length > 0 && selectedIds.size === candidates.length}
                          onChange={handleSelectAll}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="text-left py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Candidate Profile</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Experience</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Source</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Score</th>
                      <th className="text-right px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {candidates.map((c, i) => {
                      const isSelected = selectedIds.has(c.id);
                      return (
                        <motion.tr
                          key={c.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className={`hover:bg-blue-50/30 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/50' : ''}`}
                          onClick={() => viewCandidate(c.id)}
                        >
                          <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => toggleSelection(c.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3.5">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900">{c.full_name || '—'}</span>
                              <span className="text-xs text-slate-500">{c.current_title || 'No Title'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600 font-medium">{c.years_experience != null ? `${c.years_experience} yoe` : '—'}</td>
                          <td className="px-5 py-3.5 text-slate-500"><span className="bg-slate-100 px-2 py-0.5 rounded-md text-xs border border-slate-200">{c.source || '—'}</span></td>
                          <td className="px-5 py-3.5">
                            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColor(c.ingestion_status)}`}>
                              {c.ingestion_status || 'unknown'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {c.confidence_score != null ? (
                              <div className="flex items-center gap-1.5 w-24">
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{ width: `${Math.min(c.confidence_score * 100, 100)}%` }} />
                                </div>
                                <span className="text-xs text-slate-500 font-medium">{(c.confidence_score * 100).toFixed(0)}</span>
                              </div>
                            ) : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteCandidate(c.id); }}
                              className="text-slate-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Advanced Pagination Tracker */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                <span className="text-xs text-slate-500 font-medium">Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} candidates</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 flex items-center gap-1 text-xs font-medium bg-white rounded-lg border border-slate-200 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 transition shadow-sm">
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                  <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="px-3 py-1.5 flex items-center gap-1 text-xs font-medium bg-white rounded-lg border border-slate-200 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 transition shadow-sm">
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Dynamic Detail Panel */}
        <AnimatePresence>
          {selectedCandidate && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: 20 }}
              className="w-96 bg-white border border-slate-200/80 shadow-xl rounded-2xl flex flex-col max-h-[calc(100vh-12rem)] overflow-hidden"
            >
              <div className="p-5 bg-gradient-to-br from-slate-50 to-blue-50 border-b border-slate-100">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 leading-tight">{selectedCandidate.full_name}</h3>
                    <p className="text-blue-600 font-medium text-sm mt-0.5">{selectedCandidate.current_title || 'No Title Provided'}</p>
                  </div>
                  <button onClick={() => setSelectedCandidate(null)} className="text-slate-400 hover:bg-slate-200/50 p-1 rounded-full transition-colors text-lg">✕</button>
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs text-slate-500 font-medium">
                  {selectedCandidate.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {selectedCandidate.location}</span>}
                  {selectedCandidate.years_experience != null && <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {selectedCandidate.years_experience} yoe</span>}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Contact Actions */}
                <div className="flex gap-2">
                  {selectedCandidate.email && (
                    <a href={`mailto:${selectedCandidate.email}`} className="flex-1 text-center py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors">
                      Email Candidate
                    </a>
                  )}
                  {selectedCandidate.linkedin_url && (
                    <a href={selectedCandidate.linkedin_url} target="_blank" rel="noreferrer" className="flex-1 text-center py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold rounded-xl transition-colors">
                      View LinkedIn
                    </a>
                  )}
                </div>

                {selectedCandidate.skills?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Verified Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCandidate.skills.map((s, i) => (
                        <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100 font-medium">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCandidate.summary && (
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Executive Summary</p>
                    <p className="text-slate-600 text-sm leading-relaxed p-3 bg-slate-50 rounded-xl border border-slate-100 italic">"{selectedCandidate.summary}"</p>
                  </div>
                )}

                {selectedCandidate.experience?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Experience Timeline</p>
                    <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-[7px] before:w-px before:bg-slate-200">
                      {selectedCandidate.experience.map((e, i) => (
                        <div key={i} className="relative pl-6 text-sm">
                          <span className="absolute left-[3.5px] top-1.5 w-2 h-2 rounded-full bg-blue-400 border-2 border-white shadow-sm" />
                          <p className="text-slate-700 font-medium">{typeof e === 'string' ? e : JSON.stringify(e)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
