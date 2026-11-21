import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import MomentoShell from '../components/MomentoShell'
import PageHeader from '../components/PageHeader'
import { request } from '../api'
import { loadEventPhotos } from '../eventHelpers'

const QUESTS = [
  ['toast', 'A toast'],
  ['dance', 'The dance floor'],
  ['laugh', 'A big laugh'],
  ['midnight', 'A midnight moment'],
]

export default function PhotoQuests() {
  const { eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [photos, setPhotos] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([request(`/events/${eventId}/`), loadEventPhotos(eventId)])
      .then(([eventData, photoList]) => {
        if (!active) return
        setEvent(eventData)
        setPhotos(photoList)
      })
      .catch((err) => {
        if (active) setError(err.message || 'Could not load photo quests.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [eventId])

  const foundQuestCount = QUESTS.filter(([id]) => photos.some((photo) => photo.quest === id)).length
  const guestCount = Math.max((Number(event?.member_count) || 0) - 1, 0)
  const overallProgress = Math.round((foundQuestCount / QUESTS.length) * 100)

  return (
    <MomentoShell wallColor={event?.wall_color} wallStyle={event?.wall_style || 'polaroid'}>
      <main className="momento-scroll photo-quests-page">
        <PageHeader label="PLAY TOGETHER" title="Photo quests" />
        {error ? <p role="alert" className="subtext">{error}</p> : null}
        {loading ? <p role="status" className="subtext">Loading photo quests…</p> : null}
        {!loading ? <section className="photo-quests-summary">
          <div className="photo-quests-summary__top">
            <p><strong>{foundQuestCount} of {QUESTS.length}</strong> quests found</p>
            <p>{guestCount} {guestCount === 1 ? 'guest' : 'guests'} playing</p>
          </div>
          <div
            className="photo-quests-summary__progress"
            role="progressbar"
            aria-label="Quests found"
            aria-valuenow={overallProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${overallProgress}%` }} />
          </div>
        </section> : null}

        {!loading ? <div className="photo-quests-list">
          {QUESTS.map(([id, title]) => {
            const found = photos.filter((photo) => photo.quest === id)
            const guests = new Map(found.map((photo) => [photo.uploader?.id, photo.uploader]))
            const foundNames = [...guests.values()].map((guest) => guest?.display_name).filter(Boolean)
            const isFound = found.length > 0

            return (
              <section key={id} className="photo-quest-row">
                <span className={`photo-quest-status${isFound ? ' photo-quest-status--found' : ''}`} aria-hidden="true">
                  {isFound ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="m5 12 4 4L19 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </span>
                <div className="photo-quest-copy">
                  <h2>{title}</h2>
                  <p>{isFound ? `Found by ${foundNames.join(', ') || 'a guest'}` : 'Not found yet'}</p>
                </div>
                <Link className="btn btn-secondary photo-quest-add" to={`/events/${eventId}/upload?quest=${id}`}>
                  Add a photo
                </Link>
              </section>
            )
          })}
        </div> : null}
      </main>
    </MomentoShell>
  )
}
