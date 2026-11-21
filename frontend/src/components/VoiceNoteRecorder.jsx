import { useEffect, useRef, useState } from 'react'

export default function VoiceNoteRecorder({
  onChange,
  disabled = false,
  iconOnly = false,
  label = 'Add a voice note',
}) {
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const timeoutRef = useRef(null)
  const intervalRef = useRef(null)
  const durationRef = useRef(0)
  const voiceUrlRef = useRef('')
  const audioRef = useRef(null)
  const [recording, setRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [voiceUrl, setVoiceUrl] = useState('')
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => () => {
    window.clearTimeout(timeoutRef.current)
    window.clearInterval(intervalRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    if (voiceUrlRef.current) URL.revokeObjectURL(voiceUrlRef.current)
  }, [])

  async function startRecording() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const supportedType = ['audio/webm', 'audio/mp4']
        .find((type) => MediaRecorder.isTypeSupported(type))
      const recorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : undefined)
      const mimeType = recorder.mimeType || supportedType || 'audio/webm'
      const chunks = []
      streamRef.current = stream
      recorderRef.current = recorder
      durationRef.current = 0
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data)
      }
      recorder.onstop = () => {
        const seconds = Math.max(1, durationRef.current)
        const blob = new Blob(chunks, { type: mimeType })
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        if (!blob.size) {
          setError('No audio was recorded. Please try again.')
          return
        }
        const url = URL.createObjectURL(blob)
        if (voiceUrlRef.current) URL.revokeObjectURL(voiceUrlRef.current)
        voiceUrlRef.current = url
        setVoiceUrl(url)
        setDuration(seconds)
        onChange({ blob, duration: seconds, url, mimeType })
      }
      recorder.start()
      setRecording(true)
      intervalRef.current = window.setInterval(() => {
        durationRef.current = Math.min(30, durationRef.current + 1)
        setDuration(durationRef.current)
      }, 1000)
      timeoutRef.current = window.setTimeout(() => stopRecording(), 30000)
    } catch (err) {
      setError(
        err.name === 'NotAllowedError' || err.name === 'SecurityError'
          ? 'Microphone access was blocked. Allow microphone access in your browser settings and try again.'
          : err.message || 'Microphone access is unavailable.',
      )
    }
  }

  async function togglePlayback() {
    if (!audioRef.current) return
    try {
      if (audioRef.current.paused) {
        await audioRef.current.play()
      } else {
        audioRef.current.pause()
      }
    } catch {
      setError('Could not play this recording. Please record it again.')
    }
  }

  function stopRecording() {
    window.clearTimeout(timeoutRef.current)
    window.clearInterval(intervalRef.current)
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }
    setRecording(false)
  }

  function clearRecording() {
    audioRef.current?.pause()
    setPlaying(false)
    if (voiceUrlRef.current) URL.revokeObjectURL(voiceUrlRef.current)
    voiceUrlRef.current = ''
    setVoiceUrl('')
    setDuration(0)
    onChange(null)
  }

  return (
    <div>
      <button
        type="button"
        className="btn btn-secondary"
        aria-label={iconOnly ? (recording ? 'Stop voice comment' : 'Record voice comment') : undefined}
        disabled={disabled}
        onClick={recording ? stopRecording : startRecording}
        style={iconOnly ? { width: 52, minWidth: 52, padding: 0 } : { width: '100%' }}
      >
        {recording ? (
          iconOnly ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
          ) : `Stop recording · ${duration}s`
        ) : (
          <>
            {iconOnly ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z" stroke="currentColor" strokeWidth="1.8" />
                <path d="M19 11a7 7 0 0 1-14 0m7 7v3m-4 0h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            ) : label}
          </>
        )}
      </button>
      {voiceUrl ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <audio
            ref={audioRef}
            src={voiceUrl}
            preload="metadata"
            aria-label={`Voice note, ${duration} seconds`}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            style={{ display: 'none' }}
          />
          <button type="button" className="btn btn-secondary" onClick={togglePlayback} aria-label={playing ? 'Pause voice note' : 'Play voice note'}>
            {playing ? 'Pause' : 'Play'}
          </button>
          <span className="subtext" style={{ flex: 1 }}>{duration}s</span>
          <button type="button" className="btn btn-text" onClick={clearRecording}>Delete</button>
        </div>
      ) : null}
      {error ? <p role="alert" className="subtext" style={{ marginTop: 8, fontSize: '0.8125rem' }}>{error}</p> : null}
    </div>
  )
}
