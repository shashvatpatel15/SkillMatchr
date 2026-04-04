import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, X, MapPin, DollarSign, Users, Zap, Trash2, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

const InputField = ({ label, name, type = 'text', placeholder, required = false, form, setForm }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <input type={type} required={required} value={form[name]} onChange={e => setForm({ ...form, [name]: e.target.value })}
      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none bg-white text-sm" placeholder={placeholder} />
  </div>
);

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [matchResults, setMatchResults] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Create form
  const [form, setForm] = useState({
    title: '', company: '', department: '', location: '',
    employment_type: 'full_time', experience_required: '',
    salary_min: '', salary_max: '', skills_required: '', job_description: '',
  });
  const [creating, setCreating] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/jobs');
      setJobs(res.data || []);
      setError(null);
    } catch { setError('Failed to load jobs.'); }
    finally { setLoading(false); }
  };

  const createJob = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/api/jobs', {
        ...form,
        experience_required: form.experience_required ? Number(form.experience_required) : null,
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        skills_required: form.skills_required.split(',').map(s => s.trim()).filter(Boolean),
      });
      setShowCreate(false);
      setForm({ title: '', company: '', department: '', location: '', employment_type: 'full_time', experience_required: '', salary_min: '', salary_max: '', skills_required: '', job_description: '' });
      fetchJobs();
      showToast('Job created successfully');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create job.');
    } finally { setCreating(false); }
  };

  const deleteJob = async (jobId) => {
    if (!confirm('Delete this job and all its data?')) return;
    try {
      await api.delete(`/api/jobs/${jobId}`);
      fetchJobs();
      showToast('Job deleted');
    } catch {
      showToast('Failed to delete job', 'error');
    }
  };

  const findMatches = async (jobId) => {
    setMatchLoading(true);
    setMatchResults(null);
    try {
      const res = await api.post(`/api/jobs/${jobId}/match`, { top_k: 10 });
      setMatchResults(res.data);
    } catch {
      showToast('AI matching failed. Ensure embeddings are generated.', 'error');
    } finally { setMatchLoading(false); }
  };


  const TYPE_LABELS = {
    full_time: 'Full Time',
    part_time: 'Part Time',
    contract: 'Contract',
    internship: 'Internship',
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}
          >
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <span className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200">
              <Briefcase className="w-5 h-5 text-white" />
            </span>
            Jobs & Matching
          </h2>
          <p className="text-slate-500 text-sm mt-1">{jobs.length} open positions</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition text-sm">
          <Plus className="w-4 h-4" /> New Job
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

      {/* Create Job Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreate(false)} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white shrink-0 z-10">
                <h3 className="text-xl font-bold text-slate-900">Create New Job</h3>
                <button type="button" onClick={() => setShowCreate(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 p-8 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Job Title" name="title" placeholder="Senior Frontend Developer" required form={form} setForm={setForm} />
                  <InputField label="Company" name="company" placeholder="Acme Corp" form={form} setForm={setForm} />
                  <InputField label="Department" name="department" placeholder="Engineering" form={form} setForm={setForm} />
                  <InputField label="Location" name="location" placeholder="Bangalore, India" form={form} setForm={setForm} />
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Employment Type</label>
                    <select value={form.employment_type} onChange={e => setForm({ ...form, employment_type: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none bg-white text-sm">
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                    </select>
                  </div>
                  <InputField label="Experience (years)" name="experience_required" type="number" placeholder="5" form={form} setForm={setForm} />
                  <InputField label="Min Salary" name="salary_min" type="number" placeholder="80000" form={form} setForm={setForm} />
                  <InputField label="Max Salary" name="salary_max" type="number" placeholder="120000" form={form} setForm={setForm} />
                </div>
                <InputField label="Required Skills (comma-separated)" name="skills_required" placeholder="React, TypeScript, Node.js" form={form} setForm={setForm} />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Job Description</label>
                  <textarea value={form.job_description} onChange={e => setForm({ ...form, job_description: e.target.value })} rows={4}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none bg-white text-sm resize-none" placeholder="Describe the role..." />
                </div>
              </div>
              <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0 z-10">
                 <button type="button" onClick={() => setShowCreate(false)} className="px-5 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 font-semibold transition text-sm">Cancel</button>
                 <button onClick={createJob} type="button" disabled={creating} className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition text-sm disabled:opacity-60">
                  {creating ? 'Creating...' : 'Create Job'}
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Jobs Grid */}
      {loading ? (
        <div className="flex h-48 items-center justify-center"><div className="w-7 h-7 border-3 border-t-blue-500 border-slate-200 rounded-full animate-spin" /></div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 text-slate-400 glass-card border border-slate-200/80">
          <Briefcase className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-lg font-medium">No jobs posted yet</p>
          <p className="text-sm">Create your first job opening to start matching candidates</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job, i) => (
            <motion.div key={job.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="glass-card border border-slate-200/80 p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">{job.title}</h3>
                  <p className="text-sm text-slate-500 truncate">{job.company} {job.department ? `· ${job.department}` : ''}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${job.status === 'open' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {job.status}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteJob(job.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    title="Delete job"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm text-slate-500">
                {job.location && <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{job.location}</p>}
                {job.employment_type && <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{TYPE_LABELS[job.employment_type] || job.employment_type}</p>}
                {job.experience_required && <p>🏅 {job.experience_required}+ years</p>}
                {(job.salary_min || job.salary_max) && <p className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" />{job.salary_min?.toLocaleString()}{job.salary_max ? ` - ${job.salary_max.toLocaleString()}` : '+'}</p>}
              </div>
              {job.skills_required?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {job.skills_required.slice(0, 5).map((s, j) => (
                    <span key={j} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">{s}</span>
                  ))}
                  {job.skills_required.length > 5 && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">+{job.skills_required.length - 5}</span>
                  )}
                </div>
              )}
              <button onClick={() => findMatches(job.id)} className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-50 text-indigo-700 font-semibold rounded-xl hover:bg-indigo-100 transition text-sm border border-indigo-100">
                <Zap className="w-4 h-4" /> Find Matches
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Match Results Modal */}
      <AnimatePresence>
        {(matchResults || matchLoading) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setMatchResults(null); setMatchLoading(false); }} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-8">
              {matchLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-10 h-10 border-3 border-t-indigo-500 border-slate-200 rounded-full animate-spin" />
                  <p className="text-slate-500 text-sm">AI is analyzing candidates...</p>
                </div>
              ) : matchResults && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Match Results: {matchResults.job_title}</h3>
                      <p className="text-sm text-slate-500">{matchResults.total} candidates matched</p>
                    </div>
                    <button onClick={() => setMatchResults(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"><X className="w-5 h-5" /></button>
                  </div>
                  {matchResults.results?.length > 0 ? (
                    <div className="space-y-3">
                      {matchResults.results.map((m, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:bg-slate-50/50 transition">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-600 font-bold text-sm">
                            #{i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900">{m.full_name}</p>
                            <p className="text-sm text-slate-500 truncate">{m.current_title} {m.location ? `· ${m.location}` : ''}</p>
                            {m.skills?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {m.skills.slice(0, 5).map((s, j) => <span key={j} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{s}</span>)}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold text-indigo-600">{(m.composite_score * 100).toFixed(0)}%</p>
                            <p className="text-xs text-slate-400">match</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">No matching candidates found</p>
                      <p className="text-sm text-slate-400 mt-1">Try uploading more resumes or adjusting the job requirements</p>
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
