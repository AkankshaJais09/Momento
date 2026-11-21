<<<<<<< HEAD
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import MomentoShell from '../components/MomentoShell'
import PageHeader from '../components/PageHeader'
import { request } from '../api'

function extractInviteCode(value) {
  const trimmed = value.trim()
  try {
    const url = new URL(trimmed)
    return url.searchParams.get('code') || url.searchParams.get('invite') || ''
  } catch {
    return trimmed
  }
}

export default function JoinEvent() {
  const [searchParams] = useSearchParams()
  const [invite, setInvite] = useState(searchParams.get('code') || '')
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setJoining(true)
    try {
      const result = await request('/events/join/', {
        method: 'POST',
        body: JSON.stringify({ invite_code: extractInviteCode(invite) }),
      })
      navigate(`/events/${result.event.id}`)
    } catch (err) {
      setError(err.message || 'Could not join this Momento.')
    } finally {
      setJoining(false)
    }
  }

  return (
    <MomentoShell>
      <main className="momento-scroll">
        <PageHeader label="Join a Momento" title="I have a link" />
        <form id="join-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="invite-link">Invite link or code</label>
            <input
              id="invite-link"
              className="input"
              value={invite}
              onChange={(event) => setInvite(event.target.value)}
              autoComplete="url"
              required
            />
          </div>
          {error ? <p role="alert" style={{ color: 'var(--color-accent)', marginTop: 16 }}>{error}</p> : null}
        </form>
      </main>
      <button type="submit" form="join-form" className="btn btn-primary btn-pinned" disabled={joining}>
        {joining ? 'Joining…' : 'Go to the wall'}
      </button>
    </MomentoShell>
  )
=======
// Join Event page allowing invited guests to preview an event and join using an invite code.
// Fetches public preview details and sends a join request for authenticated users.

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Users, AlertCircle, CheckCircle2, LogIn, UserPlus, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

export default function JoinEvent() {
  const { code } = useParams();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
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
      showToast('Successfully joined event!', 'success');
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
>>>>>>> 898b826f7d4c2eb9d89ffa11785bb347e39fe93f
}
