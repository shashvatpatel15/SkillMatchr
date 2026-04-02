import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Users, FileText, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../lib/api';

const COLORS = ['#3b82f6', '#8b5cf6', '#0ea5e9', '#14b8a6', '#f43f5e', '#f59e0b'];

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/api/analytics/overview')
      .then(res => setData(res.data))
      .catch(() => setError('Failed to load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="w-7 h-7 border-3 border-t-blue-500 border-slate-200 rounded-full animate-spin" /></div>;
  if (error) return <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100">{error}</div>;

  const trendData = data?.ingestion_trends?.map(t => ({
    name: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    candidates: t.count
  })).reverse() || [];

  const pieData = data?.sources?.map(s => ({ name: s.source || 'Unknown', value: s.count })) || [];

  const stats = [
    { label: 'Total Candidates', value: data?.total_candidates || 0, icon: Users, color: 'from-blue-500 to-blue-600' },
    { label: 'Total Shortlists', value: data?.total_shortlists || 0, icon: Briefcase, color: 'from-indigo-500 to-indigo-600' },
    { label: 'Sources', value: data?.sources?.length || 0, icon: FileText, color: 'from-violet-500 to-violet-600' },
    { label: 'Recent Days', value: trendData.length, icon: TrendingUp, color: 'from-emerald-500 to-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Analytics</h2>
        <p className="text-slate-500 text-sm mt-1">Insights from your recruitment pipeline</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="glass-card border border-slate-200/80 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{s.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{s.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-sm`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="lg:col-span-2 glass-card border border-slate-200/80 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Ingestion Trends</h3>
          <p className="text-sm text-slate-500 mb-4">Candidates processed per day (last 30 days)</p>
          <div className="h-72">
            {trendData.length > 0 ? (
              <ResponsiveContainer>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="candidates" stroke="#3b82f6" strokeWidth={2.5} fill="url(#areaFill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-400">No trend data</div>}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="glass-card border border-slate-200/80 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Sources Breakdown</h3>
          <p className="text-sm text-slate-500 mb-4">Where candidates come from</p>
          <div className="h-64">
            {pieData.length > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-400">No source data</div>}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
