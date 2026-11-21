import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import MomentoShell from '../components/MomentoShell'
import PageHeader from '../components/PageHeader'
import { request } from '../api'
import { loadEventPhotos } from '../eventHelpers'

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

function chronological(left, right) {
  const leftTime = Date.parse(left.taken_at || left.created_at || '') || 0
  const rightTime = Date.parse(right.taken_at || right.created_at || '') || 0
  return leftTime - rightTime
}

export default function Film() {
  const { eventId } = useParams()
  const audioRef = useRef(null)
  const [event, setEvent] = useState(null)
  const [photos, setPhotos] = useState([])
  const [mode, setMode] = useState('group')
  const [playing, setPlaying] = useState(false)
  const [voiceNotesOn, setVoiceNotesOn] = useState(false)
  const [index, setIndex] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [eventData, photoList] = await Promise.all([
          request(`/events/${eventId}/`),
          loadEventPhotos(eventId, true),
        ])
        if (cancelled) return
        setEvent(eventData)
        setPhotos(photoList)
      } catch {
        if (!cancelled) setError("We couldn't load this film. Please try again.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [eventId])

  useEffect(() => {
    let active = true
    const timerId = window.setInterval(async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const photoList = await loadEventPhotos(eventId, true)
        if (active) setPhotos(photoList)
      } catch {
        if (active) setError("We couldn't refresh favourites. Please try again.")
      }
    }, 15000)
    return () => {
      active = false
      window.clearInterval(timerId)
    }
  }, [eventId])

  const filmPhotos = useMemo(() => photos
    .filter((photo) => mode === 'group'
      ? (photo.like_count || 0) > 0
      : Boolean(photo.liked_by_me))
    .sort(chronological), [photos, mode])
  const currentIndex = Math.min(index, Math.max(0, filmPhotos.length - 1))
  const current = filmPhotos[currentIndex]
  const currentId = current?.id
  const currentVoiceNoteUrl = current?.voice_note_url

  useEffect(() => {
    function handleKeyDown(keyEvent) {
      const target = keyEvent.target
      if (target instanceof HTMLElement && (
        target.isContentEditable
        || target.matches('input, textarea, select')
        || (keyEvent.code === 'Space' && target.closest('button, a'))
      )) return

      if (keyEvent.key === 'ArrowLeft' && filmPhotos.length) {
        keyEvent.preventDefault()
        setIndex(Math.max(0, currentIndex - 1))
      } else if (keyEvent.key === 'ArrowRight' && filmPhotos.length) {
        keyEvent.preventDefault()
        setIndex(Math.min(filmPhotos.length - 1, currentIndex + 1))
      } else if (keyEvent.code === 'Space' && filmPhotos.length) {
        keyEvent.preventDefault()
        setPlaying((isPlaying) => !isPlaying)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, filmPhotos.length])

  useEffect(() => {
    const audio = audioRef.current
    if (!playing || !currentId) {
      audio?.pause()
      return undefined
    }

    let timerId
    let active = true
    let advanced = false
    const advance = () => {
      if (!active || advanced) return
      advanced = true
      if (currentIndex >= filmPhotos.length - 1) setPlaying(false)
      else setIndex((currentIndex) => Math.min(filmPhotos.length - 1, currentIndex + 1))
    }

    if (voiceNotesOn && currentVoiceNoteUrl && audio) {
      const handleEnded = () => advance()
      audio.addEventListener('ended', handleEnded)
      audio.currentTime = 0
      timerId = window.setTimeout(advance, 30000)
      audio.play().catch(() => {
        if (!active || advanced) return
        setError("A voice note couldn't play. The film will continue.")
        window.clearTimeout(timerId)
        timerId = window.setTimeout(advance, 4000)
      })

      return () => {
        active = false
        window.clearTimeout(timerId)
        audio.pause()
        audio.removeEventListener('ended', handleEnded)
      }
    }

    timerId = window.setTimeout(advance, 4000)
    return () => {
      active = false
      window.clearTimeout(timerId)
      audio?.pause()
    }
  }, [playing, currentId, currentVoiceNoteUrl, voiceNotesOn, currentIndex, filmPhotos.length])

  async function toggleLike() {
    if (!current) return
    const photoId = current.id
    const wasLiked = Boolean(current.liked_by_me)
    setPhotos((items) => items.map((photo) => photo.id === photoId
      ? { ...photo, liked_by_me: !wasLiked, like_count: Math.max(0, (photo.like_count || 0) + (wasLiked ? -1 : 1)) }
      : photo))
    try {
      await request(`/photos/${photoId}/like/`, { method: wasLiked ? 'DELETE' : 'POST' })
    } catch {
      setPhotos((items) => items.map((photo) => photo.id === photoId
        ? { ...photo, liked_by_me: wasLiked, like_count: Math.max(0, (photo.like_count || 0) + (wasLiked ? 1 : -1)) }
        : photo))
      setError("We couldn't update that favourite. Please try again.")
    }
  }

  function chooseMode(nextMode) {
    setMode(nextMode)
    setIndex(0)
    setPlaying(false)
  }

  function moveToPhoto(nextIndex) {
    setIndex(Math.max(0, Math.min(filmPhotos.length - 1, nextIndex)))
  }

  return (
    <MomentoShell wallColor={event?.wall_color} wallStyle={event?.wall_style || 'polaroid'}>
      <main className="momento-scroll film-page">
        <PageHeader label="OUR FILM" title={`The night, in ${photos.length} photos`} />

        <div className="film-filter-row">
          <div className="film-segmented" role="group" aria-label="Choose film favourites">
            <button type="button" aria-label="Group favourites" aria-pressed={mode === 'group'} onClick={() => chooseMode('group')}>
              Group favourites
            </button>
            <button type="button" aria-label="My favourites" aria-pressed={mode === 'mine'} onClick={() => chooseMode('mine')}>
              My favourites
            </button>
          </div>
          <p>New favourites are added automatically</p>
        </div>

        {error ? <p role="alert" className="film-error">{error}</p> : null}
        {loading ? (
          <p role="status" className="film-empty">Loading the film…</p>
        ) : !filmPhotos.length ? (
          <p className="film-empty">Heart photos on the wall to add them to the film.</p>
        ) : (
          <>
            <section
              className="film-stage"
              data-playing={playing}
              data-paused={!playing}
              aria-label="Our Film player"
            >
              <button
                type="button"
                className="film-stage__heart"
                onClick={toggleLike}
                aria-label={current.liked_by_me ? 'Remove heart from photo' : 'Heart photo'}
                aria-pressed={Boolean(current.liked_by_me)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" stroke="currentColor" strokeWidth="1.7" fill={current.liked_by_me ? 'currentColor' : 'none'} />
                </svg>
                <span>{current.like_count || 0}</span>
              </button>
              <span className="film-stage__count">{currentIndex + 1} of {filmPhotos.length}</span>

              <button
                type="button"
                className="film-stage__navigation film-stage__navigation--previous"
                onClick={() => moveToPhoto(currentIndex - 1)}
                disabled={currentIndex === 0}
                aria-label="Previous photo"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <article className="film-polaroid">
                <img
                  key={current.id}
                  className="film-polaroid__image"
                  src={current.medium_preview_url || current.original_url}
                  alt={current.caption || 'Moment from the event'}
                />
                <p className="film-polaroid__caption">
                  {current.caption || 'A moment'} – {current.uploader?.display_name || 'Guest'}
                </p>
              </article>

              <button
                type="button"
                className="film-stage__navigation film-stage__navigation--next"
                onClick={() => moveToPhoto(currentIndex + 1)}
                disabled={currentIndex === filmPhotos.length - 1}
                aria-label="Next photo"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div className="film-stage__controls">
                <button
                  type="button"
                  className="film-play-button"
                  onClick={() => setPlaying((isPlaying) => !isPlaying)}
                  aria-label={playing ? 'Pause film' : 'Play film'}
                >
                  {playing ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M8 5v14m8-14v14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="m8 5 12 7-12 7V5Z" fill="currentColor" />
                    </svg>
                  )}
                </button>
                <div className="film-stage__progress" aria-label={`Photo ${currentIndex + 1} of ${filmPhotos.length}`}>
                  {filmPhotos.map((photo, photoIndex) => (
                    <span
                      key={photo.id}
                      className={photoIndex <= currentIndex ? 'film-stage__progress-segment film-stage__progress-segment--done' : 'film-stage__progress-segment'}
                    />
                  ))}
                </div>
                <span className="film-stage__time">
                  {formatTime(currentIndex * 4)} / {formatTime(filmPhotos.length * 4)}
                </span>
                <button
                  type="button"
                  className="film-voice-toggle"
                  role="switch"
                  aria-checked={voiceNotesOn}
                  aria-label={`Voice notes ${voiceNotesOn ? 'on' : 'off'}`}
                  onClick={() => setVoiceNotesOn((enabled) => !enabled)}
                >
                  <span>Voice notes</span>
                  <strong>{voiceNotesOn ? 'On' : 'Off'}</strong>
                </button>
              </div>
            </section>

            <div className="film-strip" aria-label="Film strip">
              <div className="film-strip__frames">
                {filmPhotos.map((photo, photoIndex) => (
                  <button
                    key={photo.id}
                    type="button"
                    className={photoIndex === currentIndex ? 'film-strip__frame film-strip__frame--current' : 'film-strip__frame'}
                    onClick={() => moveToPhoto(photoIndex)}
                    aria-label={`Go to photo ${photoIndex + 1}, ${photo.like_count || 0} hearts`}
                    aria-current={photoIndex === currentIndex ? 'true' : undefined}
                  >
                    <img src={photo.thumbnail_url || photo.medium_preview_url || photo.original_url} alt="" loading="lazy" />
                    <span aria-hidden="true">{photo.like_count || 0} hearts</span>
                  </button>
                ))}
              </div>
            </div>

            <audio ref={audioRef} src={current.voice_note_url || undefined} preload="metadata" />
          </>
        )}
      </main>
    </MomentoShell>
  )
}
