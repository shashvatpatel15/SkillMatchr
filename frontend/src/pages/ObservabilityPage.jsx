import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle2, XCircle, Clock, Zap, AlertCircle, Loader2, RefreshCw, ChevronDown, ChevronRight, BarChart3, Award, TrendingUp } from 'lucide-react';
import api from '../lib/api';

const STATUS_CONFIG = {
  success: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Success' },
  failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Failed' },
  running: { icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Running' },
  skipped: { icon: AlertCircle, color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200', label: 'Skipped' },
  degraded: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Degraded' },
};

const AGENT_ICONS = {
  text_extraction: '📄',
  llm_parsing: '🧠',
  skill_normalization: '🏷️',
  embedding_generation: '🔢',
  dedup_check: '🔍',
  database_persist: '💾',
};

function AgentStep({ trace, index }) {
  const cfg = STATUS_CONFIG[trace.status] || STATUS_CONFIG.skipped;
  const Icon = cfg.icon;

  return (
    <div className={`flex gap-4 p-4 rounded-2xl border transition-all ${cfg.bg} ${cfg.border}`}>
      {/* Step indicator */}
      <div className="flex flex-col items-center gap-1">
        <div className={`w-8 h-8 rounded-full border-2 ${cfg.border} flex items-center justify-center text-sm font-bold ${cfg.color} bg-white`}>
          {index + 1}
        </div>
        <div className="w-px flex-1 bg-slate-200" style={{ minHeight: '8px' }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-1">
          <span className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <span>{AGENT_ICONS[trace.agent_name] || '⚙️'}</span>
            {trace.agent_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
          <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
            <Icon className={`w-3 h-3 ${trace.status === 'running' ? 'animate-spin' : ''}`} />
            {cfg.label}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500">
          {trace.latency_ms != null && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {trace.latency_ms}ms
            </span>
          )}
          {trace.quality_score != null && (
            <span className="flex items-center gap-1">
              <Award className="w-3 h-3" />
              Quality: {(trace.quality_score * 100).toFixed(1)}%
            </span>
          )}
          {trace.retry_count > 0 && (
            <span className="text-amber-600 font-medium flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              {trace.retry_count} retry
            </span>
          )}
        </div>

        {trace.error_message && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-100 font-mono">
            {trace.error_message}
          </div>
        )}
      </div>
    </div>
  );
}

function PipelineRunCard({ run }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadDetail = async () => {
    if (!expanded) {
      setLoadingDetail(true);
      try {
        const res = await api.get(`/api/v1/pipeline/runs/${run.run_id}`);
        setDetail(res.data);
      } catch {}
      finally { setLoadingDetail(false); }
    }
    setExpanded(e => !e);
  };

  const allSuccess = detail?.traces?.every(t => t.status === 'success');
  const hasFailed = detail?.traces?.some(t => t.status === 'failed');

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-all">
      <button onClick={loadDetail} className="w-full text-left px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${run.status === 'completed' ? 'bg-emerald-500' : run.status === 'failed' ? 'bg-red-500' : 'bg-blue-500 animate-pulse'}`} />
          <div className="min-w-0">
            <p className="font-mono text-xs text-slate-500 truncate">{run.run_id}</p>
            <p className="text-sm font-medium text-slate-800 mt-0.5">
              {run.status === 'running' ? 'Processing…' : run.status === 'completed' ? 'Completed' : 'Failed'}
              {run.candidate_id && <span className="text-slate-400 font-normal ml-2">→ {run.candidate_id.slice(0, 8)}…</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {run.elapsed_ms}ms
          </span>
          <span className="text-xs text-slate-400">{run.agent_count} agents</span>
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 p-5 bg-slate-50">
          {loadingDetail ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading traces…
            </div>
          ) : detail ? (
            <div className="space-y-2">
              {detail.traces.map((trace, i) => (
                <AgentStep key={i} trace={trace} index={i} />
              ))}
              <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 pt-3 border-t border-slate-200">
                <span>Total: <strong>{detail.total_latency_ms}ms</strong></span>
                <span>Agents: <strong>{detail.traces.length}</strong></span>
                {allSuccess && <span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> All passed</span>}
                {hasFailed && <span className="text-red-600 font-semibold">Some agents failed</span>}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No trace data available.</p>
          )}
        </div>
      )}
    </div>
  );
}

