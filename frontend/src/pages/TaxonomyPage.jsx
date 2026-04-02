import React, { useState, useEffect, useCallback } from 'react';
import { Search, Tag, GitBranch, AlertCircle, CheckCircle, ChevronRight, Loader2, BookOpen, Hash, Layers } from 'lucide-react';
import api from '../lib/api';

const CATEGORY_COLORS = {
  'Programming Languages': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' },
  'Frontend Development': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  'Backend Development': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  'Databases': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  'Cloud & DevOps': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', dot: 'bg-sky-500' },
  'AI & Machine Learning': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  'Data Engineering': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  'API & Integration': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500' },
  'Tools & Practices': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500' },
  'Analytics': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  'Other': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-500' },
};

function SkillCard({ skill, isSelected, onClick }) {
  const colors = CATEGORY_COLORS[skill.category] || CATEGORY_COLORS['Other'];
  return (
    <button
      onClick={() => onClick(skill)}
      className={`text-left p-4 rounded-2xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${isSelected ? 'ring-2 ring-indigo-400 border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-200'}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-semibold text-slate-900 text-sm leading-snug">{skill.canonical_name}</span>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
          {skill.category?.split(' ')[0]}
        </span>
      </div>
      {skill.synonyms?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {skill.synonyms.slice(0, 3).map(s => (
            <span key={s} className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">{s}</span>
          ))}
          {skill.synonyms.length > 3 && (
            <span className="text-xs text-slate-400">+{skill.synonyms.length - 3}</span>
          )}
        </div>
      )}
    </button>
  );
}

function SkillDetail({ skill, onClose }) {
  if (!skill) return null;
  const colors = CATEGORY_COLORS[skill.category] || CATEGORY_COLORS['Other'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
      <div className="p-5 border-b border-slate-100" style={{ background: 'linear-gradient(135deg, #f8fafc, #f0f4ff)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{skill.canonical_name}</h3>
            <p className="text-slate-500 text-sm mt-0.5">{skill.category}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100">×</button>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Canonical Name</label>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 font-semibold text-sm border border-indigo-200">
            <CheckCircle className="w-3.5 h-3.5" /> {skill.canonical_name}
          </span>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
            Also Known As ({skill.synonyms?.length || 0} aliases)
          </label>
          {skill.synonyms?.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {skill.synonyms.map(s => (
                <span key={s} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 font-mono">{s}</span>
              ))}
            </div>
          ) : <p className="text-slate-400 text-sm">No known aliases</p>}
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Category</label>
          <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl font-medium border ${colors.bg} ${colors.text} ${colors.border}`}>
            <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
            {skill.category}
          </span>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Skill Type</label>
          <span className="text-sm text-slate-700 font-medium capitalize">{skill.skill_type}</span>
        </div>
      </div>
    </div>
  );
}

function EmergingSkillsPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/v1/skills/taxonomy?q=')
      .then(() => setItems([]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-5 h-5 text-amber-600" />
        <h3 className="font-semibold text-amber-800">Emerging Skills Queue</h3>
        <span className="ml-auto text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">Needs Review</span>
      </div>
      {loading ? (
        <div className="text-sm text-amber-600 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : items.length === 0 ? (
        <p className="text-sm text-amber-600">No emerging skills pending review.</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.raw_name} className="flex items-center justify-between bg-white/60 rounded-xl px-3 py-2 border border-amber-100">
              <span className="text-sm font-medium text-slate-700">{item.raw_name}</span>
              <span className="text-xs text-amber-600">{item.occurrences}× found</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TaxonomyPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch taxonomy
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (selectedCategory) params.set('category', selectedCategory);

    api.get(`/api/v1/skills/taxonomy?${params}`)
      .then(r => setData(r.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [debouncedQuery, selectedCategory]);

  const allCategories = data?.categories || [];
  const skills = data?.skills || [];

  const filteredByTab = activeTab === 'all' ? skills : skills.filter(s => s.skill_type === activeTab);
  const categoryGroups = {};
  filteredByTab.forEach(s => {
    const cat = s.category || 'Other';
    if (!categoryGroups[cat]) categoryGroups[cat] = [];
    categoryGroups[cat].push(s);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            Skill Taxonomy
          </h1>
          <p className="text-slate-500 text-sm mt-1">Browse and search {data?.total || 0}+ canonical skills across {allCategories.length} categories</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl font-semibold border border-indigo-100">
            {data?.total || 0} Skills
          </span>
          <span className="px-3 py-1.5 bg-violet-50 text-violet-700 rounded-xl font-semibold border border-violet-100">
            {allCategories.length} Categories
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left sidebar */}
        <div className="xl:col-span-1 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search skills…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white"
            />
          </div>

          {/* Categories */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Categories
              </p>
            </div>
            <div className="p-2">
              <button
                onClick={() => setSelectedCategory('')}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all ${selectedCategory === '' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                All Categories
              </button>
              {allCategories.map(cat => {
                const cols = CATEGORY_COLORS[cat.name] || CATEGORY_COLORS['Other'];
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.name === selectedCategory ? '' : cat.name)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all flex items-center justify-between gap-2 ${selectedCategory === cat.name ? `${cols.bg} ${cols.text} font-semibold` : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${cols.dot}`} />
                      {cat.name}
                    </span>
                    <span className="text-xs opacity-60">{cat.skill_count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Emerging skills */}
          <EmergingSkillsPanel />
        </div>

        {/* Main content */}
        <div className="xl:col-span-3 space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
            {['all', 'technical', 'soft', 'certification'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all capitalize ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Selected skill detail */}
          {selectedSkill && (
            <SkillDetail skill={selectedSkill} onClose={() => setSelectedSkill(null)} />
          )}

          {/* Skills grid */}
          {loading ? (
            <div className="flex items-center justify-center h-48 bg-white rounded-2xl border border-slate-200">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Loading taxonomy…</p>
              </div>
            </div>
          ) : Object.keys(categoryGroups).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-slate-200">
              <Hash className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No skills found</p>
              <p className="text-slate-400 text-sm">Try a different search term</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(categoryGroups).map(([cat, catSkills]) => {
                const cols = CATEGORY_COLORS[cat] || CATEGORY_COLORS['Other'];
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${cols.dot}`} />
                      <h3 className="font-semibold text-slate-700 text-sm">{cat}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${cols.bg} ${cols.text} border ${cols.border}`}>{catSkills.length}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {catSkills.map(skill => (
                        <SkillCard
                          key={skill.id}
                          skill={skill}
                          isSelected={selectedSkill?.id === skill.id}
                          onClick={setSelectedSkill}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
