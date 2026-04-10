import React, { useState, useEffect } from 'react';
import { GitMerge, X, Check, AlertTriangle, RefreshCw, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

export default function DedupPage() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');

  useEffect(() => { fetchQueue(); }, [statusFilter]);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/dedup/queue?status_filter=${statusFilter}`);
      setQueue(res.data || []);
    } catch { setError('Failed to load dedup queue.'); }
    finally { setLoading(false); }
  };

  const runScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await api.post('/api/dedup/scan');
      setScanResult(res.data);
      fetchQueue();
    } catch { setError('Dedup scan failed.'); }
    finally { setScanning(false); }
  };

  const viewDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/api/dedup/queue/${id}`);
      setDetailItem(res.data);
    } catch { setError('Failed to load dedup details.'); }
    finally { setDetailLoading(false); }
  };

  const mergeItem = async (id) => {
    try {
      await api.post(`/api/dedup/queue/${id}/merge`);
      setDetailItem(null);
      fetchQueue();
    } catch (err) { setError(err.response?.data?.detail || 'Merge failed.'); }
  };

  const dismissItem = async (id) => {
    try {
      await api.post(`/api/dedup/queue/${id}/dismiss`);
      setDetailItem(null);
      fetchQueue();
    } catch (err) { setError(err.response?.data?.detail || 'Dismiss failed.'); }
  };

  const CandidateCard = ({ candidate, label }) => (
    <div className="flex-1 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
      <p className="text-xs text-slate-400 mb-2 font-semibold uppercase">{label}</p>
      <p className="font-semibold text-slate-900">{candidate?.full_name || '—'}</p>
      <div className="mt-2 space-y-1 text-xs text-slate-500">
        {candidate?.email && <p>📧 {candidate.email}</p>}
        {candidate?.phone && <p>📱 {candidate.phone}</p>}
        {candidate?.location && <p>📍 {candidate.location}</p>}
        {candidate?.current_title && <p>💼 {candidate.current_title}</p>}
        {candidate?.years_experience != null && <p>🏅 {candidate.years_experience} yrs</p>}
        {candidate?.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {candidate.skills.slice(0, 6).map((s, i) => (
              <span key={i} className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{s}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dedup Queue</h2>
          <p className="text-slate-500 text-sm mt-1">Resolve duplicate candidate profiles</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 rounded-xl p-1">
            {['pending', 'merged', 'dismissed'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition capitalize ${statusFilter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                {s}
              </button>
            ))}
          </div>
          <button onClick={runScan} disabled={scanning}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl shadow-sm hover:shadow-md transition disabled:opacity-60">
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning...' : 'Run Scan'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{error}</div>}

      {scanResult && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-200 text-sm">
          ✅ Scan complete: checked {scanResult.pairs_checked} pairs across {scanResult.total_candidates} candidates. Found {scanResult.new_duplicates_found} new duplicates.
        </motion.div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center"><div className="w-7 h-7 border-3 border-t-blue-500 border-slate-200 rounded-full animate-spin" /></div>
      ) : queue.length === 0 ? (
        <div className="text-center py-16 text-slate-400 glass-card border border-slate-200/80">
          <GitMerge className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-lg font-medium">No {statusFilter} duplicates</p>
          <p className="text-sm">Run a scan to detect potential duplicate candidates</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="glass-card border border-slate-200/80 p-5 flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{item.candidate_a_name}</span>
                    <span className="text-slate-400">↔</span>
                    <span className="font-medium text-slate-900">{item.candidate_b_name}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Similarity: <span className="font-semibold text-indigo-600">{(item.composite_score * 100).toFixed(1)}%</span>
                    {' · '}{new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => viewDetail(item.id)} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition">
                  <Eye className="w-4 h-4" />
                </button>
                {statusFilter === 'pending' && (
                  <>
                    <button onClick={() => mergeItem(item.id)} className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 transition">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => dismissItem(item.id)} className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 transition">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {(detailItem || detailLoading) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-8">
              {detailLoading ? (
                <div className="flex items-center justify-center py-16"><div className="w-10 h-10 border-3 border-t-indigo-500 border-slate-200 rounded-full animate-spin" /></div>
              ) : detailItem && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Duplicate Comparison</h3>
                      <p className="text-sm text-slate-500">Similarity: {(detailItem.composite_score * 100).toFixed(1)}%</p>
                    </div>
                    <button onClick={() => setDetailItem(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                  </div>

                  {detailItem.score_breakdown && (
                    <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 mb-2">Score Breakdown</p>
                      <div className="flex flex-wrap gap-3">
                        {Object.entries(detailItem.score_breakdown).map(([k, v]) => (
                          <span key={k} className="text-xs bg-white px-3 py-1.5 rounded-full border border-slate-200 font-medium">
                            {k}: {typeof v === 'number' ? (v * 100).toFixed(0) + '%' : String(v)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 mb-6">
                    <CandidateCard candidate={detailItem.candidate_a} label="Candidate A (Primary)" />
                    <CandidateCard candidate={detailItem.candidate_b} label="Candidate B (Duplicate)" />
                  </div>

                  {detailItem.status === 'pending' && (
                    <div className="flex gap-3">
                      <button onClick={() => mergeItem(detailItem.id)} className="flex-1 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition flex items-center justify-center gap-2">
                        <Check className="w-5 h-5" /> Merge
                      </button>
                      <button onClick={() => dismissItem(detailItem.id)} className="flex-1 py-3 bg-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-300 transition flex items-center justify-center gap-2">
                        <X className="w-5 h-5" /> Not a Duplicate
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
