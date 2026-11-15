// Reminder: Have this text reviewed by a qualified legal advisor before any public launch.
// Privacy Policy written in plain English explaining real application data handling, photo visibility, and deletion.

import { useDocumentMeta } from '../hooks/useDocumentMeta';

export default function Privacy() {
  useDocumentMeta('Privacy Policy', 'Privacy policy for PhotoDrop detailing photo storage, access, and deletion.');
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
          Privacy Policy
        </h1>
        <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.875rem' }}>
          Effective date: November 15, 2026. Applicable to [Project Name].
        </p>
      </div>

      <section style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
          1. Information We Collect
        </h2>
        <p style={{ color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
          We collect only the minimal information required to operate [Project Name]:
        </p>
        <ul style={{ paddingLeft: 'var(--space-6)', color: 'var(--color-text)', margin: '0 0 var(--space-4) 0' }}>
          <li style={{ marginBottom: 'var(--space-2)' }}>
            <strong>Account details:</strong> When you register, we collect your email address and display name. Your password is cryptographically hashed before being stored in our database: we never see or store plain text passwords.
          </li>
          <li style={{ marginBottom: 'var(--space-2)' }}>
            <strong>Uploaded photos:</strong> When you upload images, we store the original untouched file on our storage volume, along with generated previews and thumbnails for faster browsing.
          </li>
          <li style={{ marginBottom: 'var(--space-2)' }}>
            <strong>Photo metadata:</strong> We extract the date the photo was taken from EXIF data to enable sorting and day filtering.
          </li>
          <li>
            <strong>Session tokens:</strong> We use JSON Web Tokens (JWT) stored in your browser storage to keep you securely signed in.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
          2. Who Can See Your Photos
        </h2>
        <p style={{ color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
          Your photos are private and never indexed by search engines or shared publicly:
        </p>
        <ul style={{ paddingLeft: 'var(--space-6)', color: 'var(--color-text)', margin: '0 0 var(--space-4) 0' }}>
          <li style={{ marginBottom: 'var(--space-2)' }}>
            <strong>Event members only:</strong> Photos uploaded to an event are only visible to confirmed members of that specific event.
          </li>
          <li style={{ marginBottom: 'var(--space-2)' }}>
            <strong>Invite links:</strong> Anyone with the event invite code can join. Public invite preview links show only the event title and member count, never photos or member identities.
          </li>
          <li>
            <strong>No third party sharing:</strong> We do not sell, rent, or share personal data or photos with advertisers or third party brokers.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
          3. Photo and Account Deletion
        </h2>
        <p style={{ color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
          We respect your right to completely remove your content:
        </p>
        <ul style={{ paddingLeft: 'var(--space-6)', color: 'var(--color-text)', margin: '0 0 var(--space-4) 0' }}>
          <li style={{ marginBottom: 'var(--space-2)' }}>
            <strong>Individual photo deletion:</strong> The uploader of a photo and the event owner can delete any photo at any time. Deletion permanently erases the original file, preview images, thumbnails, and database records.
          </li>
          <li style={{ marginBottom: 'var(--space-2)' }}>
            <strong>Account deletion:</strong> You can permanently delete your account at any time using the Delete Account option in the top navigation bar.
          </li>
          <li>
            <strong>What happens when you delete your account:</strong> Your user profile is deleted, all photos you uploaded across all events are permanently purged from server disks, and any events you created as the owner are deleted along with their photos.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
          4. Contact and Jurisdiction
        </h2>
        <p style={{ color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>
          If you have questions regarding this privacy policy or requests concerning your data, please contact:
        </p>
        <p style={{ color: 'var(--color-text)', fontWeight: 500, margin: '0 0 var(--space-2) 0' }}>
          Email: [Contact Email]
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>
          This policy is governed by the laws of [Governing Law].
        </p>
      </section>
    </div>
  );
}
