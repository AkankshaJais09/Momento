// Login screen component for authenticating existing users with email and password.
// Displays clear validation or server errors and redirects to the home page on success.

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

export default function Login() {
  useDocumentMeta('Log in', 'Sign in to access your shared event albums and photos.');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Destination after login, defaulting to home page
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Email address is required.');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(cleanEmail, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to log in. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '420px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              lineHeight: 1.25,
              margin: '0 0 var(--space-2) 0',
              color: 'var(--color-text)',
            }}
          >
            Log in to PhotoDrop
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-muted)',
              margin: 0,
            }}
          >
            Enter your email and password to access your events.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-2)',
              padding: 'var(--space-3)',
              marginBottom: 'var(--space-4)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(201, 42, 42, 0.1)',
              border: '1px solid var(--color-danger)',
              color: 'var(--color-danger)',
              fontSize: '0.875rem',
              lineHeight: 1.4,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 500,
                marginBottom: 'var(--space-1)',
                color: 'var(--color-text)',
              }}
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div style={{ marginBottom: 'var(--space-6)' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 500,
                marginBottom: 'var(--space-1)',
                color: 'var(--color-text)',
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className="input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ width: '100%', padding: '0.625rem 1rem' }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Logging in...</span>
              </>
            ) : (
              <>
                <LogIn size={16} />
                <span>Log in</span>
              </>
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: 'var(--space-6)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-border)',
            textAlign: 'center',
            fontSize: '0.875rem',
            color: 'var(--color-text-muted)',
          }}
        >
          Do not have an account?{' '}
          <Link
            to="/register"
            style={{
              color: 'var(--color-accent)',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
