// Top navigation bar showing application title, active user info, and authentication actions.
// Adapts cleanly between mobile screens (360px) and wide desktop displays (1600px).
// Includes inline display name editing, account deletion, and theme toggle.

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Camera,
  LogOut,
  User,
  LogIn,
  UserPlus,
  Trash2,
  AlertTriangle,
  Loader2,
  Sun,
  Moon,
  Compass,
  Pencil,
  Check,
  X,
  Mail,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

export default function Navbar() {
  const { user, isAuthenticated, logout, deleteAccount, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Profile modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Delete account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleLogout = () => {
    setShowProfileModal(false);
    logout();
    showToast('You have been logged out.', 'info');
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount();
      setShowDeleteModal(false);
      setShowProfileModal(false);
      showToast('Your account was deleted.', 'info');
      navigate('/');
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Open profile modal
  const openProfile = () => {
    setProfileNameInput(user?.display_name || '');
    setShowProfileModal(true);
  };

  // Save updated display name
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    const clean = profileNameInput.trim();
    if (!clean) {
      showToast('Display name cannot be empty.', 'error');
      return;
    }
    setIsSavingProfile(true);
    try {
      await updateProfile(clean);
      showToast('Profile updated successfully.', 'success');
      setShowProfileModal(false);
    } catch (err) {
      showToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setIsSavingProfile(false);
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
          {/* Brand logo */}
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

          <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="btn btn-secondary"
              style={{ padding: '0.375rem 0.5rem' }}
              title={theme === 'dark' ? 'Switch to Ocean Light' : 'Switch to Ocean Abyss Dark'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun size={15} color="var(--color-warning)" />
              ) : (
                <Moon size={15} color="var(--color-accent)" />
              )}
            </button>

            {isAuthenticated ? (
              <>
                {/* Events link */}
                <Link
                  to="/events"
                  className={
                    location.pathname.startsWith('/events') ? 'btn btn-primary' : 'btn btn-secondary'
                  }
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                >
                  <Compass size={14} />
                  <span>Events</span>
                </Link>

                {/* Profile button */}
                <button
                  type="button"
                  onClick={openProfile}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.375rem 0.625rem',
                    fontSize: '0.8125rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                  }}
                  title="View and edit profile"
                >
                  <User size={14} color="var(--color-accent)" />
                  <span
                    style={{
                      maxWidth: '120px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {user?.display_name || user?.email}
                  </span>
                </button>

                {/* Log out */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn btn-secondary"
                  style={{ padding: '0.375rem 0.625rem', fontSize: '0.8125rem' }}
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

      {/* User Profile Modal */}
      {showProfileModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="User Profile"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 16, 26, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
            zIndex: 90,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowProfileModal(false);
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: 'var(--color-bg-subtle)',
              position: 'relative',
              boxSizing: 'border-box',
            }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowProfileModal(false)}
              aria-label="Close profile"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>

            {/* Profile Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-5)',
                paddingBottom: 'var(--space-4)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--color-accent-subtle)',
                  color: 'var(--color-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '1.25rem',
                  flexShrink: 0,
                }}
              >
                {(user?.display_name || user?.email || 'U')[0].toUpperCase()}
              </div>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'var(--color-text)',
                  }}
                >
                  {user?.display_name || 'User Profile'}
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Manage your account details and profile information
                </p>
              </div>
            </div>

            {/* Profile Edit Form */}
            <form onSubmit={handleSaveProfile} noValidate>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label
                  htmlFor="profile-display-name"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    marginBottom: 'var(--space-1)',
                    color: 'var(--color-text)',
                  }}
                >
                  Display Name
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="profile-display-name"
                    type="text"
                    required
                    maxLength={100}
                    className="input"
                    value={profileNameInput}
                    onChange={(e) => setProfileNameInput(e.target.value)}
                    disabled={isSavingProfile}
                    placeholder="Your name or nickname"
                    style={{ paddingLeft: '2.25rem' }}
                  />
                  <Pencil
                    size={14}
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-text-muted)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label
                  htmlFor="profile-email"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    marginBottom: 'var(--space-1)',
                    color: 'var(--color-text)',
                  }}
                >
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="profile-email"
                    type="email"
                    readOnly
                    className="input"
                    value={user?.email || ''}
                    style={{
                      paddingLeft: '2.25rem',
                      opacity: 0.85,
                      backgroundColor: 'var(--color-bg-muted)',
                      cursor: 'not-allowed',
                    }}
                  />
                  <Mail
                    size={14}
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-text-muted)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    color: 'var(--color-text-subtle)',
                    marginTop: 'var(--space-1)',
                  }}
                >
                  Email address cannot be changed.
                </span>
              </div>

              {user?.created_at && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-muted)',
                    marginBottom: 'var(--space-5)',
                    padding: 'var(--space-2) var(--space-3)',
                    backgroundColor: 'var(--color-bg-muted)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <Calendar size={14} color="var(--color-accent)" />
                  <span>
                    Member since{' '}
                    {new Date(user.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  marginTop: 'var(--space-4)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="btn btn-secondary"
                  style={{
                    color: 'var(--color-danger)',
                    borderColor: 'var(--color-danger)',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.8125rem',
                  }}
                >
                  <Trash2 size={13} />
                  <span>Delete account</span>
                </button>

                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="btn btn-secondary"
                    style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                    disabled={isSavingProfile}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: '0.375rem 1rem', fontSize: '0.8125rem' }}
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Save changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
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
            style={{ width: '100%', maxWidth: '440px', backgroundColor: 'var(--color-bg)' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-3)',
              }}
            >
              <AlertTriangle size={20} color="var(--color-danger)" />
              <h3
                style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)' }}
              >
                Delete my account
              </h3>
            </div>

            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-muted)',
                lineHeight: 1.5,
                marginBottom: 'var(--space-4)',
              }}
            >
              This permanently removes your account, all photos you uploaded, and any events you
              created. This cannot be undone.
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
                onClick={() => { setShowDeleteModal(false); setDeleteError(''); }}
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
