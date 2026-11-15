// Register screen component for creating a new user account.
// Captures display name, email, and password, displays server validation errors, and logs in immediately on success.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

export default function Register() {
  useDocumentMeta('Create an account', 'Create an account to start sharing full resolution photos.');

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanName = displayName.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setError('Display name is required.');
      return;
    }

    if (!cleanEmail) {
      setError('Email address is required.');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(cleanEmail, cleanName, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to create account. Please check your information.');
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
            Create an account
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-muted)',
              margin: 0,
            }}
          >
            Sign up to create events and share full-quality photos.
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
              htmlFor="displayName"
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 500,
                marginBottom: 'var(--space-1)',
                color: 'var(--color-text)',
              }}
            >
              Full name or nickname
            </label>
            <input
              id="displayName"
              type="text"
              autoComplete="name"
              required
              className="input"
              placeholder="Alex Johnson"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

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
              autoComplete="new-password"
              required
              className="input"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
            <span
              style={{
                display: 'block',
                fontSize: '0.75rem',
                color: 'var(--color-text-subtle)',
                marginTop: 'var(--space-1)',
              }}
            >
              Must contain letters and numbers.
            </span>
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
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <UserPlus size={16} />
                <span>Create account</span>
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
          Already have an account?{' '}
          <Link
            to="/login"
            style={{
              color: 'var(--color-accent)',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