function MetricsCard({ title, value, sub, color, icon: Icon }) {
  return (
    <div className={`rounded-2xl border p-5 ${color.bg} ${color.border}`}>
      <div className="flex items-center justify-between mb-3">
        <p className={`text-xs font-semibold uppercase tracking-wider ${color.text}`}>{title}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color.iconBg}`}>
          <Icon className={`w-4 h-4 ${color.text}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${color.text}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function ObservabilityPage() {
  const [runs, setRuns] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('runs');

  const loadData = async () => {
    setLoading(true);
    try {
      const [runsRes, metricsRes] = await Promise.all([
        api.get('/api/v1/pipeline/runs'),
        api.get('/api/v1/metrics'),
      ]);
      setRuns(runsRes.data || []);
      setMetrics(metricsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const rel = metrics?.orchestration_reliability || {};
  const lat = metrics?.latency || {};
  const parse = metrics?.parsing_accuracy || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
              <Activity className="w-5 h-5 text-white" />
            </div>
            Pipeline Observability
          </h1>
          <p className="text-slate-500 text-sm mt-1">Per-agent execution traces, latency metrics, and quality scores</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm font-medium transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Metrics summary */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricsCard
            title="Success Rate"
            value={`${((rel.success_rate || 0) * 100).toFixed(1)}%`}
            sub={`${rel.total_agent_executions || 0} total executions`}
            icon={CheckCircle2}
            color={{ bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', iconBg: 'bg-emerald-100' }}
          />
          <MetricsCard
            title="Avg Latency"
            value={`${lat.avg_agent_latency_ms || 0}ms`}
            sub={`P95: ${lat.p95_latency_ms || 0}ms`}
            icon={Clock}
            color={{ bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', iconBg: 'bg-blue-100' }}
          />
          <MetricsCard
            title="Parse Rate"
            value={`${((parse.parse_success_rate || 0) * 100).toFixed(1)}%`}
            sub={`${parse.successfully_parsed || 0} / ${parse.total_resumes_processed || 0} resumes`}
            icon={TrendingUp}
            color={{ bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', iconBg: 'bg-indigo-100' }}
          />
          <MetricsCard
            title="Pipeline Runs"
            value={rel.total_pipeline_runs || 0}
            sub={`${rel.failure_rate ? ((rel.failure_rate * 100).toFixed(1)) : 0}% failure rate`}
            icon={BarChart3}
            color={{ bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', iconBg: 'bg-violet-100' }}
          />
        </div>
      )}

      {/* Per-agent stats */}
      {metrics?.orchestration_reliability?.per_agent_stats && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <p className="text-sm font-semibold text-slate-700">Agent Performance Breakdown</p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(metrics.orchestration_reliability.per_agent_stats).map(([name, stats]) => (
                <div key={name} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{AGENT_ICONS[name] || '⚙️'}</span>
                    <p className="text-xs font-semibold text-slate-700 capitalize">{name.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Success: <strong className="text-emerald-600">{((stats.success_rate || 0) * 100).toFixed(0)}%</strong></span>
                    <span>Avg: <strong>{stats.avg_latency_ms || 0}ms</strong></span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all"
                      style={{ width: `${(stats.success_rate || 0) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        {['runs', 'metrics'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all capitalize ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab === 'runs' ? 'Pipeline Runs' : 'Full Metrics'}
          </button>
        ))}
      </div>

      {activeTab === 'runs' && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-40 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 bg-white rounded-2xl border border-slate-200">
              <Activity className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No pipeline runs yet</p>
              <p className="text-slate-400 text-sm">Upload resumes to see execution traces</p>
            </div>
          ) : (
            runs.map(run => <PipelineRunCard key={run.run_id} run={run} />)
          )}
        </div>
      )}

      {activeTab === 'metrics' && metrics && (
        <div className="space-y-4">
          {[
            { key: 'parsing_accuracy', label: 'Resume Parsing Accuracy', icon: '📄' },
            { key: 'normalization_precision', label: 'Skill Normalization Precision', icon: '🏷️' },
            { key: 'matching_quality', label: 'Matching Quality', icon: '🎯' },
            { key: 'api_completeness', label: 'API Completeness', icon: '🔌' },
          ].map(({ key, label, icon }) => (
            <div key={key} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <span>{icon}</span>
                <p className="font-semibold text-slate-700 text-sm">{label}</p>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(metrics[key] || {}).map(([k, v]) => (
                    <div key={k} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-xs text-slate-400 mb-1 capitalize">{k.replace(/_/g, ' ')}</p>
                      <p className="font-semibold text-slate-800 text-sm">
                        {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
