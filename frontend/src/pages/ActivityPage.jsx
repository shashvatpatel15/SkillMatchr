import React, { useState, useEffect } from 'react';
import { Activity, FileText, User, Briefcase, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../lib/api';

const actionIcons = {
  referral_created: FileText,
  created_shortlist: Briefcase,
  added_to_shortlist: User,
  removed_from_shortlist: User,
};

const actionColors = {
  referral_created: 'bg-blue-50 text-blue-600 border-blue-200',
  created_shortlist: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  added_to_shortlist: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  removed_from_shortlist: 'bg-red-50 text-red-600 border-red-200',
};

export default function ActivityPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/api/activity?limit=100')
      .then(res => { setLogs(res.data.results || []); setTotal(res.data.total || 0); })
      .catch(() => setError('Failed to load activity log.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="w-7 h-7 border-3 border-t-blue-500 border-slate-200 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Activity Log</h2>
        <p className="text-slate-500 text-sm mt-1">{total} total actions recorded</p>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{error}</div>}

      {logs.length === 0 ? (
        <div className="text-center py-16 text-slate-400 glass-card border border-slate-200/80">
          <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-lg font-medium">No activity yet</p>
          <p className="text-sm">Actions like referrals and shortlists will appear here</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200" />
          <div className="space-y-4">
            {logs.map((log, i) => {
              const Icon = actionIcons[log.action] || Activity;
              const colorClass = actionColors[log.action] || 'bg-slate-50 text-slate-600 border-slate-200';
              return (
                <motion.div key={log.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-start gap-4 relative pl-12">
                  <div className={`absolute left-3 w-7 h-7 rounded-full border flex items-center justify-center ${colorClass}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 glass-card border border-slate-200/60 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-900 text-sm">
                        {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {log.entity_type}{log.entity_id ? ` · ${String(log.entity_id).substring(0, 8)}...` : ''}
                    </p>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(log.metadata).map(([k, v]) => (
                          <span key={k} className="text-xs bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full border border-slate-100">
                            {k}: {String(v).substring(0, 30)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
