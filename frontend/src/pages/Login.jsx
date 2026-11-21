// Login screen component for authenticating existing users with email and password.
// Displays clear validation or server errors and redirects to the home page on success.

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, LogIn, Loader2, Eye, EyeOff, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

export default function Login() {
  useDocumentMeta('Log in', 'Sign in to access your shared event albums and photos.');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Show/hide password toggle
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password modal state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Destination after login, defaulting to home page
  const from = location.state?.from?.pathname || '/';

  // Handle forgot password: show a simple info message (no backend endpoint exists)
  const handleForgotPassword = (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      showToast('Please enter your email address.', 'error');
      return;
    }
    showToast('If this email is registered, your administrator will contact you to reset your password.', 'success');
    setShowForgotPassword(false);
    setForgotEmail('');
  };

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
      showToast('Logged in successfully.', 'success');
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
            {/* Label row: "Password" on left, "Forgot password?" on right */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
              <label
                htmlFor="password"
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--color-text)',
                }}
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => { setShowForgotPassword(true); setForgotEmail(email); }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: '0.8125rem',
                  color: 'var(--color-accent)',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Forgot password?
              </button>
            </div>

            {/* Password input with show/hide toggle */}
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '0.625rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  padding: '0.25rem',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
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

      {/* Forgot password modal overlay */}
      {showForgotPassword && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Reset password"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            backgroundColor: 'rgba(5, 16, 26, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowForgotPassword(false); }}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '380px', boxSizing: 'border-box' }}
          >
            <h2
              style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                margin: '0 0 var(--space-2) 0',
                color: 'var(--color-text)',
              }}
            >
              Reset your password
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-muted)',
                margin: '0 0 var(--space-4) 0',
                lineHeight: 1.5,
              }}
            >
              Enter your email address and your administrator will contact you with reset instructions.
            </p>

            <form onSubmit={handleForgotPassword} noValidate>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label
                  htmlFor="forgot-email"
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
                <div style={{ position: 'relative' }}>
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    className="input"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    style={{ paddingLeft: '2.25rem' }}
                  />
                  <Mail
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '0.625rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-text-muted)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowForgotPassword(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  Send request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
