import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const RoleProtectedRoute = ({ children, allowedRole }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has the required role
  if (allowedRole && user.role !== allowedRole) {
    // Redirect to appropriate dashboard based on role
    if (user.role === 'teacher') {
      return <Navigate to="/teacher/dashboard" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default RoleProtectedRoute;
