// Application footer with copyright information and mandatory links to Privacy and Terms.
// Rendered at the bottom of all screens.

import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-subtle)',
        padding: 'var(--space-6) var(--space-4)',
        marginTop: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
          fontSize: '0.8125rem',
          color: 'var(--color-text-muted)',
        }}
      >
        <div>
          <span>PhotoDrop. Full quality event photo sharing.</span>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <Link
            to="/privacy"
            style={{
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
            }}
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms"
            style={{
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
            }}
          >
            Terms and Conditions
          </Link>
        </div>
      </div>
    </footer>
  );
}
