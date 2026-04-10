import React, { useState } from 'react';
import { Search, Sparkles, MapPin, Briefcase, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/api/search', { query: query.trim() });
      setResults(res.data);
    } catch (err) {
      setError('Search failed. Make sure the backend AI service is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">AI Candidate Search</h2>
        <p className="text-slate-500 text-sm mt-1">Natural language search powered by Groq + pgvector embeddings</p>
      </div>

      <form onSubmit={handleSearch} className="glass-card border border-slate-200/80 p-2 flex items-center gap-3">
        <div className="flex-1 flex items-center gap-3 px-3">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder='e.g. "Senior React developer in Bangalore with 5+ years"'
            className="w-full py-3 bg-transparent outline-none text-slate-900 placeholder-slate-400"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm flex items-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
          Search
        </button>
      </form>

      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{error}</div>}

      {results && (
        <div className="space-y-4">
          {results.intent && Object.keys(results.intent).length > 0 && (
            <div className="glass-card border border-indigo-100 bg-indigo-50/40 p-4">
              <p className="text-xs font-semibold text-indigo-600 mb-2">🧠 Parsed Intent</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(results.intent).map(([key, val]) => (
                  val && <span key={key} className="text-xs bg-white px-3 py-1.5 rounded-full border border-indigo-100 text-indigo-700 font-medium">
                    {key}: {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-sm text-slate-500">{results.total} result{results.total !== 1 ? 's' : ''} found</p>

          <div className="space-y-3">
            <AnimatePresence>
              {results.results?.map((r, i) => (
                <motion.div
                  key={r.candidate_id || i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card border border-slate-200/80 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-base">{r.full_name || 'Unknown'}</h3>
                      <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-500">
                        {r.current_title && <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{r.current_title}</span>}
                        {r.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{r.location}</span>}
                        {r.years_experience != null && <span>{r.years_experience} yrs exp</span>}
                      </div>
                    </div>
                    {r.similarity_score != null && (
                      <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                        <Star className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-semibold text-emerald-700">{(r.similarity_score * 100).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                  {r.skills?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {r.skills.slice(0, 8).map((s, j) => (
                        <span key={j} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                      {r.skills.length > 8 && <span className="text-xs text-slate-400">+{r.skills.length - 8} more</span>}
                    </div>
                  )}
                  {r.match_reason && <p className="mt-2 text-xs text-slate-400 italic">{r.match_reason}</p>}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {results?.total === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Search className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-lg font-medium">No matching candidates found</p>
          <p className="text-sm">Try different keywords or broader criteria</p>
        </div>
      )}
    </div>
  );
}
