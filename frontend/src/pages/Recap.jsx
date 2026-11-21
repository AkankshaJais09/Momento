import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import MomentoShell from '../components/MomentoShell'
import PageHeader from '../components/PageHeader'
import { request, requestBlob } from '../api'
import { loadEventPhotos } from '../eventHelpers'

export default function Recap() {
  const { eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [photos, setPhotos] = useState([])
  const [contributors, setContributors] = useState([])
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([
      request(`/events/${eventId}/`),
      loadEventPhotos(eventId, true),
      request(`/events/${eventId}/contributors/`),
    ])
      .then(([eventData, photoList, people]) => {
        if (!active) return
        setEvent(eventData)
        setPhotos(photoList)
        setContributors(people)
      })
      .catch((err) => {
        if (active) setError(err.message || 'Could not load the recap.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [eventId])

  const loved = useMemo(
    () => [...photos].sort((a, b) => (b.like_count || 0) - (a.like_count || 0))[0],
    [photos],
  )
  const chapters = useMemo(() => {
    const dates = new Set(photos.map((photo) => photo.taken_at?.slice(0, 10)).filter(Boolean))
    return [...dates].sort()
  }, [photos])
  const guestCount = new Set(photos.map((photo) => photo.uploader?.id).filter(Boolean)).size
  const voiceCount = contributors.reduce((total, person) => total + person.voice_note_count, 0)

  async function downloadAll() {
    setDownloading(true)
    setError('')
    try {
      const blob = await requestBlob(`/events/${eventId}/download-zip/`, {
        method: 'POST',
        body: JSON.stringify({ photo_ids: photos.map((photo) => photo.id) }),
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'momento-photos.zip'
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message || 'Could not download the photos.')
    } finally {
      setDownloading(false)
    }
  }

  if (event && event.my_role !== 'owner') {
    return <MomentoShell><main className="momento-scroll"><PageHeader label="Host view" title="Recap" /><p role="alert">This page is for the host.</p></main></MomentoShell>
  }

  return (
    <MomentoShell wallColor={event?.wall_color} wallStyle={event?.wall_style || 'polaroid'}>
      <main className="momento-scroll recap-page">
        <PageHeader label="A NIGHT TO REMEMBER" title={event?.name || 'Recap'} />
        {error ? <p role="alert" className="recap-error">{error}</p> : null}
        {loading ? <p role="status" className="subtext">Loading recap…</p> : null}
        {!loading ? <div className="recap-layout">
          <div className="recap-photo-column">
            {loved ? (
              <article className="polaroid polaroid--tilt-1 recap-photo-card">
                <img
                  className="polaroid__image recap-photo-card__image"
                  src={loved.medium_preview_url || loved.original_url}
                  alt={loved.caption || 'Most loved moment'}
                />
                <p className="caption-hand recap-photo-card__caption">
                  most loved · {loved.like_count || 0} – {loved.uploader?.display_name || 'Guest'}
                </p>
              </article>
            ) : null}
          </div>

          <div className="recap-details">
            <div className="recap-stats">
              <section className="recap-stat-card">
                <strong>{photos.length}</strong>
                <span>Photos</span>
              </section>
              <section className="recap-stat-card">
                <strong>{guestCount}</strong>
                <span>Guests</span>
              </section>
              <section className="recap-stat-card">
                <strong>{voiceCount}</strong>
                <span>Voice notes</span>
              </section>
            </div>

            <section className="recap-chapters">
              <h2 className="label-accent">TIME CHAPTERS</h2>
              <div className="recap-chapter-list">
                {chapters.map((chapter) => (
                  <span className="chip recap-chapter-chip" key={chapter}>{chapter}</span>
                ))}
                {!chapters.length ? <p className="subtext">No time chapters yet.</p> : null}
              </div>
            </section>

            <button
              type="button"
              className="btn recap-download-button"
              disabled={!photos.length || downloading}
              onClick={downloadAll}
            >
              {downloading ? 'Preparing…' : 'Download all photos'}
            </button>
          </div>
        </div> : null}
      </main>
    </MomentoShell>
  )
}
