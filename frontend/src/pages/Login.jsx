import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BrainCircuit, Zap, Shield, ArrowRight, Eye, EyeOff,
  CheckCircle2, User, Mail, Lock, Sparkles, Loader2, AlertCircle
} from 'lucide-react';
import api from '../lib/api';

const FEATURES = [
  { icon: BrainCircuit, title: 'Multi-Agent AI Pipeline', desc: 'LangGraph orchestrated resume parsing & skill normalization' },
  { icon: Zap,          title: 'Real-Time Intelligence', desc: 'From PDF upload to ranked talent pool in under 10 seconds' },
  { icon: Shield,       title: 'Enterprise Grade API', desc: 'REST v1 with full Swagger docs, JWT + API key auth' },
];

const TYPING_TEXTS = [
  'Normalize skills at scale',
  'AI-powered resume parsing',
  'Semantic candidate matching',
  'Smart duplicate detection',
];

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Typing animation
  const [typingIdx, setTypingIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  useEffect(() => {
    const current = TYPING_TEXTS[typingIdx];
    const speed = isDeleting ? 30 : 60;

    const timer = setTimeout(() => {
      if (!isDeleting && charIdx < current.length) {
        setDisplayText(current.substring(0, charIdx + 1));
        setCharIdx(charIdx + 1);
      } else if (!isDeleting && charIdx === current.length) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && charIdx > 0) {
        setDisplayText(current.substring(0, charIdx - 1));
        setCharIdx(charIdx - 1);
      } else if (isDeleting && charIdx === 0) {
        setIsDeleting(false);
        setTypingIdx((typingIdx + 1) % TYPING_TEXTS.length);
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [charIdx, isDeleting, typingIdx]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        navigate('/dashboard');
      } else {
        // Registration
        if (!fullName.trim()) {
          setError('Please enter your full name.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        await api.post('/api/auth/register', {
          email,
          password,
          full_name: fullName.trim(),
        });
        setSuccess('Account created! Signing you in...');
        // Auto-login after registration
        await login(email, password);
        navigate('/dashboard');
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (isLogin) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const res = await api.get('/api/auth/google/url');
      if (res.data?.url) window.location.href = res.data.url;
    } catch {
      setError('Google OAuth is not configured on this server.');
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* ═══ Left Hero Panel ═══ */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between px-16 py-12 overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #0f0a2e 0%, #1a1145 30%, #1e1b4b 60%, #1e1b4b 100%)' }}>
        
        {/* Floating orbs */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}
        />

        <div className="relative z-10 w-full max-w-lg mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-20">
            <div className="relative">
              <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-3 shadow-2xl shadow-indigo-500/30">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl blur-lg opacity-40 animate-pulse" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">SkillMatchr</span>
          </div>

          {/* Headline */}
          <h1 className="text-[3.2rem] leading-[1.1] font-extrabold text-white mb-3 tracking-tight">
            Talent Intelligence
          </h1>
          <h1 className="text-[3.2rem] leading-[1.1] font-extrabold mb-8 tracking-tight"
              style={{ background: 'linear-gradient(135deg, #818cf8, #a78bfa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Reimagined with AI
          </h1>

          {/* Animated typing */}
          <div className="text-slate-300 text-lg mb-14 font-medium flex items-center gap-1">
            {displayText}
            <span className="w-0.5 h-6 bg-indigo-400 rounded-full animate-pulse" />
          </div>

          {/* Feature cards */}
          <div className="space-y-3.5">
            {FEATURES.map((f, i) => (
              <div key={i}
                className="flex items-center justify-between rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(12px)',
                }}>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(129,140,248,0.15)' }}>
                    <f.icon className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">{f.title}</h3>
                    <p className="text-slate-400 text-xs mt-0.5">{f.desc}</p>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-400/80 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div className="relative z-10 w-full max-w-lg mx-auto mt-12">
          <div className="border-l-2 border-indigo-500/40 pl-4 py-1">
            <p className="text-slate-300 italic text-sm">"From PDF to ranked talent pool in under 10 seconds."</p>
            <p className="text-slate-500 text-[11px] uppercase tracking-wider font-medium mt-1.5">
              Multi-Agent AI • By Team SteroidPrompts
            </p>
          </div>
        </div>
      </div>

      {/* ═══ Right Auth Panel ═══ */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 relative">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #6366f1 1px, transparent 0)',
            backgroundSize: '30px 30px'
          }}
        />

        <div className="w-full max-w-[440px] relative z-10">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl p-2.5 shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">SkillMatchr</span>
          </div>

          {/* Render Cold Start Notice
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 mb-6 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150 fill-mode-both">
            <AlertCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-indigo-900">Render Deployment Notice</p>
              <p className="text-[13px] text-indigo-800/80 mt-1 leading-relaxed font-medium">
                The backend for this site runs on a free Render instance which spins down after inactivity. Please be aware that your initial request may take <strong>50 seconds or more</strong> to wake the server.
              </p>
            </div>
          </div> */}

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.06)] border border-slate-100/80 p-8 sm:p-10">
            {/* Toggle */}
            <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-8 border border-slate-100">
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  isLogin
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                onClick={() => switchMode()}
                disabled={isLogin}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  !isLogin
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                onClick={() => switchMode()}
                disabled={!isLogin}
              >
                Sign Up
              </button>
            </div>

            {/* Header */}
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {isLogin ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-slate-500 text-sm mt-1.5 font-medium">
                {isLogin
                  ? 'Sign in to your recruitment workspace'
                  : 'Get started with SkillMatchr for free'}
              </p>
            </div>

            {/* Error / Success */}
            {error && (
              <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl animate-in">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}
            {success && (
              <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl animate-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-600 font-medium">{success}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name (signup only) */}
              {!isLogin && (
                <div className="animate-in">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all text-sm placeholder:text-slate-400 font-medium text-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all text-sm placeholder:text-slate-400 font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={isLogin ? undefined : 6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all text-sm placeholder:text-slate-400 font-bold tracking-widest text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {!isLogin && (
                  <p className="text-xs text-slate-400 mt-1.5 ml-1">Minimum 6 characters</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2.5 text-sm shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 mt-3 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isLogin ? 'Signing In...' : 'Creating Account...'}
                  </>
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-7 flex items-center gap-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              <span className="text-[11px] font-semibold text-slate-400 lowercase whitespace-nowrap">or continue with</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            </div>

            {/* Google OAuth */}
            <button
              onClick={handleGoogleAuth}
              type="button"
              className="w-full py-3.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-semibold rounded-xl transition-all flex items-center justify-center gap-3 text-sm shadow-sm hover:shadow"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            {/* Switch mode */}
            <p className="mt-7 text-center text-sm text-slate-500 font-medium">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={switchMode}
                className="text-indigo-600 hover:text-indigo-700 font-semibold hover:underline"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 mt-6 font-medium">
            By continuing, you agree to SkillMatchr's Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
}
