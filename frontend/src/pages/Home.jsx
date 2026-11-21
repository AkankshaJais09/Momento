<<<<<<< HEAD
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const CAPTIONS = [
  'dance floor', 'the toast', 'garden', 'late night',
  'golden hour', 'sunset walk', 'the squad', 'cake chaos',
  'first dance', 'road trip', 'sparklers', 'front row',
  'selfie time', 'best table', 'rooftop', 'last song',
]

const PHOTO_COLORS = [
  ['#F2A65A', '#C4572B'],
  ['#8FB3D9', '#2F5A8A'],
  ['#9CB89A', '#4F6F57'],
  ['#E7B7C8', '#9B5C86'],
  ['#F3D58A', '#B7862B'],
  ['#C6D8EC', '#5C7FA8'],
  ['#BFE3D6', '#3F8F7A'],
  ['#F3C9A8', '#B5703F'],
]

const TILTS = [-6, 4, -3, 7, -5, 3, -7, 5]

const POLAROIDS = Array.from({ length: 28 }, (_, index) => {
  const row = Math.floor(index / 7)
  const column = index % 7

  return {
    caption: CAPTIONS[index % CAPTIONS.length],
    color: PHOTO_COLORS[index % PHOTO_COLORS.length],
    tilt: TILTS[index % TILTS.length],
    left: -60 + column * 230 + (row % 2 ? 115 : 0),
    top: -40 + row * 240,
    mobileLeft: index % 2 ? 'calc(50vw - 20px)' : '-30px',
    mobileTop: 40 + Math.floor(index / 2) * 170,
  }
})

const FEATURES = ['Photos', 'Voice notes', 'Time capsule', 'Photo quests']

export default function Home() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const initial = (user?.display_name || user?.email || 'M').trim().charAt(0).toUpperCase()

  return (
    <div className="home-page">
      <div className="home-wall" aria-hidden="true">
        {POLAROIDS.map((photo, index) => (
          <figure
            key={index}
            className="home-polaroid"
            style={{
              '--desktop-left': `${photo.left}px`,
              '--desktop-top': `${photo.top}px`,
              '--mobile-left': photo.mobileLeft,
              '--mobile-top': `${photo.mobileTop}px`,
              '--photo-tilt': `${photo.tilt}deg`,
              '--photo-start': photo.color[0],
              '--photo-end': photo.color[1],
            }}
          >
            <span className="home-polaroid__photo" />
            <figcaption>{photo.caption}</figcaption>
          </figure>
        ))}
      </div>

      <header className="home-header">
        <span className="home-header__brand">MOMENTO</span>
        <nav className="home-header__nav" aria-label="Main navigation">
          <Link to="/dashboard" className="home-header__link">My events</Link>
          {user ? (
            <>
              <button type="button" className="home-header__link" onClick={logout}>Log out</button>
              <span className="home-header__avatar" aria-hidden="true">{initial}</span>
            </>
          ) : (
            <Link to="/login" className="home-header__link">Log in</Link>
          )}
        </nav>
      </header>

      <main className="home-main">
        <div className="home-card-wrap">
          <section className="home-card" aria-labelledby="home-title">
            <p className="home-label">For parties, trips and weddings</p>
            <h1 className="home-title" id="home-title">
              Your night,<br />
              <span>together.</span>
            </h1>
            <p className="home-description">
              One wall for every photo, voice note and comment from the people who were there.
            </p>
            <div className="home-actions-row">
              <button type="button" className="home-button home-button--primary" onClick={() => navigate('/create')}>
                Start a Momento
              </button>
              <button type="button" className="home-button home-button--secondary" onClick={() => navigate('/join', { state: { role: 'guest' } })}>
                I have a link
              </button>
            </div>
            <div className="home-chips" aria-label="Momento features">
              {FEATURES.map((feature) => <span className="home-chip" key={feature}>{feature}</span>)}
            </div>
          </section>

          <span className="home-pill home-pill--love" aria-hidden="true">♥ 14</span>
          <span className="home-pill home-pill--voice" aria-hidden="true">
            <span className="home-pill__play">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 1.8v8.4L10 6 3 1.8Z" fill="white" />
              </svg>
            </span>
            0:12 · Riya
          </span>
          <span className="home-pill home-pill--activity" aria-hidden="true">Meera added 3 photos</span>
        </div>
      </main>
    </div>
  )
=======
// Home page: minimal centered layout with dark ocean mood.
// Just a strong headline, subtitle, and one primary CTA button.
// No testimonials, no counters, no stock photos, no AI imagery.

import { Link } from 'react-router-dom';
import { ArrowRight, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

export default function Home() {
  const { isAuthenticated } = useAuth();

  useDocumentMeta(
    'PhotoDrop - Full Quality Event Photo Sharing',
    'One shared album for your group. Everyone uploads, everyone downloads at full quality.'
  );

  return (
    // Full-height dark ocean panel filling the viewport below the navbar
    <div
      style={{
        minHeight: 'calc(100vh - 57px)',
        backgroundColor: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8) var(--space-4)',
        textAlign: 'center',
      }}
    >
      {/* Small icon mark above headline */}
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-bg-muted)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--space-6)',
          color: 'var(--color-accent)',
        }}
      >
        <Camera size={24} />
      </div>

      {/* Main headline */}
      <h1
        style={{
          fontSize: 'clamp(2rem, 5vw, 3.25rem)',
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.03em',
          margin: '0 0 var(--space-4) 0',
          color: 'var(--color-text)',
          maxWidth: '640px',
        }}
      >
        One album.{' '}
        <span style={{ color: 'var(--color-accent)' }}>Everyone&apos;s</span>{' '}
        photos.
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontSize: 'clamp(1rem, 2.5vw, 1.1875rem)',
          lineHeight: 1.65,
          color: 'var(--color-text-muted)',
          margin: '0 0 var(--space-8) 0',
          maxWidth: '480px',
        }}
      >
        Create a shared event album, invite your group, and collect every photo
        at full resolution. No compression. No sign-up friction.
      </p>

      {/* Single primary CTA */}
      <Link
        to={isAuthenticated ? '/events' : '/register'}
        className="btn btn-primary"
        style={{
          padding: '0.8125rem 2rem',
          fontSize: '1rem',
          fontWeight: 600,
          letterSpacing: '0.01em',
        }}
      >
        <span>{isAuthenticated ? 'Open my events' : 'Get started free'}</span>
        <ArrowRight size={18} />
      </Link>

      {/* Secondary sign-in link for returning users */}
      {!isAuthenticated && (
        <p
          style={{
            marginTop: 'var(--space-4)',
            fontSize: '0.875rem',
            color: 'var(--color-text-subtle)',
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
        </p>
      )}

      {/* Three short facts row — no icons, no cards, plain text dividers */}
      <div
        style={{
          marginTop: 'var(--space-16)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-6)',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {[
          'Full-resolution uploads',
          'Shared invite link',
          'Zip download',
        ].map((fact, i, arr) => (
          <div key={fact} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
            <span
              style={{
                fontSize: '0.8125rem',
                color: 'var(--color-text-subtle)',
                fontWeight: 500,
                letterSpacing: '0.02em',
              }}
            >
              {fact}
            </span>
            {/* Divider between items, not after last */}
            {i < arr.length - 1 && (
              <span
                style={{
                  display: 'block',
                  width: '1px',
                  height: '14px',
                  backgroundColor: 'var(--color-border)',
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
>>>>>>> 898b826f7d4c2eb9d89ffa11785bb347e39fe93f
}
