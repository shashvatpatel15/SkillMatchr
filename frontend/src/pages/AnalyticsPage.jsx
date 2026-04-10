import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ComposedChart, Line,
} from 'recharts';
import {
  TrendingUp, Users, Briefcase, Target, Brain, Zap, Shield, Clock,
  Layers, Activity, FileText, CheckCircle, XCircle, AlertTriangle,
  BarChart3, Cpu, Database, GitBranch, Award, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../lib/api';

const COLORS = ['#3b82f6', '#8b5cf6', '#0ea5e9', '#14b8a6', '#f43f5e', '#f59e0b', '#84cc16', '#ec4899'];
const STATUS_COLORS = { completed: '#10b981', pending: '#f59e0b', failed: '#ef4444', merged: '#8b5cf6', needs_review: '#3b82f6', auto_merged: '#8b5cf6' };

/* ─── Primitives ──────────────────────────────────────── */

const Card = ({ children, className = '', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay }}
    className={`glass-card border border-slate-200/80 p-6 relative overflow-hidden group ${className}`}
  >
    <div className="absolute -inset-0 bg-gradient-to-br from-blue-600/3 to-purple-600/3 transition-opacity opacity-0 group-hover:opacity-100" />
    <div className="relative z-10">{children}</div>
  </motion.div>
);

