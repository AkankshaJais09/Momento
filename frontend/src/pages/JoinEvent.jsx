// Join Event page allowing invited guests to preview an event and join using an invite code.
// Fetches public preview details and sends a join request for authenticated users.

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Users, AlertCircle, CheckCircle2, LogIn, UserPlus, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

export default function JoinEvent() {
  const { code } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [preview, setPreview] = useState(null);

  useDocumentMeta(
    preview?.name ? `Join ${preview.name}` : 'Join Event',
    'Join a shared photo album and upload your photos at full resolution.'
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);

  // Fetch public event preview information on load
  useEffect(() => {
    let isMounted = true;
    async function fetchPreview() {
      setLoading(true);
      setError('');
      try {
        const data = await api.get(`/events/invite/${code}/`);
        if (isMounted) {
          setPreview(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Invalid or expired invite link.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (code) {
      fetchPreview();
    }

    return () => {
      isMounted = false;
    };
  }, [code]);

  // Submit join request to the backend for the authenticated user
  const handleJoin = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }

    setJoining(true);
    setError('');
    try {
      const response = await api.post('/events/join/', { invite_code: code });
      setJoinSuccess(true);
      const eventId = response.event?.id || response.event?.pk;
      setTimeout(() => {
        if (eventId) {
          navigate(`/events/${eventId}`);
        } else {
          navigate('/events');
        }
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to join event.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 140px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6) var(--space-4)',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '480px',
          boxSizing: 'border-box',
        }}
      >
        {loading && (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-8) var(--space-4)',
              color: 'var(--color-text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-3)',
            }}
          >
            <Loader2 size={24} className="animate-spin" />
            <p style={{ margin: 0, fontSize: '0.9375rem' }}>Loading invite details...</p>
          </div>
        )}

        {error && !loading && (
          <div>
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-2)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(201, 42, 42, 0.1)',
                border: '1px solid var(--color-danger)',
                color: 'var(--color-danger)',
                fontSize: '0.875rem',
                lineHeight: 1.5,
                marginBottom: 'var(--space-6)',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: 'var(--space-1)' }}>
                  Invite Error
                </strong>
                <span>{error}</span>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <Link to="/" className="btn btn-secondary" style={{ width: '100%' }}>
                <span>Return to home</span>
              </Link>
            </div>
          </div>
        )}

        {preview && !loading && !error && (
          <div>
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--color-accent)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                Event Invitation
              </span>
              <h1
                style={{
                  fontSize: '1.625rem',
                  fontWeight: 600,
                  lineHeight: 1.25,
                  margin: '0 0 var(--space-2) 0',
                  color: 'var(--color-text)',
                }}
              >
                {preview.name}
              </h1>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text-muted)',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                You were invited to view and upload full-quality photos for this event.
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
                padding: 'var(--space-3) var(--space-4)',
                backgroundColor: 'var(--color-bg-muted)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 'var(--space-6)',
                fontSize: '0.875rem',
                color: 'var(--color-text)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Users size={16} color="var(--color-text-muted)" />
                <span>
                  {preview.member_count} {preview.member_count === 1 ? 'member' : 'members'} joined
                </span>
              </div>
            </div>

            {joinSuccess && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(47, 158, 68, 0.1)',
                  border: '1px solid var(--color-success)',
                  color: 'var(--color-success)',
                  fontSize: '0.875rem',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <CheckCircle2 size={16} />
                <span>Joined event successfully. Opening event page...</span>
              </div>
            )}

            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleJoin}
                disabled={joining || joinSuccess}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.625rem 1rem' }}
              >
                {joining ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Joining event...</span>
                  </>
                ) : (
                  <>
                    <span>Join event</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            ) : (
              <div>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--color-text-muted)',
                    marginBottom: 'var(--space-4)',
                    textAlign: 'center',
                  }}
                >
                  Please log in or create an account to join this event.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <Link
                    to="/login"
                    state={{ from: location }}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.625rem 1rem' }}
                  >
                    <LogIn size={16} />
                    <span>Log in to join</span>
                  </Link>
                  <Link
                    to="/register"
                    state={{ from: location }}
                    className="btn btn-secondary"
                    style={{ width: '100%', padding: '0.625rem 1rem' }}
                  >
                    <UserPlus size={16} />
                    <span>Create account to join</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
