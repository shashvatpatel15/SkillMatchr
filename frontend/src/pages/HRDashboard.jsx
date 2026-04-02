import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, Users, Briefcase, CheckSquare, Search, 
  TrendingUp, AlertTriangle, ChevronRight, Sparkles, 
  Clock, ArrowRight 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

const QUICK_ACTIONS = [
  { name: 'Batch Ingest', desc: 'Process multiple resumes', icon: Upload, path: '/ingest', gradient: 'from-blue-500 to-cyan-400' },
  { name: 'AI Sourcing', desc: 'Semantic semantic match', icon: Search, path: '/search', gradient: 'from-indigo-500 to-purple-500' },
  { name: 'Open Reqs', desc: 'Manage active jobs', icon: Briefcase, path: '/jobs', gradient: 'from-emerald-500 to-teal-400' },
  { name: 'Dedup Check', desc: 'Clear duplicate profiles', icon: CheckSquare, path: '/dedup', gradient: 'from-amber-500 to-orange-400' },
];

export default function HRDashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [dedup, setDedup] = useState([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('Welcome back');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    async function fetchHRData() {
      try {
        const [overviewRes, dedupRes] = await Promise.allSettled([
          api.get('/api/analytics/overview'),
          api.get('/api/dedup/queue?status_filter=pending&limit=4')
        ]);
        
        if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value.data);
        if (dedupRes.status === 'fulfilled') setDedup(dedupRes.value.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchHRData();
  }, []);

  const dataArea = overview?.ingestion_trends?.map(t => ({
    name: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    processed: t.count
  })).reverse() || [];

  const dataSources = overview?.sources?.map(s => ({
    name: s.source,
    value: s.count
  })).slice(0, 4) || [];

  const sourceColors = ['#4f46e5', '#0ea5e9', '#ec4899', '#f59e0b'];

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-10 h-10 border-4 border-t-indigo-600 border-indigo-100 rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-widest rounded-full border border-indigo-100">
              Workspace
            </span>
            <span className="text-sm font-medium text-slate-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </motion.div>
          <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-4xl font-extrabold tracking-tight text-slate-900">
            {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{user?.full_name?.split(' ')[0] || 'Team'}</span>
          </motion.h2>
          <p className="text-slate-500 mt-2 text-base">Here is what's happening with your talent pipeline today.</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200/60">
          <button className="px-4 py-2 bg-slate-100 text-slate-900 rounded-lg text-sm font-medium shadow-sm transition">30 Days</button>
          <button className="px-4 py-2 text-slate-500 hover:text-slate-900 rounded-lg text-sm font-medium transition">90 Days</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Total Candidates', value: overview?.total_candidates || 0, change: '+12%', trend: 'up', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending Dedup', value: dedup?.length || 0, change: 'Requires Action', trend: 'neutral', icon: CheckSquare, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Active Shortlists', value: overview?.total_shortlists || 0, change: '+3%', trend: 'up', icon: Briefcase, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Avg Process Time', value: '1.2s', change: '-15%', trend: 'down', icon: Zap, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="glass-card p-6 border border-slate-200/60 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-[0.04] group-hover:opacity-[0.08] transition-opacity ${kpi.color.replace('text-', 'bg-')}`} />
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className={`p-3 rounded-2xl ${kpi.bg} ${kpi.color}`}>
                <kpi.icon className="w-6 h-6" />
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${kpi.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : kpi.trend === 'down' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                {kpi.change}
              </span>
            </div>
            <div className="relative z-10">
              <h4 className="text-3xl font-extrabold text-slate-900 tracking-tight">{kpi.value}</h4>
              <p className="text-sm font-medium text-slate-500 mt-1 uppercase tracking-wider">{kpi.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart */}
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
          className="col-span-2 glass-card p-7 border border-slate-200/60 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-bold text-xl text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Ingestion Volume
              </h3>
              <p className="text-sm text-slate-500 mt-1">Candidates imported automatically via integrations.</p>
            </div>
          </div>
          <div className="h-[300px] w-full flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataArea} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProcessed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="processed" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorProcessed)" activeDot={{ r: 6, fill: '#4f46e5', stroke: '#fff', strokeWidth: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Action Required Panel */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
          className="col-span-1 flex flex-col gap-6">
          
          <div className="glass-card p-6 border-l-4 border-l-amber-500 flex-grow bg-gradient-to-b from-white to-amber-50/20">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Priorities
              </h3>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{dedup?.length || 0} Pending</span>
            </div>
            
            {dedup?.length > 0 ? (
              <div className="space-y-3">
                {dedup.map(item => (
                  <div key={item.id} className="group p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-amber-200 transition-all cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{item.candidate_a_name}</p>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-1 rounded w-fit">
                        Match: {(item.composite_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Automatically flagged
                      </p>
                      <Link to="/dedup" className="text-amber-600 p-1.5 bg-amber-50 rounded-lg hover:bg-amber-100 transition">
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                <Sparkles className="w-10 h-10 mb-3 text-amber-300" />
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs text-slate-400 mt-1">No duplicates require attention.</p>
              </div>
            )}
            
            <Link to="/dedup" className="mt-4 block text-center text-sm font-semibold text-indigo-600 hover:text-indigo-700 py-3 rounded-xl hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100">
              Open Resolution Queue
            </Link>
          </div>

        </motion.div>
      </div>

      {/* Quick Launchpad */}
      <div>
        <h3 className="font-bold text-xl text-slate-900 mb-5">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action, i) => (
            <Link key={action.name} to={action.path}>
              <motion.div
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + (i * 0.1) }}
                className="relative overflow-hidden glass-card p-6 group hover-lift cursor-pointer border border-slate-200/60"
              >
                <div className={`absolute top-0 right-0 w-24 h-24 -mr-12 -mt-12 bg-gradient-to-br ${action.gradient} opacity-10 rounded-full group-hover:scale-150 transition-transform duration-500`} />
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br ${action.gradient} text-white shadow-md group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-1 flex items-center justify-between">
                  {action.name}
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0" />
                </h3>
                <p className="text-sm text-slate-500">{action.desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// simple inline icon since we don't have Zap exported automatically above safely
function Zap(props) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>;
}
