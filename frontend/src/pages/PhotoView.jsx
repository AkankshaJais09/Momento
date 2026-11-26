import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import MomentoShell from '../components/MomentoShell'
import PageHeader from '../components/PageHeader'
import VoiceNoteRecorder from '../components/VoiceNoteRecorder'
import { request, requestBlob } from '../api'

export default function PhotoView() {
  const { eventId, photoId } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [photoPosition, setPhotoPosition] = useState(0)
  const [photoCount, setPhotoCount] = useState(0)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [voiceComment, setVoiceComment] = useState(null)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [error, setError] = useState('')
  const [posting, setPosting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [eventData, photoData, commentData] = await Promise.all([
          request(`/events/${eventId}/`),
          request(`/photos/${photoId}/`),
          request(`/photos/${photoId}/comments/`),
        ])
        if (cancelled) return
        setEvent(eventData)
        const matchesEvent = String(photoData.event_id) === String(eventId)
        const current = matchesEvent ? photoData : null
        setPhoto(current)
        setPhotoPosition(current?.position || 0)
        setPhotoCount(current?.event_photo_count || 0)
        setLiked(Boolean(current?.liked_by_me))
        setLikeCount(current?.like_count || 0)
        setComments(commentData)
        if (!current) setError('Photo not found.')
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load this photo.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [eventId, photoId])

  async function handleToggleLike() {
    if (!photo) return
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount((count) => Math.max(0, count + (wasLiked ? -1 : 1)))
    try {
      await request(`/photos/${photo.id}/like/`, { method: wasLiked ? 'DELETE' : 'POST' })
    } catch (err) {
      setLiked(wasLiked)
      setLikeCount((count) => Math.max(0, count + (wasLiked ? 1 : -1)))
      setError(err.message || 'Could not update like.')
    }
  }

  async function handleDownload() {
    if (!photo) return
    try {
      const blob = await requestBlob(`/photos/${photo.id}/download/`)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'momento-photo.jpg'
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message || 'Could not download this photo.')
    }
  }

  async function handleComment() {
    if (posting || (!commentText.trim() && !voiceComment)) return
    setPosting(true)
    setError('')
    try {
      let body
      if (voiceComment) {
        body = new FormData()
        body.append('text', commentText)
        body.append('voice_note', voiceComment.blob, 'voice-note')
        body.append('voice_duration', String(voiceComment.duration))
      } else {
        body = JSON.stringify({ text: commentText })
      }
      const created = await request(`/photos/${photoId}/comments/`, { method: 'POST', body })
      setComments((current) => [...current, created])
      setCommentText('')
      setVoiceComment(null)
    } catch (err) {
      setError(err.message || 'Could not add your comment.')
    } finally {
      setPosting(false)
    }
  }

  return (
    <MomentoShell wallColor={event?.wall_color} wallStyle={event?.wall_style || 'polaroid'}>
      <main className="momento-scroll">
        <PageHeader label={event?.name || 'Photo view'} title={photo?.caption || 'Photo view'} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <button type="button" className="btn btn-text" onClick={() => navigate(`/events/${eventId}`)}>Back to wall</button>
          <span className="frame-number">{photoPosition ? `${photoPosition} / ${photoCount}` : ''}</span>
        </div>
        {error ? <p role="alert" style={{ color: 'var(--color-accent)' }}>{error}</p> : null}
        {loading ? <p role="status" className="subtext">Loading photo…</p> : null}
        {photo ? (
          <>
            <article className="polaroid polaroid--tilt-1" style={{ margin: '0 auto 20px', maxWidth: 330 }}>
              <img
                className="polaroid__image"
                src={photo.medium_preview_url || photo.original_url}
                alt={photo.caption || 'Shared moment'}
                decoding="async"
              />
              <p className="caption-hand" style={{ margin: 0 }}>
                {photo.caption || 'A moment'} – {photo.uploader?.display_name}
              </p>
            </article>
            {photo.voice_note_url ? (
              <div className="card" style={{ marginBottom: 16 }}>
                <p className="label-accent">Voice note · {Math.round(photo.voice_note_duration || 0)}s</p>
                <audio controls preload="metadata" src={photo.voice_note_url} style={{ width: '100%' }} />
              </div>
            ) : null}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={handleToggleLike} aria-pressed={liked}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" stroke="currentColor" strokeWidth="1.6" fill={liked ? 'currentColor' : 'none'} />
                </svg>
                {likeCount}
              </button>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={handleDownload}>Download</button>
            </div>
            <section>
              <h2 className="headline" style={{ fontSize: '1.25rem', marginBottom: 16 }}>Comments · {comments.length}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {comments.map((comment) => (
                  <article className="card" key={comment.id}>
                    <p className="caption-hand" style={{ textAlign: 'left', margin: 0 }}>
                      {comment.user.display_name}
                    </p>
                    {comment.user.email ? <p className="subtext" style={{ fontSize: '0.8125rem' }}>{comment.user.email}</p> : null}
                    {comment.text ? <p className="subtext" style={{ marginTop: 6 }}>{comment.text}</p> : null}
                    {comment.voice_url ? <audio controls preload="metadata" src={comment.voice_url} style={{ width: '100%', marginTop: 8 }} /> : null}
                  </article>
                ))}
              </div>
              <div className="comment-composer">
                <label className="sr-only" htmlFor="comment-text">Add a comment</label>
                <input
                  id="comment-text"
                  className="input"
                  value={commentText}
                  onChange={(inputEvent) => setCommentText(inputEvent.target.value)}
                  onKeyDown={(inputEvent) => {
                    if (inputEvent.key === 'Enter') {
                      inputEvent.preventDefault()
                      handleComment()
                    }
                  }}
                  placeholder="Add a comment"
                  maxLength={1000}
                />
                {event?.voice_notes_enabled ? <VoiceNoteRecorder iconOnly onChange={setVoiceComment} disabled={posting} /> : null}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleComment}
                  disabled={posting || (!commentText.trim() && !voiceComment)}
                  aria-label="Send"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </MomentoShell>
  )
}
