import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function GoogleCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');

    if (code) {
      api.post('/api/auth/google/callback', { code })
        .then(res => {
          localStorage.setItem('token', res.data.access_token);
          return refreshUser();
        })
        .then(() => {
          navigate('/dashboard');
        })
        .catch(err => {
          console.error(err);
          navigate('/?error=google_auth_failed');
        });
    } else {
      navigate('/');
    }
  }, [location, navigate, refreshUser]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
      <p className="text-slate-600 font-medium">Authenticating with Google...</p>
    </div>
  );
}
