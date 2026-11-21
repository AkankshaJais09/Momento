import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import MomentoShell from '../components/MomentoShell'
import PageHeader from '../components/PageHeader'
import { request } from '../api'

function extractInviteCode(value) {
  const trimmed = value.trim()
  try {
    const url = new URL(trimmed)
    return url.searchParams.get('code') || url.searchParams.get('invite') || ''
  } catch {
    return trimmed
  }
}

export default function JoinEvent() {
  const [searchParams] = useSearchParams()
  const [invite, setInvite] = useState(searchParams.get('code') || '')
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setJoining(true)
    try {
      const result = await request('/events/join/', {
        method: 'POST',
        body: JSON.stringify({ invite_code: extractInviteCode(invite) }),
      })
      navigate(`/events/${result.event.id}`)
    } catch (err) {
      setError(err.message || 'Could not join this Momento.')
    } finally {
      setJoining(false)
    }
  }

  return (
    <MomentoShell>
      <main className="momento-scroll">
        <PageHeader label="Join a Momento" title="I have a link" />
        <form id="join-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="invite-link">Invite link or code</label>
            <input
              id="invite-link"
              className="input"
              value={invite}
              onChange={(event) => setInvite(event.target.value)}
              autoComplete="url"
              required
            />
          </div>
          {error ? <p role="alert" style={{ color: 'var(--color-accent)', marginTop: 16 }}>{error}</p> : null}
        </form>
      </main>
      <button type="submit" form="join-form" className="btn btn-primary btn-pinned" disabled={joining}>
        {joining ? 'Joining…' : 'Go to the wall'}
      </button>
    </MomentoShell>
  )
}
