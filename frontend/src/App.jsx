import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import IntroPage from './pages/IntroPage';
import HRDashboard from './pages/HRDashboard';
import CandidatesPage from './pages/CandidatesPage';

// Protected Route Wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-auto bg-slate-50 relative z-0">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          
          {/* Protected Routes wrapped in Dashboard Layout */}
          <Route path="/intro" element={<ProtectedRoute><IntroPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><HRDashboard /></ProtectedRoute>} />
          <Route path="/candidates" element={<ProtectedRoute><CandidatesPage /></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
