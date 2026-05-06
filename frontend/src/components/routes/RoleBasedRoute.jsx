import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';
import Button from '../ui/Button';

const RoleBasedRoute = ({ allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user?.role)) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto">
            <ShieldAlert size={40} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">403 Forbidden</h1>
            <p className="text-slate-400">
              You do not have permission to access this page. Please contact your administrator if you believe this is a mistake.
            </p>
          </div>
          <Button 
            variant="primary" 
            onClick={() => window.location.href = '/dashboard'}
            className="w-full"
          >
            Go back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default RoleBasedRoute;