const MetricCard = ({ label, value, subtitle, icon: Icon, gradient, progress, delay = 0 }) => (
  <Card delay={delay}>
    <div className="flex items-start justify-between mb-3">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      {progress !== undefined && (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${progress >= 80 ? 'bg-emerald-50 text-emerald-700' : progress >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
          {progress >= 80 ? '● Excellent' : progress >= 50 ? '● Good' : '● Needs Work'}
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
    <p className="text-sm font-semibold text-slate-700 mt-1">{label}</p>
    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    {progress !== undefined && (
      <div className="mt-3 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 1, delay: delay + 0.3 }}
          className={`h-full rounded-full ${progress >= 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : progress >= 50 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-red-400 to-rose-500'}`}
        />
      </div>
    )}
  </Card>
);

const SectionHeader = ({ icon: Icon, title, subtitle, gradient }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  </div>
);

/* ─── Main Component ──────────────────────────────────── */

export default function AnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [pipelineRuns, setPipelineRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    async function load() {
      try {
        const [ovRes, metricsRes, pipRes] = await Promise.allSettled([
          api.get('/api/analytics/overview'),
          api.get('/api/v1/metrics'),
          api.get('/api/v1/pipeline/runs?limit=20'),
        ]);
        if (ovRes.status === 'fulfilled') setOverview(ovRes.value.data);
        if (metricsRes.status === 'fulfilled') setMetrics(metricsRes.value.data);
        if (pipRes.status === 'fulfilled') setPipelineRuns(pipRes.value.data || []);
      } catch {
        setError('Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex h-[70vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-indigo-600 border-l-transparent animate-spin" />
        <p className="text-sm text-slate-500 animate-pulse">Analyzing pipeline data…</p>
      </div>
    </div>
  );

  if (error) return <div className="bg-red-50 text-red-600 p-5 rounded-xl border border-red-100 text-sm">{error}</div>;

  // ─── Derived data ───────────────────────────────────
  const trendData = overview?.ingestion_trends?.map(t => ({
    name: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    candidates: t.count,
  })).reverse() || [];

  const pieData = overview?.sources?.map(s => ({ name: s.source || 'Unknown', value: s.count })) || [];
  const statusData = overview?.status_breakdown?.map(s => ({ name: s.status, count: s.count })) || [];
  const expData = overview?.experience_breakdown?.map(e => ({ name: e.category, value: e.count })) || [];

  // Metrics
  const f1 = metrics?.parsing_accuracy?.f1_score || 0;
  const parsed = metrics?.parsing_accuracy?.successfully_parsed || 0;
  const totalProcessed = metrics?.parsing_accuracy?.total_processed || 0;
  const failedCount = metrics?.parsing_accuracy?.failed || 0;
  const ndcg = metrics?.matching_quality?.ndcg || 0;
  const correlation = metrics?.matching_quality?.expert_correlation || 0;
  const normRate = parseFloat(metrics?.normalization_precision?.canonical_mapping_rate || 0);
  const taxonomyCov = metrics?.normalization_precision?.taxonomy_coverage || '0%';
  const successRate = metrics?.orchestration_reliability?.success_rate || 0;
  const agentCount = metrics?.orchestration_reliability?.agent_count || 0;
  const totalPipelineRuns = metrics?.orchestration_reliability?.total_pipeline_runs || 0;
  const avgLatency = metrics?.latency?.avg_agent_latency_ms || 0;
  const p95Latency = metrics?.latency?.p95_estimate_ms || 0;
  const targetLatency = metrics?.latency?.target_e2e_ms || 10000;
  const totalEndpoints = metrics?.api_completeness?.total_endpoints || 0;
  const authMethods = metrics?.api_completeness?.auth_methods || [];

  // Radar chart data for overall quality
  const radarData = [
    { metric: 'Parsing', value: f1 * 100, fullMark: 100 },
    { metric: 'Matching', value: ndcg * 100, fullMark: 100 },
    { metric: 'Normalization', value: normRate * 100, fullMark: 100 },
    { metric: 'Reliability', value: successRate, fullMark: 100 },
    { metric: 'Latency', value: Math.min(100, (targetLatency / Math.max(p95Latency, 1)) * 50), fullMark: 100 },
    { metric: 'API Coverage', value: Math.min(100, (totalEndpoints / 14) * 100), fullMark: 100 },
  ];

  // Agent stats from pipeline runs
  const agentStats = {};
  pipelineRuns.forEach(run => {
    (run.traces || []).forEach(trace => {
      if (!agentStats[trace.agent_name]) agentStats[trace.agent_name] = { total: 0, success: 0, failed: 0, totalLatency: 0, maxLatency: 0 };
      const s = agentStats[trace.agent_name];
      s.total += 1;
      if (trace.status === 'success') s.success += 1;
      else s.failed += 1;
      s.totalLatency += (trace.latency_ms || 0);
      s.maxLatency = Math.max(s.maxLatency, trace.latency_ms || 0);
    });
  });

  const agentRows = Object.entries(agentStats).map(([name, s]) => ({
    name: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    rawName: name,
    runs: s.total,
    successRate: s.total > 0 ? Math.round((s.success / s.total) * 100) : 0,
    avgLatency: s.total > 0 ? Math.round(s.totalLatency / s.total) : 0,
    maxLatency: s.maxLatency,
    failed: s.failed,
  }));

  // Cumulative ingestion data
  let cumulative = 0;
  const cumulativeData = trendData.map(t => {
    cumulative += t.candidates;
    return { ...t, cumulative };
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'parsing', label: 'Parsing & Normalization', icon: FileText },
    { id: 'matching', label: 'Matching Quality', icon: Target },
    { id: 'orchestration', label: 'Orchestration', icon: GitBranch },
    { id: 'api', label: 'API & Infra', icon: Database },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Comprehensive Analytics</h2>
          <p className="text-slate-500 text-sm mt-1">Full pipeline evaluation — parsing, normalization, matching, orchestration & API metrics</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════ OVERVIEW TAB ═══════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Parsing Accuracy" value={`${(f1 * 100).toFixed(1)}%`} subtitle="Field-level F1 score" icon={Target} gradient="from-blue-500 to-blue-600" progress={f1 * 100} delay={0} />
            <MetricCard label="Matching Quality" value={`${(ndcg * 100).toFixed(1)}%`} subtitle="NDCG ranking score" icon={Layers} gradient="from-violet-500 to-purple-600" progress={ndcg * 100} delay={0.05} />
            <MetricCard label="Pipeline Reliability" value={`${successRate}%`} subtitle={`${totalPipelineRuns} total runs`} icon={Shield} gradient="from-emerald-500 to-teal-600" progress={successRate} delay={0.1} />
            <MetricCard label="E2E Latency" value={p95Latency > 0 ? `${(p95Latency / 1000).toFixed(1)}s` : '< 10s'} subtitle="P95 single resume" icon={Zap} gradient="from-amber-500 to-orange-500" progress={Math.min(100, (targetLatency / Math.max(p95Latency, 1)) * 70)} delay={0.15} />
          </div>

          {/* Radar + Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card delay={0.15} className="lg:col-span-2">
              <SectionHeader icon={TrendingUp} title="Ingestion Pipeline Trends" subtitle="Daily and cumulative candidate processing" gradient="from-blue-500 to-indigo-600" />
              <div className="h-72">
                {cumulativeData.length > 0 ? (
                  <ResponsiveContainer>
                    <ComposedChart data={cumulativeData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: '#8b5cf6', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                      <Legend iconType="circle" />
                      <Area yAxisId="left" type="monotone" dataKey="candidates" name="Daily" stroke="#3b82f6" strokeWidth={2} fill="url(#aGrad)" />
                      <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Cumulative" stroke="#8b5cf6" strokeWidth={2} dot={false} strokeDasharray="4 3" />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-slate-400 italic">Upload resumes to see trends</div>}
              </div>
            </Card>

            <Card delay={0.2}>
              <SectionHeader icon={Award} title="Quality Radar" subtitle="Multi-dimensional quality assessment" gradient="from-indigo-500 to-purple-600" />
              <div className="h-72">
                <ResponsiveContainer>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={90}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Radar name="Score" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Sources + Status + Experience */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card delay={0.25}>
              <h4 className="font-bold text-slate-900 mb-1">Sources Distribution</h4>
              <p className="text-xs text-slate-500 mb-3">Where candidates come from</p>
              <div className="h-52">
                {pieData.length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value" stroke="none">
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px' }} />
                      <Legend verticalAlign="bottom" height={32} iconType="circle" iconSize={8} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">No source data</div>}
              </div>
            </Card>

            <Card delay={0.3}>
              <h4 className="font-bold text-slate-900 mb-1">Processing Status</h4>
              <p className="text-xs text-slate-500 mb-3">Pipeline output breakdown</p>
              <div className="h-52">
                {statusData.length > 0 ? (
                  <ResponsiveContainer>
                    <BarChart data={statusData} layout="vertical" margin={{ left: 5, right: 15 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} width={85} />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px' }} />
                      <Bar dataKey="count" radius={[0, 5, 5, 0]}>
                        {statusData.map((e, i) => <Cell key={i} fill={STATUS_COLORS[e.name] || '#94a3b8'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">No status data</div>}
              </div>
            </Card>

            <Card delay={0.35}>
              <h4 className="font-bold text-slate-900 mb-1">Talent Seniority</h4>
              <p className="text-xs text-slate-500 mb-3">Experience level spread</p>
              <div className="h-52">
                {expData.some(d => d.value > 0) ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={expData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                        {expData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px' }} />
                      <Legend verticalAlign="bottom" height={32} iconType="circle" iconSize={8} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">No experience data</div>}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ═══════ PARSING & NORMALIZATION TAB ═══════ */}
      {activeTab === 'parsing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard label="F1 Score" value={`${(f1 * 100).toFixed(1)}%`} subtitle="Resume field extraction accuracy" icon={Target} gradient="from-blue-500 to-blue-600" progress={f1 * 100} delay={0} />
            <MetricCard label="Normalization Rate" value={`${(normRate * 100).toFixed(0)}%`} subtitle="Skills correctly mapped to canonical entries" icon={Brain} gradient="from-violet-500 to-purple-600" progress={normRate * 100} delay={0.05} />
            <MetricCard label="Taxonomy Coverage" value={taxonomyCov} subtitle="Skills recognized in taxonomy" icon={Layers} gradient="from-teal-500 to-emerald-600" progress={parseInt(taxonomyCov)} delay={0.1} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card delay={0.15}>
              <SectionHeader icon={FileText} title="Parsing Pipeline" subtitle="Multi-format extraction accuracy" gradient="from-blue-500 to-indigo-600" />
              <div className="space-y-4">
                {[
                  { label: 'Total Processed', value: totalProcessed, icon: Users, color: 'text-slate-700' },
                  { label: 'Successfully Parsed', value: parsed, icon: CheckCircle, color: 'text-emerald-600' },
                  { label: 'Failed / Needs Review', value: failedCount, icon: XCircle, color: 'text-red-500' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                      <span className="text-sm font-medium text-slate-700">{item.label}</span>
                    </div>
                    <span className={`text-lg font-bold ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                <p className="text-xs font-semibold text-blue-800 mb-2">Extraction Pipeline</p>
                <div className="flex items-center gap-2 text-xs text-blue-700">
                  <span className="px-2 py-1 bg-blue-100 rounded-lg font-medium">PDF/DOCX/TXT</span>
                  <span>→</span>
                  <span className="px-2 py-1 bg-blue-100 rounded-lg font-medium">pdfplumber + pdfminer</span>
                  <span>→</span>
                  <span className="px-2 py-1 bg-blue-100 rounded-lg font-medium">Gemini 2.0 Flash</span>
                  <span>→</span>
                  <span className="px-2 py-1 bg-blue-100 rounded-lg font-medium">Structured Data</span>
                </div>
              </div>
            </Card>

            <Card delay={0.2}>
              <SectionHeader icon={Brain} title="Skill Normalization Agent" subtitle="Taxonomy mapping & inference" gradient="from-violet-500 to-purple-600" />
              <div className="space-y-3">
                {[
                  { label: 'Synonym Resolution', desc: 'JS→JavaScript, K8s→Kubernetes, etc.', status: 'Active', count: '95+ mappings' },
                  { label: 'Hierarchy Inference', desc: 'TensorFlow implies Deep Learning + ML', status: 'Active', count: '30+ rules' },
                  { label: 'Proficiency Estimation', desc: 'Context-aware from experience entries', status: 'Active', count: '4 levels' },
                  { label: 'Fuzzy Matching', desc: 'thefuzz token_sort_ratio ≥ 80%', status: 'Active', count: 'Auto' },
                  { label: 'Emerging Skill Detection', desc: 'Unknown skills flagged for review', status: 'Active', count: 'Real-time' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50/70 rounded-xl hover:bg-slate-100/70 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{item.status}</span>
                      <p className="text-xs text-slate-500 mt-1">{item.count}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ═══════ MATCHING QUALITY TAB ═══════ */}
      {activeTab === 'matching' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard label="NDCG Score" value={`${(ndcg * 100).toFixed(1)}%`} subtitle="Normalized discounted cumulative gain" icon={Target} gradient="from-violet-500 to-purple-600" progress={ndcg * 100} delay={0} />
            <MetricCard label="Expert Correlation" value={`${(correlation * 100).toFixed(0)}%`} subtitle="Alignment with expert rankings" icon={Award} gradient="from-indigo-500 to-blue-600" progress={correlation * 100} delay={0.05} />
            <MetricCard label="Composite Scoring" value="4 Signals" subtitle="Semantic + Skill + Experience + Title" icon={Layers} gradient="from-teal-500 to-emerald-600" delay={0.1} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card delay={0.15}>
              <SectionHeader icon={Target} title="Matching Algorithm" subtitle="How candidates are scored against jobs" gradient="from-violet-500 to-purple-600" />
              <div className="space-y-3 mt-2">
                {[
                  { signal: 'Semantic Similarity', weight: '50%', desc: 'ChromaDB cosine similarity via sentence-transformers', color: 'from-blue-500 to-blue-600' },
                  { signal: 'Skill Overlap', weight: '25%', desc: 'Normalized intersection of required/nice-to-have skills', color: 'from-violet-500 to-purple-600' },
                  { signal: 'Experience Match', weight: '15%', desc: 'Years of experience ratio vs. requirement', color: 'from-emerald-500 to-teal-600' },
                  { signal: 'Title Relevance', weight: '10%', desc: 'Keyword overlap between job title and candidate title', color: 'from-amber-500 to-orange-500' },
                ].map((item, i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-white transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-800">{item.signal}</span>
                      <span className={`text-xs font-bold bg-gradient-to-r ${item.color} text-white px-2.5 py-0.5 rounded-full`}>{item.weight}</span>
                    </div>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                    <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${item.color}`} style={{ width: item.weight }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card delay={0.2}>
              <SectionHeader icon={Activity} title="Two-Pass Strategy" subtitle="Semantic pass + non-semantic fallback" gradient="from-blue-500 to-cyan-600" />
              <div className="space-y-4 mt-2">
                <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">Pass 1</span>
                    <span className="text-sm font-semibold text-blue-900">Semantic Vector Search</span>
                  </div>
                  <p className="text-xs text-blue-800">Query ChromaDB for top-N nearest neighbors using job description embedding. Retrieves candidates with highest cosine similarity.</p>
                </div>
                <div className="p-4 bg-violet-50/60 rounded-xl border border-violet-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold bg-violet-600 text-white px-2 py-0.5 rounded-full">Pass 2</span>
                    <span className="text-sm font-semibold text-violet-900">Non-Semantic Fallback</span>
                  </div>
                  <p className="text-xs text-violet-800">Batch-load remaining candidate embeddings, compute skill overlap, experience match, and title relevance. Ensures no qualified candidate is missed.</p>
                </div>
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">Output</span>
                    <span className="text-sm font-semibold text-emerald-900">Gap Analysis + Upskilling</span>
                  </div>
                  <p className="text-xs text-emerald-800">Missing skills identified with importance weighting. Personalized upskilling paths suggested for each gap.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ═══════ ORCHESTRATION TAB ═══════ */}
      {activeTab === 'orchestration' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard label="Success Rate" value={`${successRate}%`} subtitle="Pipeline completion rate" icon={Shield} gradient="from-emerald-500 to-teal-600" progress={successRate} delay={0} />
            <MetricCard label="Total Runs" value={totalPipelineRuns} subtitle="Pipeline executions" icon={Activity} gradient="from-blue-500 to-blue-600" delay={0.05} />
            <MetricCard label="Active Agents" value={agentCount} subtitle="LangGraph nodes" icon={Cpu} gradient="from-purple-500 to-purple-600" delay={0.1} />
            <MetricCard label="Avg Agent Latency" value={`${avgLatency}ms`} subtitle="Per-agent average" icon={Clock} gradient="from-amber-500 to-orange-500" delay={0.15} />
          </div>

          {/* Agent Performance Table */}
          <Card delay={0.2}>
            <SectionHeader icon={Cpu} title="Per-Agent Performance" subtitle="Execution metrics for each agent in the pipeline" gradient="from-purple-500 to-indigo-600" />
            {agentRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-3 px-4 text-left font-semibold text-slate-600">Agent</th>
                      <th className="py-3 px-4 text-center font-semibold text-slate-600">Runs</th>
                      <th className="py-3 px-4 text-center font-semibold text-slate-600">Success</th>
                      <th className="py-3 px-4 text-center font-semibold text-slate-600">Failed</th>
                      <th className="py-3 px-4 text-center font-semibold text-slate-600">Avg Latency</th>
                      <th className="py-3 px-4 text-center font-semibold text-slate-600">Max Latency</th>
                      <th className="py-3 px-4 text-left font-semibold text-slate-600">Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentRows.map((a, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${a.successRate >= 90 ? 'bg-emerald-500' : a.successRate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} />
                            <span className="font-medium text-slate-800">{a.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-600">{a.runs}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-semibold text-emerald-600">{a.successRate}%</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={a.failed > 0 ? 'text-red-600 font-semibold' : 'text-slate-400'}>{a.failed}</span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-600">{a.avgLatency}ms</td>
                        <td className="py-3 px-4 text-center text-slate-600">{a.maxLatency}ms</td>
                        <td className="py-3 px-4">
                          <div className="w-full max-w-[100px] h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${a.successRate >= 90 ? 'bg-emerald-500' : a.successRate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${a.successRate}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 italic text-sm">No agent trace data — upload resumes to generate pipeline runs</div>
            )}
          </Card>

          {/* Pipeline Architecture */}
          <Card delay={0.25}>
            <SectionHeader icon={GitBranch} title="LangGraph Pipeline Architecture" subtitle="Multi-agent orchestration flow" gradient="from-blue-500 to-indigo-600" />
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {[
                { name: 'Text Extraction', color: 'bg-blue-100 text-blue-800 border-blue-200' },
                { name: 'LLM Parsing (Gemini/Groq)', color: 'bg-violet-100 text-violet-800 border-violet-200' },
                { name: 'Embedding Generation', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
                { name: 'Skill Normalization', color: 'bg-purple-100 text-purple-800 border-purple-200' },
                { name: 'Dedup Detection', color: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200' },
                { name: 'DB Persist + ChromaDB', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
              ].map((step, i) => (
                <React.Fragment key={i}>
                  <span className={`px-3 py-2 rounded-xl text-xs font-bold border ${step.color}`}>{step.name}</span>
                  {i < 5 && <span className="text-slate-300 text-lg">→</span>}
                </React.Fragment>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs">
                <p className="font-bold text-blue-800 mb-1">Graceful Degradation</p>
                <p className="text-blue-700">If parsing fails, candidate saved as "needs_review" — partial results always returned</p>
              </div>
              <div className="p-3 bg-violet-50/50 rounded-xl border border-violet-100 text-xs">
                <p className="font-bold text-violet-800 mb-1">LLM Fallback Chain</p>
                <p className="text-violet-700">Gemini 2.0 Flash → Groq Llama 3.3 70B — automatic fallback if primary fails</p>
              </div>
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs">
                <p className="font-bold text-emerald-800 mb-1">Concurrent Processing</p>
                <p className="text-emerald-700">Parse + Embed run in parallel via asyncio.gather. Batch uploads with semaphore throttling.</p>
              </div>
            </div>
          </Card>

          {/* Recent Runs */}
          {pipelineRuns.length > 0 && (
            <Card delay={0.3}>
              <SectionHeader icon={BarChart3} title="Recent Pipeline Runs" subtitle={`Last ${pipelineRuns.length} executions`} gradient="from-blue-500 to-cyan-600" />
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {pipelineRuns.map((run, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-slate-50/70 hover:bg-slate-100/70 transition-colors">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${run.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{run.run_id}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs shrink-0">
                      <span className="text-slate-500">{run.traces?.length || 0} agents</span>
                      <span className="font-medium text-slate-700">{run.total_latency_ms}ms</span>
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${run.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                        {run.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ═══════ API & INFRA TAB ═══════ */}
      {activeTab === 'api' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard label="API Endpoints" value={totalEndpoints} subtitle="Fully documented with OpenAPI" icon={Database} gradient="from-blue-500 to-blue-600" delay={0} />
            <MetricCard label="Auth Methods" value={authMethods.length} subtitle={authMethods.join(' + ') || 'JWT + API Key'} icon={Shield} gradient="from-emerald-500 to-teal-600" delay={0.05} />
            <MetricCard label="Vector DB" value="ChromaDB" subtitle="Persistent local, cosine similarity" icon={Brain} gradient="from-violet-500 to-purple-600" delay={0.1} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card delay={0.15}>
              <SectionHeader icon={Database} title="V1 API Endpoints" subtitle="Production REST API for third-party integration" gradient="from-blue-500 to-indigo-600" />
              <div className="space-y-2">
                {[
                  { method: 'POST', path: '/api/v1/parse', desc: 'Single resume parsing' },
                  { method: 'POST', path: '/api/v1/parse/batch', desc: 'Batch resume processing' },
                  { method: 'GET', path: '/api/v1/parse/batch/{id}', desc: 'Batch job status' },
                  { method: 'GET', path: '/api/v1/candidates/{id}/skills', desc: 'Skill profile' },
                  { method: 'POST', path: '/api/v1/match', desc: 'Semantic job matching' },
                  { method: 'GET', path: '/api/v1/skills/taxonomy', desc: 'Taxonomy browsing' },
                  { method: 'POST', path: '/api/v1/webhooks', desc: 'Webhook subscription' },
                  { method: 'POST', path: '/api/v1/api-keys', desc: 'Create API key' },
                  { method: 'GET', path: '/api/v1/pipeline/runs', desc: 'Pipeline observability' },
                  { method: 'GET', path: '/api/v1/metrics', desc: 'Evaluation metrics' },
                ].map((ep, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50/70 hover:bg-slate-100 transition-colors text-xs">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-white ${ep.method === 'POST' ? 'bg-emerald-600' : 'bg-blue-600'}`}>{ep.method}</span>
                    <code className="font-mono text-slate-700 flex-1">{ep.path}</code>
                    <span className="text-slate-500">{ep.desc}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card delay={0.2}>
              <SectionHeader icon={Layers} title="Technology Stack" subtitle="Infrastructure and dependencies" gradient="from-violet-500 to-purple-600" />
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'FastAPI', desc: 'REST API + OpenAPI docs', icon: '⚡' },
                  { name: 'LangGraph', desc: 'Multi-agent orchestration', icon: '🔗' },
                  { name: 'ChromaDB', desc: 'Vector embeddings store', icon: '🧠' },
                  { name: 'PostgreSQL', desc: 'Primary database', icon: '🐘' },
                  { name: 'Gemini 2.0 Flash', desc: 'Primary LLM parser', icon: '💎' },
                  { name: 'Groq Llama 3.3', desc: 'Fallback LLM', icon: '🦙' },
                  { name: 'sentence-transformers', desc: 'Embedding generation', icon: '📐' },
                  { name: 'Redis', desc: 'Caching layer', icon: '🔴' },
                  { name: 'React + Vite', desc: 'Frontend framework', icon: '⚛️' },
                  { name: 'Alembic', desc: 'DB migrations', icon: '🔄' },
                ].map((tech, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 hover:bg-white transition-colors border border-transparent hover:border-slate-200">
                    <span className="text-lg">{tech.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{tech.name}</p>
                      <p className="text-xs text-slate-500">{tech.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
