import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import MomentoShell from '../components/MomentoShell'
import PageHeader from '../components/PageHeader'
import DeleteEventDialog from '../components/DeleteEventDialog'
import { useAuth } from '../context/AuthContext'
import { request } from '../api'
import { consumeDashboardNotice, peekDashboardNotice } from '../dashboardNotice'

function formatOpeningDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function Dashboard() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(peekDashboardNotice)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const displayName = user?.display_name?.trim() || 'Momento host'
  const initial = displayName.charAt(0).toUpperCase()

  useEffect(() => {
    consumeDashboardNotice()
  }, [])

  useEffect(() => {
    if (!notice) return undefined
    const timerId = window.setTimeout(() => setNotice(''), 3000)
    return () => window.clearTimeout(timerId)
  }, [notice])

  async function deleteEvent() {
    if (!selectedEvent) return
    setDeleting(true)
    setDeleteError('')
    try {
      await request(`/events/${selectedEvent.id}/`, { method: 'DELETE' })
      setEvents((current) => current.filter((event) => event.id !== selectedEvent.id))
      setSelectedEvent(null)
      setNotice('Momento deleted')
    } catch {
      setDeleteError("We couldn't delete this Momento. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function loadEvents() {
      try {
        const eventList = await request('/events/')
        if (!cancelled) setEvents(eventList)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load your Momentos.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadEvents()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <MomentoShell>
      <main className="momento-scroll dashboard-page">
        <PageHeader
          label="Host dashboard"
          title="Your Momentos"
          rightContent={(
            <span className="dashboard-avatar" role="img" aria-label={`${displayName} avatar`}>
              {initial}
            </span>
          )}
        />

        {notice ? (
          <div role="status" className="dashboard-notice">
            <span>{notice}</span>
            <button type="button" aria-label="Dismiss notification" onClick={() => setNotice('')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ) : null}
        {error ? <p role="alert" className="subtext dashboard-message">{error}</p> : null}
        {loading ? <p role="status" className="subtext dashboard-message">Loading your Momentos…</p> : null}
        {!loading && !error && events.length === 0 ? (
          <p className="subtext dashboard-message">Your first Momento is ready to begin.</p>
        ) : null}

        <div className="dashboard-event-grid">
          <Link to="/create" className="dashboard-new-card">
            <span className="dashboard-new-card__plus" aria-hidden="true">+</span>
            <span>New Momento</span>
          </Link>

          {events.map((event, index) => {
            const guestCount = Math.max(0, (Number(event.member_count) || 0) - 1)
            const photoCount = Number(event.photo_count) || 0
            const opening = event.capsule_locked && event.capsule_release_at
            const status = opening ? 'opens' : event.uploads_closed ? 'closed' : 'live'
            const statusText = opening
              ? `Opens ${formatOpeningDate(event.capsule_release_at)}`
              : event.uploads_closed
                ? 'Closed'
                : 'Live'

            return (
              <article
                key={event.id}
                className={`dashboard-event-card${index % 2 === 0 ? ' dashboard-event-card--left' : ' dashboard-event-card--right'}`}
              >
                <Link to={`/events/${event.id}`} className="dashboard-event-card__link">
                  <div
                    className="dashboard-event-card__photo"
                    style={{ backgroundColor: event.wall_color || '#F3C9A8' }}
                  >
                    {event.cover_photo_url ? (
                      <img src={event.cover_photo_url} alt="" loading="lazy" />
                    ) : null}
                    <span className={`dashboard-status dashboard-status--${status}`}>
                      {statusText}
                    </span>
                  </div>
                  <h2 className="dashboard-event-card__name">{event.name}</h2>
                  <p className="dashboard-event-card__stats">
                    {guestCount} {guestCount === 1 ? 'guest' : 'guests'} · {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
                  </p>
                </Link>
                <button
                  type="button"
                  className="dashboard-event-card__delete"
                  aria-label={`Delete ${event.name}`}
                  onClick={() => { setDeleteError(''); setSelectedEvent(event) }}
                >
                  ×
                </button>
              </article>
            )
          })}
        </div>
      </main>
      {selectedEvent ? (
        <DeleteEventDialog
          key={selectedEvent.id}
          event={selectedEvent}
          deleting={deleting}
          error={deleteError}
          onCancel={() => setSelectedEvent(null)}
          onDelete={deleteEvent}
        />
      ) : null}
    </MomentoShell>
  )
}
