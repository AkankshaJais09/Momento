// Top navigation bar showing application title, active user info, and authentication actions.
// Adapts cleanly between mobile screens (360px) and wide desktop displays (1600px).
// Includes an account deletion option with confirmation modal.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, LogOut, User, LogIn, UserPlus, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, logout, deleteAccount } = useAuth();
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount();
      setShowDeleteModal(false);
      navigate('/');
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <header
        style={{
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0.75rem var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-4)',
          }}
        >
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              textDecoration: 'none',
              color: 'var(--color-text)',
              fontWeight: 600,
              fontSize: '1.125rem',
            }}
          >
            <Camera size={20} color="var(--color-accent)" />
            <span>PhotoDrop</span>
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {isAuthenticated ? (
              <>
                <Link
                  to="/events"
                  style={{
                    color: 'var(--color-text)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    marginRight: 'var(--space-2)',
                  }}
                >
                  Events
                </Link>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    fontSize: '0.875rem',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <User size={16} />
                  <span
                    style={{
                      maxWidth: '160px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'var(--color-text)',
                      fontWeight: 500,
                    }}
                  >
                    {user?.display_name || user?.email}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.375rem 0.625rem',
                    fontSize: '0.75rem',
                    color: 'var(--color-danger)',
                  }}
                  title="Delete my account"
                >
                  <Trash2 size={13} />
                  <span>Delete account</span>
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className="btn btn-secondary"
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                  aria-label="Log out"
                >
                  <LogOut size={14} />
                  <span>Log out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="btn btn-secondary"
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                >
                  <LogIn size={14} />
                  <span>Log in</span>
                </Link>
                <Link
                  to="/register"
                  className="btn btn-primary"
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                >
                  <UserPlus size={14} />
                  <span>Register</span>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
            zIndex: 100,
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '440px',
              backgroundColor: 'var(--color-bg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              <AlertTriangle size={20} color="var(--color-danger)" />
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)' }}>
                Delete my account
              </h3>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 'var(--space-4)' }}>
              Are you sure you want to delete your account? This action permanently removes your account,
              all photos you uploaded, and any events you created. This cannot be undone.
            </p>

            {deleteError && (
              <div
                role="alert"
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(201, 42, 42, 0.1)',
                  border: '1px solid var(--color-danger)',
                  color: 'var(--color-danger)',
                  fontSize: '0.8125rem',
                  marginBottom: 'var(--space-3)',
                }}
              >
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError('');
                }}
                disabled={isDeleting}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="btn btn-danger"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete my account</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
