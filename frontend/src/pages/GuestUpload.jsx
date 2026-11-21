import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import MomentoShell from '../components/MomentoShell'
import PageHeader from '../components/PageHeader'
import VoiceNoteRecorder from '../components/VoiceNoteRecorder'
import { request } from '../api'

const QUESTS = {
  toast: 'A toast',
  dance: 'The dance floor',
  laugh: 'A big laugh',
  midnight: 'A midnight moment',
}

function randomSuffix() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const values = new Uint8Array(6)
  window.crypto.getRandomValues(values)
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('')
}

async function preparePhoto(file, eventId) {
  const image = await createImageBitmap(file)
  const scale = Math.min(1, 2000 / Math.max(image.width, image.height))
  const width = Math.round(image.width * scale)
  const height = Math.round(image.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(image, 0, 0, width, height)
  image.close()
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
  if (!blob) throw new Error('Could not prepare this photo.')
  return new File([blob], `momento-${eventId}-${randomSuffix()}.jpg`, { type: 'image/jpeg' })
}

export default function GuestUpload() {
  const { eventId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const fileInputRef = useRef(null)
  const previewsRef = useRef([])
  const [event, setEvent] = useState(null)
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [caption, setCaption] = useState('')
  const [voiceNote, setVoiceNote] = useState(null)
  const [error, setError] = useState('')
  const [eventLoading, setEventLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const quest = QUESTS[searchParams.get('quest')] ? searchParams.get('quest') : ''

  useEffect(() => {
    request(`/events/${eventId}/`)
      .then(setEvent)
      .catch((err) => setError(err.message || 'Could not load this Momento.'))
      .finally(() => setEventLoading(false))
  }, [eventId])

  useEffect(() => {
    previewsRef.current = previews
  }, [previews])
  useEffect(() => () => previewsRef.current.forEach((preview) => URL.revokeObjectURL(preview.url)), [])

  async function handleFilesSelected(inputEvent) {
    const chosen = Array.from(inputEvent.target.files || [])
    inputEvent.target.value = ''
    if (!chosen.length) return

    setError('')
    setProcessing(true)
    try {
      const prepared = await Promise.all(chosen.map((file) => preparePhoto(file, eventId)))
      setFiles((current) => [...current, ...prepared])
      setPreviews((current) => [
        ...current,
        ...prepared.map((file) => ({ url: URL.createObjectURL(file) })),
      ])
    } catch (err) {
      setError(err.message || 'Could not prepare the selected photos.')
    } finally {
      setProcessing(false)
    }
  }

  function removeAt(index) {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))
    setPreviews((current) => {
      const removed = current[index]
      if (removed) URL.revokeObjectURL(removed.url)
      return current.filter((_, itemIndex) => itemIndex !== index)
    })
  }

  function handleNotYou() {
    logout()
    navigate('/login', { state: { from: `/events/${eventId}/upload` } })
  }

  async function handleShare() {
    if (!files.length) return
    setError('')
    setUploading(true)
    try {
      const formData = new FormData()
      files.forEach((file) => formData.append('files', file))
      formData.append('caption', caption)
      if (quest) formData.append('quest', quest)
      if (voiceNote && event?.voice_notes_enabled) {
        formData.append('voice_note', voiceNote.blob, 'voice-note')
        formData.append('voice_note_duration', String(voiceNote.duration))
      }

      await request(`/events/${eventId}/photos/`, {
        method: 'POST',
        body: formData,
      })
      navigate(`/events/${eventId}`)
    } catch (err) {
      setError(err.message || 'Could not share your photos.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <MomentoShell wallColor={event?.wall_color} wallStyle={event?.wall_style || 'polaroid'}>
      <main className="momento-scroll">
        <PageHeader label="Add your moments" title={event?.name || 'Your Momento'} />
        {eventLoading ? <p role="status" className="subtext">Loading Momento…</p> : null}
        <p className="subtext" style={{ marginBottom: 20 }}>
          Posting as {user?.display_name} · {user?.email}
          {' · '}
          <button type="button" className="btn btn-text" style={{ padding: 0 }} onClick={handleNotYou}>
            Not you?
          </button>
        </p>

        {quest ? (
          <p className="chip" style={{ display: 'inline-block', marginBottom: 16 }}>
            Photo quest: {QUESTS[quest]}
          </p>
        ) : null}

        <input
          ref={fileInputRef}
          id="photo-files"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFilesSelected}
          style={{ display: 'none' }}
        />
        <div className="thumb-grid" style={{ marginBottom: 20 }}>
          {previews.map((preview, index) => (
            <button
              key={preview.url}
              type="button"
              className="thumb-tile"
              onClick={() => removeAt(index)}
              aria-label={`Remove photo ${index + 1}`}
            >
              <img src={preview.url} alt={`Selected photo ${index + 1}`} />
            </button>
          ))}
          <label htmlFor="photo-files" className="thumb-tile thumb-tile--add">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Add photos
          </label>
        </div>

        {processing ? <p role="status" className="subtext">Preparing photos…</p> : null}

        <div className="field" style={{ marginBottom: 20 }}>
          <label htmlFor="photo-caption">Caption</label>
          <input
            id="photo-caption"
            className="input"
            value={caption}
            onChange={(inputEvent) => setCaption(inputEvent.target.value)}
            maxLength={500}
          />
        </div>

        {event?.voice_notes_enabled ? (
          <VoiceNoteRecorder onChange={setVoiceNote} disabled={uploading} />
        ) : null}

        {event?.uploads_closed ? (
          <p role="status" className="subtext" style={{ marginTop: 16 }}>Uploads are closed for this Momento.</p>
        ) : null}
        {error ? <p role="alert" style={{ color: 'var(--color-accent)', marginTop: 16 }}>{error}</p> : null}
        <Link to={`/events/${eventId}`} className="btn btn-text" style={{ display: 'block', textAlign: 'center', marginTop: 16 }}>
          Back to the wall
        </Link>
      </main>
      <button
        type="button"
        className="btn btn-primary btn-pinned"
        onClick={handleShare}
        disabled={eventLoading || !event || uploading || processing || !files.length || event?.uploads_closed}
      >
        {uploading ? 'Sharing…' : `Share ${files.length} photos`}
      </button>
    </MomentoShell>
  )
}
