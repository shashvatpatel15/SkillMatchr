import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { Users, FileText, CheckCircle, TrendingUp, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../lib/api';

const COLORS = ['#3b82f6', '#8b5cf6', '#0ea5e9', '#14b8a6', '#f43f5e'];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [referrals, setReferrals] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Using Promise.allSettled to ensure dashboard renders even if one fails (like authorization missing)
        const [overviewRes, referralsRes] = await Promise.allSettled([
          api.get('/api/analytics/overview'),
          api.get('/api/referrals/analytics')
        ]);
        
        if (overviewRes.status === 'fulfilled') {
          setOverview(overviewRes.value.data);
        } else {
           console.error("Overview error", overviewRes.reason);
        }

        if (referralsRes.status === 'fulfilled') {
          setReferrals(referralsRes.value.data);
        } else {
           console.error("Referrals error", referralsRes.reason);
        }
      } catch (err) {
        setError("Failed to load dashboard data. Ensure backend is running.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Compute dynamic chart data from real backend response
  const dataArea = overview?.ingestion_trends?.map(t => ({
    name: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    candidates: t.count
  })).reverse() || [];

  const dataPie = overview?.sources?.map(s => ({
    name: s.source,
    value: s.count
  })) || [];

  const dataBar = referrals?.department_breakdown?.map(d => ({
    name: d.department || 'Unknown',
    referrals: d.count
  })) || [];

  const stats = [
    { name: 'Total Candidates', value: overview?.total_candidates || 0, icon: Users },
    { name: 'Active Referrals', value: referrals?.total_referrals || 0, icon: FileText },
    { name: 'Total Shortlists', value: overview?.total_shortlists || 0, icon: Briefcase },
    { name: 'Successful Hires', value: referrals?.total_hires || 0, icon: CheckCircle },
  ];

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-blue-700 border-l-transparent animate-spin glass"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Overview</h2>
          <p className="text-muted-foreground mt-1">Live data fetched from backend analytics.</p>
        </div>
        {error && <span className="text-red-400 text-sm">{error}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="glass-card p-6 flex items-center justify-between group hover-lift relative overflow-hidden"
          >
            <div className="absolute -inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 transition-opacity opacity-0 group-hover:opacity-100"></div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.name}</p>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center relative z-10 shadow-sm">
              <stat.icon className="w-6 h-6 text-indigo-400" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-2 glass-card p-6"
        >
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900">Daily Ingestion Trends</h3>
            <p className="text-sm text-slate-500">Number of candidate profiles processed per day</p>
          </div>
          <div className="h-80 w-full">
            {dataArea.length > 0 ? (
              <ResponsiveContainer>
                <AreaChart data={dataArea} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCandidates" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#64748b" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a' }}
                    itemStyle={{ color: '#0f172a' }}
                  />
                  <Area type="monotone" dataKey="candidates" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCandidates)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-slate-500 italic">No ingestion data available.</div>
            )}
          </div>
        </motion.div>

        {/* Donut Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="glass-card p-6 flex flex-col"
        >
          <div className="mb-4">
            <h3 className="text-xl font-bold text-slate-900">Ingestion Sources</h3>
            <p className="text-sm text-slate-500">Where candidates come from</p>
          </div>
          <div className="h-64 flex-1">
             {dataPie.length > 0 ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={dataPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {dataPie.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      itemStyle={{ color: '#0f172a' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 italic">No source data yet.</div>
            )}
          </div>
        </motion.div>

        {/* Bar Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="lg:col-span-3 glass-card p-6"
        >
           <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Referrals by Department</h3>
              <p className="text-sm text-slate-500">Total referrals submitted across teams</p>
            </div>
            {referrals?.success_rate > 0 && (
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">{referrals.success_rate}% Success Rate</span>
              </div>
            )}
          </div>
          <div className="h-72 w-full mt-4">
            {dataBar.length > 0 ? (
                <ResponsiveContainer>
                  <BarChart data={dataBar} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#64748b" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a' }}
                    />
                    <Legend iconType="circle" />
                    <Bar dataKey="referrals" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-slate-500 italic">No referral departments recorded.</div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
