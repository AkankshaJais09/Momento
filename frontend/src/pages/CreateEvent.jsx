import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MomentoShell from '../components/MomentoShell'
import PageHeader from '../components/PageHeader'
import { request } from '../api'

const WALL_SWATCHES = [
  { color: '#F3C9A8', label: 'Peach' },
  { color: '#C9D9C0', label: 'Sage' },
  { color: '#E8D2E6', label: 'Lilac' },
  { color: '#C6D8EC', label: 'Sky' },
  { color: '#F3D58A', label: 'Butter' },
  { color: '#E7B7C8', label: 'Rose' },
  { color: '#BFE3D6', label: 'Mint' },
  { color: '#D9CBB4', label: 'Sand' },
]

const TIME_CAPSULES = [
  { id: 'live', label: 'Live as they come' },
  { id: 'midnight', label: 'At midnight' },
  { id: 'next_morning', label: 'Next morning' },
  { id: 'one_year_later', label: 'One year later' },
]

export default function CreateEvent() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [when, setWhen] = useState('')
  const [wallColor, setWallColor] = useState(WALL_SWATCHES[0].color)
  const [timeCapsule, setTimeCapsule] = useState('live')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      const body = {
        name: name.trim(),
        wall_color: wallColor,
        time_capsule: timeCapsule,
      }
      if (when) {
        body.start_date = new Date(when).toISOString()
      }

      const created = await request('/events/', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      navigate(`/events/${created.id}/share`)
    } catch (err) {
      setError(err.message || 'Could not create your Momento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <MomentoShell>
      <form id="create-momento-form" className="momento-scroll" onSubmit={handleSubmit}>
        <PageHeader label="Create a Momento" title="What's the occasion?" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="field">
            <label htmlFor="event-name">Event name</label>
            <input
              id="event-name"
              className="input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Saturday night dinner"
              required
              autoComplete="off"
            />
          </div>

          <div className="field">
            <label htmlFor="event-when">When</label>
            <input
              id="event-when"
              className="input"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>

          <div className="field">
            <label id="wall-colour-label">Wall colour</label>
            <div
              role="group"
              aria-labelledby="wall-colour-label"
              style={{ display: 'flex', flexWrap: 'wrap', gap: 12, paddingTop: 4 }}
            >
              {WALL_SWATCHES.map((swatch) => (
                <button
                  key={swatch.label}
                  type="button"
                  className={`swatch${wallColor === swatch.color ? ' swatch--selected' : ''}`}
                  style={{ backgroundColor: swatch.color }}
                  aria-label={swatch.label}
                  aria-pressed={wallColor === swatch.color}
                  onClick={() => setWallColor(swatch.color)}
                />
              ))}
            </div>
          </div>

          <div className="field">
            <label id="time-capsule-label">Time capsule: when do photos appear?</label>
            <div className="chip-row" role="group" aria-label="Time capsule">
              {TIME_CAPSULES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="chip"
                  aria-pressed={timeCapsule === option.id}
                  onClick={() => setTimeCapsule(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error ? (
          <p
            role="alert"
            style={{
              marginTop: 16,
              color: 'var(--color-accent)',
              fontSize: '0.875rem',
            }}
          >
            {error}
          </p>
        ) : null}
      </form>

      <button
        type="submit"
        form="create-momento-form"
        className="btn btn-primary btn-pinned"
        disabled={saving || !name.trim()}
      >
        {saving ? 'Creating…' : 'Create my Momento'}
      </button>
    </MomentoShell>
  )
}
