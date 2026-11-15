// Route protection wrapper ensuring only logged-in users can access protected views.
// Shows a minimal loading indicator while checking session tokens and redirects unauthenticated users to login.

import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: 'var(--space-2)',
          color: 'var(--color-text-muted)',
          fontSize: '0.875rem',
        }}
      >
        <Loader2 size={18} className="animate-spin" />
        <span>Loading session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
