// Reminder: Have this text reviewed by a qualified legal advisor before any public launch.
// Terms and Conditions written in plain English explaining user rights, photo ownership, and service rules.

import { useDocumentMeta } from '../hooks/useDocumentMeta';

export default function Terms() {
  useDocumentMeta('Terms and Conditions', 'Terms and conditions for using the PhotoDrop shared album platform.');
  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: 'var(--space-12) var(--space-4)',
        lineHeight: 1.6,
      }}
    >
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 700,
            margin: '0 0 var(--space-2) 0',
            color: 'var(--color-text)',
          }}
        >
          Terms and Conditions
        </h1>
        <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.875rem' }}>
          Effective date: November 15, 2026. Applicable to [Project Name].
        </p>
      </div>

      <section style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
          1. Acceptance of Terms
        </h2>
        <p style={{ color: 'var(--color-text)', margin: 0 }}>
          By creating an account, joining an event, or uploading photos to [Project Name], you agree to these
          Terms and Conditions. If you do not agree, please do not use the service.
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
          2. Accounts and Responsibilities
        </h2>
        <p style={{ color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
          You are responsible for your account activity:
        </p>
        <ul style={{ paddingLeft: 'var(--space-6)', color: 'var(--color-text)', margin: 0 }}>
          <li style={{ marginBottom: 'var(--space-2)' }}>
            You must provide a valid email address and keep your password secure.
          </li>
          <li style={{ marginBottom: 'var(--space-2)' }}>
            You are responsible for any invite codes you share with third parties. Anyone with an invite code can view photos in that event.
          </li>
          <li>
            You must be at least 13 years of age to register an account.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
          3. Photo Ownership and Permissions
        </h2>
        <p style={{ color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
          We respect intellectual property and content ownership:
        </p>
        <ul style={{ paddingLeft: 'var(--space-6)', color: 'var(--color-text)', margin: 0 }}>
          <li style={{ marginBottom: 'var(--space-2)' }}>
            <strong>You own your photos:</strong> You retain complete ownership and copyright of any photographs you upload to [Project Name].
          </li>
          <li style={{ marginBottom: 'var(--space-2)' }}>
            <strong>Event member license:</strong> By uploading a photo to a shared event, you grant confirmed members of that event permission to view, favorite, and download that photo.
          </li>
          <li>
            <strong>Photo limits:</strong> Each file must be in JPEG, PNG, or WebP format and under 25MB in size. We do not recompress your original files.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
          4. Prohibited Content
        </h2>
        <p style={{ color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
          You agree not to upload content that:
        </p>
        <ul style={{ paddingLeft: 'var(--space-6)', color: 'var(--color-text)', margin: 0 }}>
          <li style={{ marginBottom: 'var(--space-2)' }}>
            Infringes on the intellectual property or privacy rights of any person.
          </li>
          <li style={{ marginBottom: 'var(--space-2)' }}>
            Contains unlawful, harassing, defamatory, or exploitative material.
          </li>
          <li>
            Contains malicious software, viruses, or harmful scripts.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
          5. Termination and Account Deletion
        </h2>
        <p style={{ color: 'var(--color-text)', margin: 0 }}>
          You may delete your account and all associated photos at any time through your account navigation menu.
          Event owners may delete events they manage. We reserve the right to suspend accounts or remove content
          that violates these terms.
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
          6. Governing Law and Inquiries
        </h2>
        <p style={{ color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>
          These terms are governed by and construed in accordance with the laws of [Governing Law].
        </p>
        <p style={{ color: 'var(--color-text)', margin: '0 0 var(--space-2) 0' }}>
          For inquiries or notices regarding these terms, please contact:
        </p>
        <p style={{ color: 'var(--color-text)', fontWeight: 500, margin: 0 }}>
          Email: [Contact Email]
        </p>
      </section>
    </div>
  );
}
