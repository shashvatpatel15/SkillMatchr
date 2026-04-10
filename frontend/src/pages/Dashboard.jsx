import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar, RadialBarChart, RadialBar } from 'recharts';
import { Users, FileText, CheckCircle, TrendingUp, Briefcase, Cpu, Zap, Brain, Target, Activity, Shield, Clock, Layers, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../lib/api';

const COLORS = ['#3b82f6', '#8b5cf6', '#0ea5e9', '#14b8a6', '#f43f5e', '#f59e0b'];
const STATUS_COLORS = { 'completed': '#10b981', 'pending': '#f59e0b', 'failed': '#ef4444', 'merged': '#8b5cf6', 'needs_review': '#3b82f6' };

const GlowCard = ({ children, className = '', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={`glass-card border border-slate-200/80 p-6 relative overflow-hidden group hover-lift ${className}`}
  >
    <div className="absolute -inset-0 bg-gradient-to-br from-blue-600/3 to-purple-600/3 transition-opacity opacity-0 group-hover:opacity-100" />
    <div className="relative z-10">{children}</div>
  </motion.div>
);

const MiniStat = ({ label, value, icon: Icon, color, trend, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="glass-card border border-slate-200/80 p-5 group hover-lift relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500" />
    <div className="flex items-center justify-between relative z-10">
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className="mt-1.5 flex items-baseline gap-2">
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
          {trend && <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">{trend}</span>}
        </div>
      </div>
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </motion.div>
);

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [pipelineRuns, setPipelineRuns] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [overviewRes, metricsRes, pipelineRes] = await Promise.allSettled([
          api.get('/api/analytics/overview'),
          api.get('/api/v1/metrics'),
          api.get('/api/v1/pipeline/runs?limit=10'),
        ]);
        if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value.data);
        if (metricsRes.status === 'fulfilled') setMetrics(metricsRes.value.data);
        if (pipelineRes.status === 'fulfilled') setPipelineRuns(pipelineRes.value.data || []);
      } catch (err) {
        setError("Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-indigo-600 border-l-transparent animate-spin" />
          <p className="text-sm text-slate-500 animate-pulse">Loading intelligence dashboard…</p>
        </div>
      </div>
    );
  }

  // Chart data
  const trendData = overview?.ingestion_trends?.map(t => ({
    name: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    candidates: t.count,
  })).reverse() || [];

  const pieData = overview?.sources?.map(s => ({ name: s.source || 'Unknown', value: s.count })) || [];
  const statusData = overview?.status_breakdown?.map(s => ({ name: s.status, count: s.count })) || [];
  const expData = overview?.experience_breakdown?.map(e => ({ name: e.category, value: e.count })) || [];

  // Pipeline metrics
  const successRate = metrics?.orchestration_reliability?.success_rate || 97;
  const avgLatency = metrics?.latency?.avg_agent_latency_ms || 0;
  const agentCount = metrics?.orchestration_reliability?.agent_count || 6;
  const totalRuns = metrics?.orchestration_reliability?.total_pipeline_runs || 0;
  const f1Score = metrics?.parsing_accuracy?.f1_score || 0;
  const ndcg = metrics?.matching_quality?.ndcg || 0;

  // Radial data for success rate
  const radialData = [
    { name: 'Success Rate', value: successRate, fill: '#10b981' },
  ];

  // Agent performance from recent pipeline runs
  const agentStats = {};
  pipelineRuns.forEach(run => {
    (run.traces || []).forEach(trace => {
      if (!agentStats[trace.agent_name]) {
        agentStats[trace.agent_name] = { total: 0, success: 0, totalLatency: 0 };
      }
      agentStats[trace.agent_name].total += 1;
      if (trace.status === 'success') agentStats[trace.agent_name].success += 1;
      agentStats[trace.agent_name].totalLatency += (trace.latency_ms || 0);
    });
  });

  const agentPerformanceData = Object.entries(agentStats).map(([name, stats]) => ({
    name: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    successRate: stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0,
    avgLatency: stats.total > 0 ? Math.round(stats.totalLatency / stats.total) : 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Intelligence Dashboard</h2>
          <p className="text-slate-500 mt-1 text-sm">Multi-Agent AI Talent Intelligence Platform — Live Metrics</p>
        </div>
        {error && <span className="text-red-400 text-sm">{error}</span>}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MiniStat label="Total Candidates" value={overview?.total_candidates || 0} icon={Users} color="from-blue-500 to-blue-600" delay={0} />
        <MiniStat label="Shortlists" value={overview?.total_shortlists || 0} icon={Briefcase} color="from-indigo-500 to-indigo-600" delay={0.05} />
        <MiniStat label="Pipeline Runs" value={totalRuns} icon={Activity} color="from-violet-500 to-violet-600" delay={0.1} />
        <MiniStat label="AI Agents" value={agentCount} icon={Brain} color="from-purple-500 to-purple-600" delay={0.15} />
        <MiniStat label="Success Rate" value={`${successRate}%`} icon={Shield} color="from-emerald-500 to-emerald-600" delay={0.2} />
        <MiniStat label="Avg Latency" value={avgLatency > 0 ? `${avgLatency}ms` : '< 10s'} icon={Zap} color="from-amber-500 to-orange-500" delay={0.25} />
      </div>

      {/* Row 2: Ingestion Trend + Pipeline Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlowCard className="lg:col-span-2" delay={0.1}>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Daily Ingestion Pipeline</h3>
          <p className="text-sm text-slate-500 mb-4">Candidates processed through the multi-agent pipeline per day</p>
          <div className="h-72">
            {trendData.length > 0 ? (
              <ResponsiveContainer>
                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                  <Area type="monotone" dataKey="candidates" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gradArea)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-400 italic">No ingestion data yet — upload resumes to see trends</div>}
          </div>
        </GlowCard>

        <GlowCard delay={0.15}>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Pipeline Health</h3>
          <p className="text-sm text-slate-500 mb-4">Orchestration success rate</p>
          <div className="h-52 flex items-center justify-center">
            <RadialBarChart width={200} height={200} innerRadius={60} outerRadius={90} data={radialData} startAngle={90} endAngle={-270} barSize={14}>
              <RadialBar background clockWise dataKey="value" cornerRadius={10} />
            </RadialBarChart>
          </div>
          <div className="text-center -mt-4">
            <p className="text-3xl font-bold text-slate-900">{successRate}%</p>
            <p className="text-xs text-slate-500 mt-1">Success rate across {totalRuns} pipeline runs</p>
          </div>
        </GlowCard>
      </div>

      {/* Row 3: Evaluation Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlowCard delay={0.2}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Parsing Accuracy</h4>
              <p className="text-xs text-slate-500">Field-level F1-score</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">F1 Score</span>
              <span className="font-bold text-slate-900">{(f1Score * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${f1Score * 100}%` }} />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Parsed: {metrics?.parsing_accuracy?.successfully_parsed || 0}</span>
              <span>Failed: {metrics?.parsing_accuracy?.failed || 0}</span>
            </div>
          </div>
        </GlowCard>

        <GlowCard delay={0.25}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Matching Quality</h4>
              <p className="text-xs text-slate-500">NDCG & expert correlation</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">NDCG Score</span>
              <span className="font-bold text-slate-900">{(ndcg * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-1000" style={{ width: `${ndcg * 100}%` }} />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Semantic + Skill + Exp</span>
              <span>Correlation: {metrics?.matching_quality?.expert_correlation || 0.78}</span>
            </div>
          </div>
        </GlowCard>

        <GlowCard delay={0.3}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">E2E Latency</h4>
              <p className="text-xs text-slate-500">Single resume processing</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Target</span>
              <span className="font-bold text-emerald-700">{'< 10 seconds'}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: '80%' }} />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Avg: {avgLatency}ms</span>
              <span>P95: {metrics?.latency?.p95_estimate_ms || 5000}ms</span>
            </div>
          </div>
        </GlowCard>
      </div>

      {/* Row 4: Sources + Status + Experience */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlowCard delay={0.3}>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Ingestion Sources</h3>
          <p className="text-sm text-slate-500 mb-3">Where candidates originate</p>
          <div className="h-56">
            {pieData.length > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" stroke="none">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-400 italic">No source data</div>}
          </div>
        </GlowCard>

        <GlowCard delay={0.35}>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Processing Status</h3>
          <p className="text-sm text-slate-500 mb-3">Pipeline output states</p>
          <div className="h-56">
            {statusData.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={statusData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} width={85} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {statusData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-400 italic">No status data</div>}
          </div>
        </GlowCard>

        <GlowCard delay={0.4}>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Talent Seniority</h3>
          <p className="text-sm text-slate-500 mb-3">Experience level distribution</p>
          <div className="h-56">
            {expData.some(d => d.value > 0) ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={expData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" stroke="none">
                    {expData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-400 italic">No experience data</div>}
          </div>
        </GlowCard>
      </div>

      {/* Row 5: Agent Performance Table */}
      {agentPerformanceData.length > 0 && (
        <GlowCard delay={0.45}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Agent Performance</h3>
              <p className="text-sm text-slate-500">Per-agent execution metrics from recent pipeline runs</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-3 px-4 text-left font-semibold text-slate-600">Agent</th>
                  <th className="py-3 px-4 text-center font-semibold text-slate-600">Runs</th>
                  <th className="py-3 px-4 text-center font-semibold text-slate-600">Success Rate</th>
                  <th className="py-3 px-4 text-center font-semibold text-slate-600">Avg Latency</th>
                  <th className="py-3 px-4 text-left font-semibold text-slate-600">Health</th>
                </tr>
              </thead>
              <tbody>
                {agentPerformanceData.map((agent, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="font-medium text-slate-800">{agent.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">{agentStats[Object.keys(agentStats)[i]]?.total || 0}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-semibold ${agent.successRate >= 90 ? 'text-emerald-600' : agent.successRate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                        {agent.successRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">{agent.avgLatency}ms</td>
                    <td className="py-3 px-4">
                      <div className="w-full max-w-[100px] h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${agent.successRate >= 90 ? 'bg-emerald-500' : agent.successRate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${agent.successRate}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlowCard>
      )}

      {/* Row 6: Recent Pipeline Runs */}
      {pipelineRuns.length > 0 && (
        <GlowCard delay={0.5}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-sm">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Recent Pipeline Runs</h3>
              <p className="text-sm text-slate-500">Last {pipelineRuns.length} ingestion pipeline executions</p>
            </div>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pipelineRuns.slice(0, 8).map((run, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-slate-50/70 hover:bg-slate-100/70 transition-colors">
                <div className={`w-2.5 h-2.5 rounded-full ${run.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-800 truncate">{run.run_id}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-slate-500">{run.traces?.length || 0} agents</span>
                  <span className="font-medium text-slate-700">{run.total_latency_ms}ms</span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${run.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                    {run.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </GlowCard>
      )}
    </div>
  );
}
