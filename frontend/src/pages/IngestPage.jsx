import React, { useState } from 'react';
import { Upload, FileUp, CheckCircle, XCircle, Link2, Mail, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

export default function IngestPage() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState({});
  const [syncResults, setSyncResults] = useState({});
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setResults([]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f =>
      f.type === 'application/pdf' || f.name.endsWith('.docx')
    );
    if (dropped.length) {
      setFiles(dropped);
      setResults([]);
    }
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    setResults([]);

    try {
      if (files.length === 1) {
        const formData = new FormData();
        formData.append('file', files[0]);
        const res = await api.post('/api/ingest/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setResults([{ filename: files[0].name, status: 'success', data: res.data }]);
      } else {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        const res = await api.post('/api/ingest/upload/batch', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setResults(res.data.results || []);
      }
      setFiles([]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const triggerSync = async (source, endpoint) => {
    setSyncing(prev => ({ ...prev, [source]: true }));
    setSyncResults(prev => ({ ...prev, [source]: null }));
    try {
      const res = await api.post(endpoint);
      setSyncResults(prev => ({ ...prev, [source]: res.data }));
    } catch (err) {
      setSyncResults(prev => ({ ...prev, [source]: { error: err.response?.data?.detail || 'Sync failed' } }));
    } finally {
      setSyncing(prev => ({ ...prev, [source]: false }));
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Ingest Candidates</h2>
        <p className="text-slate-500 text-sm mt-1">Upload resumes or sync from external sources</p>
      </div>

      {/* Resume Upload */}
      <div className="glass-card border border-slate-200/80 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Upload className="w-5 h-5 text-blue-600" /> Resume Upload</h3>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
            dragOver ? 'border-blue-400 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/20'
          }`}
          onClick={() => document.getElementById('file-input').click()}
        >
          <FileUp className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700">Drag & drop PDF/DOCX files here</p>
          <p className="text-xs text-slate-400 mt-1">or click to browse · Max 10MB per file · Up to 20 files</p>
          <input id="file-input" type="file" className="hidden" multiple accept=".pdf,.docx" onChange={handleFileChange} />
        </div>

        {files.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {files.map((f, i) => (
                <span key={i} className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-100 font-medium">
                  📄 {f.name}
                </span>
              ))}
            </div>
            <button onClick={uploadFiles} disabled={uploading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition disabled:opacity-60 flex items-center gap-2">
              {uploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload className="w-5 h-5" />}
              {uploading ? `Processing ${files.length} file(s)...` : `Upload ${files.length} file(s)`}
            </button>
          </div>
        )}

        {error && <div className="mt-4 bg-red-50 text-red-600 p-3 rounded-xl border border-red-100 text-sm">{error}</div>}

        <AnimatePresence>
          {results.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-2">
              {results.map((r, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${r.status === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {r.status === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  <div>
                    <span className="font-medium">{r.filename}</span>
                    {r.data?.parsed_data?.full_name && <span className="ml-2 text-slate-500">→ {r.data.parsed_data.full_name}</span>}
                    {r.error && <span className="ml-2">{r.error}</span>}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* External Sources */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { key: 'linkedin', icon: Link2, label: 'LinkedIn PDF', desc: 'Upload a LinkedIn profile PDF', endpoint: null },
          { key: 'hrms', icon: Building2, label: 'HRMS (BambooHR)', desc: 'Sync candidates from HRMS', endpoint: '/api/ingest/hrms/sync' },
          { key: 'gmail', icon: Mail, label: 'Gmail Inbox', desc: 'Fetch resume attachments from Gmail', endpoint: '/api/ingest/gmail/sync' },
        ].map(source => (
          <div key={source.key} className="glass-card border border-slate-200/80 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <source.icon className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">{source.label}</p>
                <p className="text-xs text-slate-500">{source.desc}</p>
              </div>
            </div>
            {source.endpoint ? (
              <button onClick={() => triggerSync(source.key, source.endpoint)} disabled={syncing[source.key]}
                className="w-full py-2.5 bg-indigo-50 text-indigo-700 font-medium rounded-xl hover:bg-indigo-100 transition text-sm border border-indigo-100 disabled:opacity-60">
                {syncing[source.key] ? 'Syncing...' : 'Sync Now'}
              </button>
            ) : (
              <label className="block w-full py-2.5 bg-indigo-50 text-indigo-700 font-medium rounded-xl hover:bg-indigo-100 transition text-sm border border-indigo-100 text-center cursor-pointer">
                Upload PDF
                <input type="file" className="hidden" accept=".pdf" onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  setSyncing(prev => ({ ...prev, linkedin: true }));
                  try {
                    const formData = new FormData();
                    formData.append('file', file);
                    const res = await api.post('/api/ingest/linkedin', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                    setSyncResults(prev => ({ ...prev, linkedin: res.data }));
                  } catch (err) {
                    setSyncResults(prev => ({ ...prev, linkedin: { error: err.response?.data?.detail || 'Upload failed' } }));
                  } finally {
                    setSyncing(prev => ({ ...prev, linkedin: false }));
                  }
                }} />
              </label>
            )}
            {syncResults[source.key] && (
              <div className={`mt-3 text-xs p-2.5 rounded-lg ${syncResults[source.key].error ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                {syncResults[source.key].error || `✅ Synced ${syncResults[source.key].total || 1} candidate(s)`}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
