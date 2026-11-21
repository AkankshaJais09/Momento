// Step 2 of 2: share the invite link and QR after creating an event.
// Uses existing event detail API; copy/print are client-side only.

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import MomentoShell from '../components/MomentoShell'
import PageHeader from '../components/PageHeader'
import Polaroid from '../components/Polaroid'
import { request } from '../api'

function getPublicBaseUrl() {
  const configured = import.meta.env.VITE_PUBLIC_BASE_URL?.trim()

  try {
    const url = new URL(configured || window.location.origin)
    if (!['http:', 'https:'].includes(url.protocol)) return window.location.origin
    return url.href.replace(/\/+$/, '')
  } catch {
    return window.location.origin
  }
}

export default function ShareEvent() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [qr, setQr] = useState({ url: '', src: '' })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await request(`/events/${eventId}/`)
        if (!cancelled) setEvent(data)
      } catch {
        if (!cancelled) setError("We couldn't load your invite link. Please try again.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [eventId])

  const publicBaseUrl = getPublicBaseUrl()
  const shareUrl = event?.invite_code && publicBaseUrl
    ? `${publicBaseUrl}/join?code=${encodeURIComponent(event.invite_code)}`
    : ''
  const qrSrc = qr.url === shareUrl ? qr.src : ''

  useEffect(() => {
    let active = true
    if (!shareUrl) return () => { active = false }

    QRCode.toDataURL(shareUrl, { width: 220, margin: 2, errorCorrectionLevel: 'H' })
      .then((dataUrl) => {
        if (active) setQr({ url: shareUrl, src: dataUrl })
      })
      .catch(() => {
        if (active) setError("We couldn't create the QR code. Please try again.")
      })
    return () => { active = false }
  }, [shareUrl])

  async function handleCopy() {
    if (!shareUrl) return
    setError('')
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("We couldn't copy the link. Please try again.")
    }
  }

  function handlePrint() {
    window.print()
  }

  return (
    <MomentoShell wallColor={event?.wall_color} wallStyle={event?.wall_style || 'polaroid'}>
      <main className="momento-scroll share-page">
        <PageHeader label="Step 2 of 2" title="Your Momento is ready" />

        {error ? (
          <p role="alert" style={{ color: 'var(--color-accent)', fontSize: '0.875rem' }}>
            {error}
          </p>
        ) : null}
        {loading ? <p role="status" className="subtext">Loading invite…</p> : null}

        <div className="share-qr-wrap">
          <Polaroid
            tilt={2}
            src={qrSrc || undefined}
            alt="Invite QR code"
            placeholderColor="#F0EBE3"
            caption={event?.name || 'Your invite'}
            style={{ width: 220 }}
          />
        </div>

        <div className="link-pill" style={{ marginBottom: 16 }} title={shareUrl}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{shareUrl || (event ? 'Invite link unavailable' : 'Preparing invite link…')}</span>
        </div>
        {!event ? null : !shareUrl ? (
          <p className="subtext share-link-error">Invite link is unavailable.</p>
        ) : null}

        <button
          type="button"
          className="btn btn-primary share-action"
          onClick={handleCopy}
          disabled={!shareUrl}
        >
          {copied ? 'Copied' : 'Copy link'}
        </button>

        <button type="button" className="btn btn-text share-action" onClick={handlePrint}>
          Print QR card
        </button>

        <button
          type="button"
          className="btn btn-text"
          style={{ width: '100%', marginTop: 8 }}
          onClick={() => navigate(`/events/${eventId}`)}
        >
          Open photo wall
        </button>
      </main>
    </MomentoShell>
  )
}
