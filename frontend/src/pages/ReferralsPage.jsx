import React, { useState, useEffect } from 'react';
import { FileText, TrendingUp, Users, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { motion } from 'framer-motion';
import api from '../lib/api';

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6'];

export default function ReferralsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('analytics');

  useEffect(() => {
    Promise.allSettled([
      api.get('/api/referrals/analytics'),
      api.get('/api/referrals'),
    ]).then(([analyticsRes, listRes]) => {
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data);
      if (listRes.status === 'fulfilled') setReferrals(listRes.value.data.results || []);
    }).catch(() => setError('Failed to load referral data.'))
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      await api.patch(`/api/referrals/${id}/status?new_status=${newStatus}`);
      setReferrals(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    } catch { setError('Failed to update status.'); }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="w-7 h-7 border-3 border-t-blue-500 border-slate-200 rounded-full animate-spin" /></div>;

  const deptData = analytics?.department_breakdown?.map(d => ({ name: d.department || 'Unknown', referrals: d.count })) || [];
  const statusData = analytics?.status_breakdown?.map(s => ({ name: s.status, value: s.count })) || [];

  const statusBadge = (s) => {
    const map = {
      referred: 'bg-blue-50 text-blue-700 border-blue-200',
      under_review: 'bg-amber-50 text-amber-700 border-amber-200',
      interview: 'bg-purple-50 text-purple-700 border-purple-200',
      hired: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
    };
    return map[s] || 'bg-slate-50 text-slate-600 border-slate-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Referrals</h2>
          <p className="text-slate-500 text-sm mt-1">Employee referral tracking & analytics</p>
        </div>
        <div className="flex bg-slate-100 rounded-xl p-1">
          {['analytics', 'list'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'analytics' ? 'Analytics' : 'All Referrals'}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{error}</div>}

      {tab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Referrals', value: analytics.total_referrals, icon: FileText },
              { label: 'Total Hires', value: analytics.total_hires, icon: Award },
              { label: 'Success Rate', value: `${analytics.success_rate}%`, icon: TrendingUp },
              { label: 'Top Referrers', value: analytics.top_referrers?.length || 0, icon: Users },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className="glass-card border border-slate-200/80 p-5">
                <p className="text-sm text-slate-500">{s.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{s.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card border border-slate-200/80 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">By Department</h3>
              <div className="h-64">
                {deptData.length > 0 ? (
                  <ResponsiveContainer>
                    <BarChart data={deptData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }} />
                      <Bar dataKey="referrals" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-slate-400">No data</div>}
              </div>
            </div>

            <div className="glass-card border border-slate-200/80 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Status Breakdown</h3>
              <div className="h-64">
                {statusData.length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" stroke="none">
                        {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }} />
                      <Legend iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-slate-400">No data</div>}
              </div>
            </div>
          </div>

          {analytics.top_referrers?.length > 0 && (
            <div className="glass-card border border-slate-200/80 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Top Referrers</h3>
              <div className="space-y-3">
                {analytics.top_referrers.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50/50 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                        #{i + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{r.name}</p>
                        <p className="text-xs text-slate-500">{r.department}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{r.referral_count} referrals</p>
                      <p className="text-xs text-emerald-600">{r.hires} hired</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'list' && (
        <div className="glass-card border border-slate-200/80 overflow-hidden">
          {referrals.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No referrals yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Employee</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Candidate</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Job</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Date</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {referrals.map(r => (
                    <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-slate-900">{r.employee_name}</td>
                      <td className="px-5 py-3.5 text-slate-600">{r.candidate_name}</td>
                      <td className="px-5 py-3.5 text-slate-600">{r.job_title}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusBadge(r.status)}`}>{r.status}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{new Date(r.referred_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5">
                        <select value={r.status} onChange={e => updateStatus(r.id, e.target.value)}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100">
                          {['referred', 'under_review', 'interview', 'hired', 'rejected'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
