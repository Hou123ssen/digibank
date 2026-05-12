import React from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const DepartmentRoute = ({ allowedDepartments }) => {
  const { user, isAuthenticated, loading, hasDepartment } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Admins bypass all department checks
  if (user?.role === 'admin') {
    return <Outlet />;
  }

  const hasAccess = allowedDepartments.some(dept => hasDepartment(dept));

  if (!hasAccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-6">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto">
            <ShieldAlert size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Accès refusé</h1>
            <p className="text-slate-400 text-sm">
              Ce département ne fait pas partie de vos attributions.
              Contactez votre administrateur si nécessaire.
            </p>
          </div>
          <button
            onClick={() => navigate('/employee/dashboard')}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default DepartmentRoute;
