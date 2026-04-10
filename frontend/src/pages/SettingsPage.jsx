import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Shield, Key, Bell, Save,
  CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, Sparkles, Trash2, AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../lib/api';

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Profile form
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // API Keys
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState(null);
  const [loadingKeys, setLoadingKeys] = useState(false);

  // Reset form when user or tab changes
  useEffect(() => {
    setFullName(user?.full_name || '');
    setEmail(user?.email || '');
  }, [user]);

  useEffect(() => {
    setError('');
    setSuccess('');
    if (activeTab === 'api') fetchApiKeys();
  }, [activeTab]);

  const fetchApiKeys = async () => {
    setLoadingKeys(true);
    try {
      const res = await api.get('/api/v1/api-keys');
      setApiKeys(res.data || []);
    } catch { /* API keys endpoint may not exist yet */ }
    finally { setLoadingKeys(false); }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await api.post('/api/v1/api-keys', { name: newKeyName.trim() });
      setCreatedKey(res.data);
      setNewKeyName('');
      fetchApiKeys();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create API key.');
    }
  };

  // ═══ Save Profile (name + email via PATCH /api/auth/me) ═══
  const handleSaveProfile = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (!fullName.trim()) {
        setError('Name cannot be empty.');
        setSaving(false);
        return;
      }
      await api.patch('/api/auth/me', {
        full_name: fullName.trim(),
        email: email.trim(),
      });
      await refreshUser();
      setSuccess('Profile updated successfully!');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  // ═══ Change Password (PATCH /api/auth/me/password) ═══
  const handleChangePassword = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (!newPassword) {
        setError('New password is required.');
        setSaving(false);
        return;
      }
      if (newPassword.length < 6) {
        setError('Password must be at least 6 characters.');
        setSaving(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('Passwords do not match.');
        setSaving(false);
        return;
      }
      await api.patch('/api/auth/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  // ═══ Delete Account (DELETE /api/auth/me) ═══
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    setError('');
    try {
      await api.delete('/api/auth/me');
      logout();
      navigate('/');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Failed to delete account.');
      setDeleting(false);
    }
  };

  const TABS = [
    { id: 'profile',  label: 'Profile',  icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'api',      label: 'API Keys', icon: Key },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1.5">Manage your account, security, and API access</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium animate-in">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-600 font-medium animate-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />{success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden sticky top-28">
            {/* User card */}
            <div className="p-5 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-indigo-50/20">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-xl shadow-lg mx-auto ring-4 ring-white">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <p className="text-center font-semibold text-slate-900 mt-3">{user?.full_name}</p>
              <p className="text-center text-xs text-slate-500 truncate">{user?.email}</p>
              <div className="flex justify-center mt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
                  {user?.role === 'hr' ? 'Recruiter' : (user?.role || 'Recruiter')}
                </span>
              </div>
            </div>
            <div className="p-2">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-500' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* ═══════════ PROFILE TAB ═══════════ */}
          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Profile Information</h2>
                <p className="text-sm text-slate-500 mt-0.5">Update your name and email address</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Role</label>
                  <input
                    type="text" value={user?.role === 'hr' ? 'recruiter' : (user?.role || 'recruiter')} readOnly
                    className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed capitalize"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Auth Provider</label>
                  <input
                    type="text" value={user?.auth_provider || 'native'} readOnly
                    className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed capitalize"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={handleSaveProfile} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all text-sm disabled:opacity-60">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════════ SECURITY TAB ═══════════ */}
          {activeTab === 'security' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Password Change */}
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Update your account password</p>
                </div>
                <div className="space-y-4 max-w-md">
                  {user?.auth_provider === 'native' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Current Password</label>
                      <input
                        type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                      />
                    </div>
                  )}
                  <div className="relative">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">New Password</label>
                    <input
                      type={showNewPass ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 pr-12"
                    />
                    <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-4 top-[38px] text-slate-400 hover:text-indigo-500 transition-colors">
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm New Password</label>
                    <input
                      type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                    />
                  </div>
                </div>
                {/* Google connection status */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Google Account</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {user?.google_connected ? 'Connected — Gmail integration active' : 'Not connected'}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                      user?.google_connected
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {user?.google_connected ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button onClick={handleChangePassword} disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all text-sm disabled:opacity-60">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Update Password
                  </button>
                </div>
              </div>

              {/* Delete Account */}
              <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-red-700">Danger Zone</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                  </div>
                </div>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 px-5 py-2.5 border-2 border-red-200 text-red-600 font-semibold rounded-xl hover:bg-red-50 transition-all text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete My Account
                  </button>
                ) : (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3">
                    <p className="text-sm text-red-600 font-medium">
                      Type <strong>DELETE</strong> to confirm account deletion:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={e => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE"
                      className="w-full max-w-xs px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 font-mono uppercase"
                    />
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE' || deleting}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-semibold rounded-xl shadow-lg shadow-red-500/20 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-700"
                      >
                        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        {deleting ? 'Deleting...' : 'Confirm Delete'}
                      </button>
                      <button
                        onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                        className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══════════ API KEYS TAB ═══════════ */}
          {activeTab === 'api' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
                <h2 className="text-lg font-bold text-slate-900">API Keys</h2>
                <p className="text-sm text-slate-500 mt-0.5 mb-5">Manage API keys for third-party integrations (V1 API)</p>

                <div className="flex gap-3 mb-6">
                  <input
                    type="text" value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                    placeholder="Key name (e.g. Production)"
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  />
                  <button onClick={createApiKey}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all shrink-0">
                    Generate Key
                  </button>
                </div>

                {createdKey && (
                  <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl animate-in">
                    <p className="text-sm font-semibold text-emerald-800 mb-2">🔑 API Key Created — Copy it now!</p>
                    <code className="block p-3 bg-white rounded-lg text-xs font-mono text-emerald-700 border border-emerald-100 break-all select-all">
                      {createdKey.api_key}
                    </code>
                    <p className="text-xs text-emerald-600 mt-2">This key won't be shown again. Store it securely.</p>
                  </div>
                )}

                {loadingKeys ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading API keys...
                  </div>
                ) : apiKeys.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4">No API keys created yet.</p>
                ) : (
                  <div className="space-y-2">
                    {apiKeys.map(key => (
                      <div key={key.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{key.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Rate limit: {key.rate_limit}/min · Created: {new Date(key.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                          key.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
                        }`}>
                          {key.is_active ? 'Active' : 'Revoked'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══════════ NOTIFICATIONS TAB ═══════════ */}
          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
                <p className="text-sm text-slate-500 mt-0.5">Configure how you receive alerts</p>
              </div>
              {[
                { label: 'New candidate ingested', desc: 'Get notified when a resume is processed', enabled: true },
                { label: 'Duplicate detected', desc: 'Alert when potential duplicates are found', enabled: true },
                { label: 'Job match threshold met', desc: 'When a candidate matches above 75%', enabled: false },
                { label: 'Pipeline failures', desc: 'Alert on agent failures during processing', enabled: true },
                { label: 'Webhook delivery failures', desc: 'When V1 API webhook callbacks fail', enabled: false },
              ].map((n, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50/50 transition">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{n.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{n.desc}</p>
                  </div>
                  <button className={`w-11 h-6 rounded-full transition-colors relative ${
                    n.enabled ? 'bg-indigo-500' : 'bg-slate-200'
                  }`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform ${
                      n.enabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
