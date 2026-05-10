import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const DepartmentRoute = ({ allowedDepartments }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'admin') {
    return <Outlet />;
  }

  const department = String(user?.department || '').trim().toLowerCase();
  const allowed = allowedDepartments.map(item => String(item).trim().toLowerCase());

  if (!allowed.includes(department)) {
    return <Navigate to="/employee/dashboard" replace />;
  }

  return <Outlet />;
};

export default DepartmentRoute;
