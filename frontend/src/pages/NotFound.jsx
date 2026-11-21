// 404 Not Found screen displayed when a visitor navigates to an unrecognized URL route.
// Provides a clear message and a button to return to the home page.

import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

export default function NotFound() {
  useDocumentMeta('Page Not Found', 'The requested page could not be found.');

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 160px)',
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
          maxWidth: '440px',
          textAlign: 'center',
          padding: 'var(--space-12) var(--space-6)',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-bg-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-muted)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <FileQuestion size={24} />
        </div>

        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            margin: '0 0 var(--space-2) 0',
            color: 'var(--color-text)',
          }}
        >
          Page not found
        </h1>

        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.5,
            margin: '0 0 var(--space-6) 0',
          }}
        >
          The link you followed does not exist, or the page has been removed.
        </p>

        <Link
          to="/"
          className="btn btn-primary"
          style={{ padding: '0.625rem 1.25rem' }}
        >
          <ArrowLeft size={16} />
          <span>Return to home</span>
        </Link>
      </div>
    </div>
  );
}
