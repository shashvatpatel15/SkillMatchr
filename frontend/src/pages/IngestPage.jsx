import React, { useState, useRef } from 'react';
import { Upload, FileUp, CheckCircle, XCircle, Link2, Loader2, AlertCircle } from 'lucide-react';
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
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const abortRef = useRef(false);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length > 50) {
      setError('Maximum 50 files at a time.');
      setFiles(selected.slice(0, 50));
    } else {
      setFiles(selected);
      setError(null);
    }
    setResults([]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f =>
      f.type === 'application/pdf' || f.name.endsWith('.docx') || f.name.endsWith('.txt')
    );
    if (dropped.length > 50) {
      setError('Maximum 50 files at a time. Only first 50 selected.');
      setFiles(dropped.slice(0, 50));
    } else if (dropped.length) {
      setFiles(dropped);
      setError(null);
    }
    setResults([]);
  };

  // Upload files one-by-one for reliability (avoids LLM rate limits)
  const uploadFiles = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    setResults([]);
    abortRef.current = false;
    setProgress({ current: 0, total: files.length });

    const allResults = [];
    for (let i = 0; i < files.length; i++) {
      if (abortRef.current) break;
      setProgress({ current: i + 1, total: files.length });
      const file = files[i];
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/api/ingest/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000, // 2 mins per file
        });
        const entry = { filename: file.name, status: 'success', data: res.data };
        allResults.push(entry);
        setResults([...allResults]);
      } catch (err) {
        const entry = { filename: file.name, status: 'error', error: err.response?.data?.detail || 'Upload failed' };
        allResults.push(entry);
        setResults([...allResults]);
      }
      // Small delay between files to avoid rate limits
      if (i < files.length - 1 && !abortRef.current) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    setFiles([]);
    setUploading(false);
  };

  const cancelUpload = () => {
    abortRef.current = true;
  };



  const successCount = results.filter(r => r.status === 'success').length;
  const failCount = results.filter(r => r.status === 'error').length;

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
          <p className="text-xs text-slate-400 mt-1">or click to browse · Max 10MB per file · Up to 50 files at once</p>
          <input id="file-input" type="file" className="hidden" multiple accept=".pdf,.docx,.txt" onChange={handleFileChange} />
        </div>

        {files.length > 0 && !uploading && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2 mb-4 max-h-32 overflow-y-auto">
              {files.map((f, i) => (
                <span key={i} className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-100 font-medium">
                  📄 {f.name}
                </span>
              ))}
            </div>
            <button onClick={uploadFiles}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload {files.length} file{files.length > 1 ? 's' : ''}
            </button>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                Processing file {progress.current} of {progress.total}…
              </div>
              <button onClick={cancelUpload} className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-100 transition-colors">
                Stop
              </button>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            {successCount > 0 || failCount > 0 ? (
              <p className="text-xs text-slate-500">
                <span className="text-emerald-600 font-semibold">{successCount} succeeded</span>
                {failCount > 0 && <span className="text-red-600 font-semibold ml-2">{failCount} failed</span>}
              </p>
            ) : null}
          </div>
        )}

        {error && <div className="mt-4 bg-red-50 text-red-600 p-3 rounded-xl border border-red-100 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

        {/* Results */}
        <AnimatePresence>
          {results.length > 0 && !uploading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-2">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-bold text-slate-900">Results</span>
                <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200 font-semibold">{successCount} succeeded</span>
                {failCount > 0 && <span className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-full border border-red-200 font-semibold">{failCount} failed</span>}
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {results.map((r, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${r.status === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {r.status === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <span className="font-medium truncate">{r.filename}</span>
                      {r.data?.parsed_data?.full_name && <span className="ml-2 text-slate-500">→ {r.data.parsed_data.full_name}</span>}
                      {r.error && <span className="ml-2 text-red-500">{r.error}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live results while uploading */}
        <AnimatePresence>
          {results.length > 0 && uploading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 max-h-48 overflow-y-auto space-y-1.5">
              {results.map((r, i) => (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${r.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                  {r.status === 'success' ? <CheckCircle className="w-3 h-3 shrink-0" /> : <XCircle className="w-3 h-3 shrink-0" />}
                  <span className="font-medium truncate">{r.filename}</span>
                  {r.data?.parsed_data?.full_name && <span className="text-slate-500 ml-1">→ {r.data.parsed_data.full_name}</span>}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* LinkedIn Profile Import */}
      <div className="glass-card border border-slate-200/80 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Link2 className="w-5 h-5 text-indigo-600" /> LinkedIn Profile Import</h3>
        <p className="text-sm text-slate-500 mb-4">Upload a LinkedIn "Save to PDF" profile export. Our AI parser is specifically trained to handle the LinkedIn PDF format.</p>
        <label className="block w-full py-3 bg-indigo-50 text-indigo-700 font-semibold rounded-xl hover:bg-indigo-100 transition text-sm border border-indigo-100 text-center cursor-pointer hover:shadow-sm">
          <span className="flex items-center justify-center gap-2"><Link2 className="w-4 h-4" /> Upload LinkedIn PDF</span>
          <input type="file" className="hidden" accept=".pdf" onChange={async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            setSyncing(prev => ({ ...prev, linkedin: true }));
            try {
              const formData = new FormData();
              formData.append('file', file);
              const res = await api.post('/api/ingest/linkedin', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
              setSyncResults(prev => ({ ...prev, linkedin: res.data }));
            } catch (err) {
              setSyncResults(prev => ({ ...prev, linkedin: { error: err.response?.data?.detail || 'Upload failed' } }));
            } finally {
              setSyncing(prev => ({ ...prev, linkedin: false }));
            }
          }} />
        </label>
        {syncing.linkedin && (
          <div className="mt-3 flex items-center gap-2 text-sm text-indigo-600">
            <Loader2 className="w-4 h-4 animate-spin" /> Processing LinkedIn profile…
          </div>
        )}
        {syncResults.linkedin && (
          <div className={`mt-3 text-sm p-3 rounded-xl ${syncResults.linkedin.error ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
            {syncResults.linkedin.error || `✅ Successfully imported candidate from LinkedIn profile`}
          </div>
        )}
      </div>
    </div>
  );
}
