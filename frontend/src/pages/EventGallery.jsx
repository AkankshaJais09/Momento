// Event photo wall: staggered Polaroids, contributor avatars, pinned upload CTA.
// Loads event + photos from existing APIs without changing filters or auth rules.

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import MomentoShell from '../components/MomentoShell'
import PageHeader from '../components/PageHeader'
import Polaroid from '../components/Polaroid'
import { request } from '../api'
import { loadEventPhotoPage } from '../eventHelpers'

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function contributorLine(names) {
  if (names.length === 0) return 'No one has added photos yet'
  if (names.length === 1) return `${names[0]} added photos`
  if (names.length === 2) return `${names[0]}, ${names[1]} added photos`
  const rest = names.length - 2
  return `${names[0]}, ${names[1]} and ${rest} other${rest === 1 ? '' : 's'} added photos`
}

export default function EventGallery() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [photos, setPhotos] = useState([])
  const [allContributors, setAllContributors] = useState([])
  const [photoCount, setPhotoCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [eventData, photoData] = await Promise.all([
          request(`/events/${eventId}/`),
          loadEventPhotoPage(eventId),
        ])
        if (cancelled) return
        setEvent(eventData)
        setPhotos(photoData.results)
        setAllContributors(photoData.contributors)
        setPhotoCount(photoData.count)
        setPage(photoData.currentPage)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load the gallery.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [eventId])

  async function loadMorePhotos() {
    if (loadingMore || photos.length >= photoCount) return
    setLoadingMore(true)
    try {
      const nextPage = await loadEventPhotoPage(eventId, page + 1)
      setPhotos((current) => [...current, ...nextPage.results])
      setPage(nextPage.currentPage)
    } catch (err) {
      setError(err.message || 'Could not load more photos.')
    } finally {
      setLoadingMore(false)
    }
  }

  const visibleContributors = useMemo(() => {
    const seen = new Map()
    for (const photo of photos) {
      const name = photo.uploader?.display_name || 'Guest'
      const id = photo.uploader?.id || name
      if (!seen.has(id)) {
        seen.set(id, {
          id,
          name,
          initials: initials(name),
        })
      }
    }
    return [...seen.values()]
  }, [photos])
  const contributors = allContributors.length
    ? allContributors.map((person) => ({
      id: person.id,
      name: person.display_name || 'Guest',
      initials: initials(person.display_name || ''),
    }))
    : visibleContributors

  const count = photoCount
  const tilts = [1, 2, 3, 4]

  return (
    <MomentoShell wallColor={event?.wall_color} wallStyle={event?.wall_style || 'polaroid'}>
      <div className="momento-scroll momento-scroll--flush">
        <PageHeader
          label="Event wall"
          title={event?.name || 'Event'}
          rightContent={event?.my_role === 'owner' ? (
            <Link to={`/events/${eventId}/manage`} className="btn btn-text">Manage</Link>
          ) : null}
        />

        <Link
          to="/dashboard"
          className="btn btn-text"
          style={{ display: 'inline-flex', marginTop: -12, marginBottom: 16 }}
        >
          Your Momentos
        </Link>

        <p className="subtext" style={{ marginBottom: 16 }}>
          {count} photos so far
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div className="avatar-stack">
            {contributors.slice(0, 4).map((person) => (
              <span key={person.id} className="avatar" aria-label={person.name}>
                {person.initials}
              </span>
            ))}
          </div>
          <p className="subtext" style={{ fontSize: '0.875rem', margin: 0 }}>
            {contributorLine(contributors.map((person) => person.name))}
          </p>
        </div>

        {error ? (
          <p role="alert" style={{ color: 'var(--color-accent)', fontSize: '0.875rem' }}>
            {error}
          </p>
        ) : null}

        {loading ? (
          <p role="status" className="subtext">Loading photos…</p>
        ) : count === 0 && event?.capsule_locked ? (
          <p className="subtext" style={{ textAlign: 'center', padding: '40px 0' }}>
            Photos appear {new Date(event.capsule_release_at).toLocaleString()}.
          </p>
        ) : count === 0 && !error ? (
          <p className="subtext" style={{ textAlign: 'center', padding: '40px 0' }}>
            The wall is empty. Be the first to add a photo.
          </p>
        ) : (
          <div className="gallery-wall">
            {photos.map((photo, index) => {
              const name = photo.uploader?.display_name || 'Guest'
              const captionBase = photo.caption || 'A moment'
              return (
                <Polaroid
                  key={photo.id}
                  tilt={tilts[index % tilts.length]}
                  src={photo.medium_preview_url || photo.original_url}
                  alt={captionBase}
                  caption={`${captionBase} – ${name}`}
                  loading="lazy"
                  onClick={() => navigate(`/events/${eventId}/photos/${photo.id}`)}
                  style={{ width: '100%' }}
                />
              )
            })}
          </div>
        )}
        {!loading && photos.length < count ? (
          <button type="button" className="gallery-load-more" onClick={loadMorePhotos} disabled={loadingMore}>
            {loadingMore ? 'Loading photos…' : 'Load more photos'}
          </button>
        ) : null}
      </div>

      {event?.my_role === 'owner' ? (
        <nav className="wall-tools" aria-label="Host tools">
          <Link className="chip" to={`/events/${eventId}/who-shared`}>Who shared</Link>
          <Link className="chip" to={`/events/${eventId}/settings`}>Settings</Link>
          <Link className="chip" to={`/events/${eventId}/quests`}>Photo quests</Link>
          <Link className="chip" to={`/events/${eventId}/recap`}>Recap</Link>
        </nav>
      ) : null}
      <button
        type="button"
        className="btn btn-primary btn-pinned"
        onClick={() => navigate(`/events/${eventId}/upload`)}
        disabled={event?.uploads_closed}
      >
        {event?.uploads_closed ? 'Uploads closed' : 'Add your photos'}
      </button>
    </MomentoShell>
  )
}
