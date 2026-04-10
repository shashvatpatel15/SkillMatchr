import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, FileText, User, Briefcase, Clock, RefreshCw, Filter,
  Search, ChevronDown, ChevronLeft, ChevronRight, Loader2, Download,
  UserPlus, GitMerge, Upload, Sparkles, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

const ACTION_CONFIG = {
  referral_created:        { icon: UserPlus,  color: 'bg-blue-50 text-blue-600 border-blue-200',    dot: 'bg-blue-500' },
  created_shortlist:       { icon: Briefcase, color: 'bg-indigo-50 text-indigo-600 border-indigo-200', dot: 'bg-indigo-500' },
  added_to_shortlist:      { icon: User,      color: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-500' },
  removed_from_shortlist:  { icon: User,      color: 'bg-red-50 text-red-600 border-red-200',       dot: 'bg-red-500' },
  candidate_ingested:      { icon: Upload,    color: 'bg-cyan-50 text-cyan-600 border-cyan-200',    dot: 'bg-cyan-500' },
  dedup_merged:            { icon: GitMerge,  color: 'bg-violet-50 text-violet-600 border-violet-200', dot: 'bg-violet-500' },
  dedup_dismissed:         { icon: Eye,       color: 'bg-amber-50 text-amber-600 border-amber-200', dot: 'bg-amber-500' },
  job_created:             { icon: Briefcase, color: 'bg-teal-50 text-teal-600 border-teal-200',    dot: 'bg-teal-500' },
};

const DEFAULT_CONFIG = { icon: Activity, color: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' };

function formatAction(action) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function timeAgo(date) {
  const now = new Date();
  const diff = (now - new Date(date)) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function ActivityPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const fetchLogs = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/activity?limit=200');
      setLogs(res.data.results || []);
      setTotal(res.data.total || 0);
    } catch {
      setError('Failed to load activity log. Ensure the backend is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Get unique actions for filter
  const uniqueActions = [...new Set(logs.map(l => l.action))].sort();

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchQuery ||
      formatAction(log.action).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.entity_type || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = !actionFilter || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  // Stats
  const todayCount = logs.filter(l => {
    const d = new Date(l.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">Loading activity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Activity className="w-5 h-5 text-white" />
            </div>
            Activity Log
          </h1>
          <p className="text-slate-500 text-sm mt-1.5">Track all actions across your recruitment pipeline</p>
        </div>
        <button
          onClick={() => fetchLogs(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm font-medium transition-all shadow-sm disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Actions', value: total, color: 'from-indigo-500 to-violet-500' },
          { label: 'Today', value: todayCount, color: 'from-emerald-500 to-teal-500' },
          { label: 'Action Types', value: uniqueActions.length, color: 'from-blue-500 to-cyan-500' },
          { label: 'Showing', value: filteredLogs.length, color: 'from-amber-500 to-orange-500' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm"
          >
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/60 p-3 flex flex-wrap items-center gap-3 shadow-sm">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activity..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="py-2 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 cursor-pointer"
          >
            <option value="">All Actions</option>
            {uniqueActions.map(a => (
              <option key={a} value={a}>{formatAction(a)}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3.5 rounded-xl border border-red-100 flex items-center gap-2">
          <Activity className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Timeline */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-20 bg-white/50 glass-card border border-slate-200/60">
          <Activity className="w-14 h-14 mx-auto mb-4 text-slate-200" />
          <p className="text-lg font-semibold text-slate-500">No activity yet</p>
          <p className="text-sm text-slate-400 mt-1">Actions like referrals, ingestion, and shortlists will appear here</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-200 via-slate-200 to-transparent" />

          <div className="space-y-3">
            <AnimatePresence>
              {filteredLogs.map((log, i) => {
                const config = ACTION_CONFIG[log.action] || DEFAULT_CONFIG;
                const Icon = config.icon;
                const isExpanded = expandedId === log.id;

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.5) }}
                    className="flex items-start gap-4 relative pl-14"
                  >
                    {/* Timeline dot */}
                    <div className={`absolute left-3.5 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center bg-white ${config.color} shadow-sm`}>
                      <Icon className="w-3 h-3" />
                    </div>

                    {/* Card */}
                    <div
                      className={`flex-1 bg-white border rounded-2xl transition-all duration-200 cursor-pointer ${
                        isExpanded
                          ? 'border-indigo-200 shadow-md'
                          : 'border-slate-200/60 shadow-sm hover:shadow-md hover:border-slate-300'
                      }`}
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg border ${config.color}`}>
                              {formatAction(log.action)}
                            </span>
                            <span className="text-xs text-slate-400 truncate">
                              {log.entity_type}
                              {log.entity_id ? ` · ${String(log.entity_id).substring(0, 8)}…` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                            <Clock className="w-3 h-3" />
                            {timeAgo(log.created_at)}
                          </div>
                        </div>

                        {/* Expanded */}
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-3 pt-3 border-t border-slate-100"
                          >
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-slate-400 font-medium">Full Timestamp</span>
                                <p className="text-slate-700 font-medium mt-0.5">{new Date(log.created_at).toLocaleString()}</p>
                              </div>
                              <div>
                                <span className="text-slate-400 font-medium">Entity ID</span>
                                <p className="text-slate-700 font-mono mt-0.5">{log.entity_id || '—'}</p>
                              </div>
                              <div>
                                <span className="text-slate-400 font-medium">User ID</span>
                                <p className="text-slate-700 font-mono mt-0.5">{String(log.user_id).substring(0, 12)}…</p>
                              </div>
                              <div>
                                <span className="text-slate-400 font-medium">Action Type</span>
                                <p className="text-slate-700 font-mono mt-0.5">{log.action}</p>
                              </div>
                            </div>
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div className="mt-3">
                                <span className="text-xs text-slate-400 font-medium block mb-1.5">Metadata</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {Object.entries(log.metadata).map(([k, v]) => (
                                    <span key={k} className="text-xs bg-slate-50 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-100 font-mono">
                                      {k}: {String(v).substring(0, 40)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
