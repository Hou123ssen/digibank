import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from './components/ui/Toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/routes/ProtectedRoute';
import { ThemeProvider } from './components/landing/ThemeContext';

// Pages
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

function App() {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts([...toasts, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(toasts.filter(t => t.id !== id));
  };

  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <div className="min-h-screen bg-bg-dark text-white font-sans selection:bg-emerald-500/30">
            <Routes>
              {/* Default Redirect to Dashboard (guarded) or Login */}
              {/* Root Landing Page */}
              <Route path="/" element={<LandingPage />} />
              
              {/* Auth Routes */}
              <Route path="/login" element={<LoginPage addToast={addToast} />} />
              <Route path="/register" element={<RegisterPage addToast={addToast} />} />
              
              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage addToast={addToast} />} />
                {/* Additional protected routes can be added here */}
              </Route>
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>

            <ToastContainer toasts={toasts} removeToast={removeToast} />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
