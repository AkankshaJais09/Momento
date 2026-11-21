import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import MomentoShell from '../components/MomentoShell'
import PageHeader from '../components/PageHeader'
import DeleteEventDialog from '../components/DeleteEventDialog'
import { request } from '../api'
import { loadEventPhotoPage } from '../eventHelpers'
import { setDashboardNotice } from '../dashboardNotice'

function ToolIcon({ type }) {
  if (type === 'people') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.5 19v-1.2A4.8 4.8 0 0 1 8.3 13h1.4a4.8 4.8 0 0 1 4.8 4.8V19M16 5.3a3 3 0 0 1 0 5.8m1.7 2.2a4.8 4.8 0 0 1 2.8 4.4V19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }
  if (type === 'settings') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="m19.4 15 .1.1a1.8 1.8 0 1 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 1 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3H3.8a1.8 1.8 0 1 1 0-3.6H4a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 1 1 3.6 0V2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 1 1 0 3.6H20a1.8 1.8 0 0 0-.6 3Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" transform="translate(0 2)" />
      </svg>
    )
  }
  if (type === 'film') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m9 6 10 6-10 6V6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M4 4v16M20 4v16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 19V5m0 14h16M8 15v-4m4 4V7m4 8v-6m4 6V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function ManageEvent() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [photos, setPhotos] = useState([])
  const [photoCount, setPhotoCount] = useState(0)
  const [photoPage, setPhotoPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [contributors, setContributors] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [eventData, photoPageData, people] = await Promise.all([
          request(`/events/${eventId}/`),
          loadEventPhotoPage(eventId, 1, true),
          request(`/events/${eventId}/contributors/`),
        ])
        if (!active) return
        setEvent(eventData)
        setPhotos(photoPageData.results)
        setPhotoCount(photoPageData.count)
        setPhotoPage(photoPageData.currentPage)
        setContributors(people)
      } catch {
        if (active) setError("We couldn't load the event details. Please try again.")
      }
    }
    load()
    return () => { active = false }
  }, [eventId])

  async function loadMorePhotos() {
    if (loadingMore || photos.length >= photoCount) return
    setLoadingMore(true)
    try {
      const nextPage = await loadEventPhotoPage(eventId, photoPage + 1, true)
      setPhotos((current) => [...current, ...nextPage.results])
      setPhotoPage(nextPage.currentPage)
    } catch {
      setError("We couldn't load more photos. Please try again.")
    } finally {
      setLoadingMore(false)
    }
  }

  async function closeUploads() {
    setSaving(true)
    setError('')
    try {
      const updated = await request(`/events/${eventId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ uploads_closed: true }),
      })
      setEvent(updated)
    } catch {
      setError("We couldn't close uploads. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  async function removePhoto(photoId) {
    setError('')
    const removed = photos.find((photo) => photo.id === photoId)
    try {
      await request(`/photos/${photoId}/`, { method: 'DELETE' })
      setPhotos((current) => current.filter((photo) => photo.id !== photoId))
      setPhotoCount((current) => Math.max(0, current - 1))
      if (removed?.uploader?.id) {
        setContributors((current) => current
          .map((person) => person.user_id === removed.uploader.id
            ? {
              ...person,
              photo_count: Math.max(0, person.photo_count - 1),
              voice_note_count: Math.max(0, person.voice_note_count - Number(Boolean(removed.voice_note_url))),
            }
            : person)
          .filter((person) => person.photo_count > 0 || person.voice_note_count > 0))
      }
    } catch {
      setError("We couldn't remove that photo. Please try again.")
    }
  }

  async function deleteEvent() {
    setDeleting(true)
    setDeleteError('')
    try {
      await request(`/events/${eventId}/`, { method: 'DELETE' })
      setDashboardNotice('Momento deleted')
      navigate('/dashboard')
    } catch {
      setDeleteError("We couldn't delete this Momento. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

  if (event && event.my_role !== 'owner') {
    return (
      <MomentoShell>
        <main className="momento-scroll manage-page">
          <PageHeader label="HOST TOOLS" title="Manage" />
          <p role="alert" className="manage-error">This page is only available to the host.</p>
        </main>
      </MomentoShell>
    )
  }

  const guestCount = contributors.filter((person) => person.photo_count > 0).length
  const voiceCount = contributors.reduce((total, person) => total + person.voice_note_count, 0)
  const loading = !event && !error
  const loadFailed = !event && Boolean(error)

  return (
    <MomentoShell wallColor={event?.wall_color} wallStyle={event?.wall_style || 'polaroid'}>
      <main className="momento-scroll manage-page">
        <PageHeader label="HOST TOOLS" title={`Manage · ${event?.name || 'Event'}`} />
        {error ? <p role="alert" className="manage-error">{error}</p> : null}

        <section className="manage-stats" aria-label="Event statistics">
          <article className="manage-stat">
            <strong>{photoCount}</strong>
            <span>Photos</span>
          </article>
          <article className="manage-stat">
            <strong>{guestCount}</strong>
            <span>Guests</span>
          </article>
          <article className="manage-stat">
            <strong>{voiceCount}</strong>
            <span>Voice notes</span>
          </article>
        </section>

        <nav className="manage-tools" aria-label="Host tools">
          <Link className="manage-tool" to={`/events/${eventId}/who-shared`}>
            <span className="manage-tool__icon"><ToolIcon type="people" /></span>
            <strong>Who shared</strong>
            <span className="manage-tool__description">See who added each moment.</span>
          </Link>
          <Link className="manage-tool" to={`/events/${eventId}/settings`}>
            <span className="manage-tool__icon"><ToolIcon type="settings" /></span>
            <strong>Settings</strong>
            <span className="manage-tool__description">Choose your wall and options.</span>
          </Link>
          <Link className="manage-tool manage-tool--film" to={`/events/${eventId}/film`}>
            <span className="manage-tool__icon"><ToolIcon type="film" /></span>
            <strong>Our Film</strong>
            <span className="manage-tool__description">Play the crowd's favourites.</span>
          </Link>
          <Link className="manage-tool" to={`/events/${eventId}/recap`}>
            <span className="manage-tool__icon"><ToolIcon type="recap" /></span>
            <strong>Recap</strong>
            <span className="manage-tool__description">Relive highlights and stats.</span>
          </Link>
        </nav>

        {loading ? (
          <p role="status" className="manage-loading">Loading photos…</p>
        ) : loadFailed ? null : photoCount ? (
          <>
            <section className="manage-photo-grid" aria-label="Event photos">
              {photos.map((photo, index) => (
                <article key={photo.id} className={`polaroid polaroid--tilt-${(index % 4) + 1} manage-photo`}>
                  <img
                    className="polaroid__image"
                    src={photo.medium_preview_url || photo.original_url}
                    alt={photo.caption || 'Shared event photo'}
                    loading="lazy"
                  />
                  <div className="manage-photo__footer">
                    <p className="caption-hand">{photo.uploader?.display_name || 'Guest'}</p>
                    <button
                      type="button"
                      className="manage-remove-button"
                      onClick={() => removePhoto(photo.id)}
                      aria-label={`Remove photo shared by ${photo.uploader?.display_name || 'Guest'}`}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </section>
            {photos.length < photoCount ? (
              <button type="button" className="manage-load-more" onClick={loadMorePhotos} disabled={loadingMore}>
                {loadingMore ? 'Loading photos…' : 'Load more photos'}
              </button>
            ) : null}
          </>
        ) : null}

        <section className="manage-close-uploads">
          <div>
            <h2>Close uploads</h2>
            <p>Guests can still see the wall, but can't add more photos.</p>
          </div>
          <button
            type="button"
            className="manage-close-uploads__button"
            onClick={closeUploads}
            disabled={saving || !event || event.uploads_closed}
            aria-label={event?.uploads_closed ? 'Uploads already closed' : 'Close uploads'}
          >
            Close uploads
          </button>
        </section>

        <section className="manage-delete-event">
          <div>
            <h2>Delete this Momento</h2>
            <p>Removes all photos, voice notes and comments. This can't be undone.</p>
          </div>
          <button type="button" onClick={() => { setDeleteError(''); setDeleteDialogOpen(true) }}>
            Delete event
          </button>
        </section>
      </main>
      {deleteDialogOpen && event ? (
        <DeleteEventDialog
          key={event.id}
          event={event}
          deleting={deleting}
          error={deleteError}
          onCancel={() => setDeleteDialogOpen(false)}
          onDelete={deleteEvent}
        />
      ) : null}
    </MomentoShell>
  )
}
