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
}
