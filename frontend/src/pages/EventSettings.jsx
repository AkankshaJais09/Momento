import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import MomentoShell from '../components/MomentoShell'
import PageHeader from '../components/PageHeader'
import { request } from '../api'

const COLORS = [
  ['#F3C9A8', 'Peach'], ['#C9D9C0', 'Sage'], ['#E8D2E6', 'Lilac'], ['#C6D8EC', 'Sky'],
  ['#F3D58A', 'Butter'], ['#E7B7C8', 'Rose'], ['#BFE3D6', 'Mint'], ['#D9CBB4', 'Sand'],
]
const CAPSULES = [
  ['live', 'Live as they come'], ['midnight', 'At midnight'],
  ['next_morning', 'Next morning'], ['one_year_later', 'One year later'],
]

export default function EventSettings() {
  const { eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    request(`/events/${eventId}/`)
      .then(setEvent)
      .catch((err) => setError(err.message || 'Could not load settings.'))
      .finally(() => setLoading(false))
  }, [eventId])

  async function update(patch) {
    setSaved(false)
    setError('')
    try {
      const updated = await request(`/events/${eventId}/`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      setEvent(updated)
      setSaved(true)
    } catch (err) {
      setError(err.message || 'Could not save settings.')
    }
  }

  function saveChanges() {
    if (!event) return
    update({
      wall_style: event.wall_style,
      wall_color: event.wall_color,
      time_capsule: event.time_capsule,
      voice_notes_enabled: event.voice_notes_enabled,
    })
  }

  if (event && event.my_role !== 'owner') {
    return <MomentoShell><main className="momento-scroll"><PageHeader label="Host tools" title="Settings" /><p role="alert">This page is for the host.</p></main></MomentoShell>
  }

  return (
    <MomentoShell wallColor={event?.wall_color} wallStyle={event?.wall_style || 'polaroid'}>
      <main className="momento-scroll settings-page">
        <PageHeader label="HOST TOOLS" title="Settings" />
        {error ? <p role="alert" style={{ color: 'var(--color-accent)' }}>{error}</p> : null}
        {loading ? <p role="status" className="subtext">Loading settings…</p> : null}
        <section className="settings-panel">
          <div className="settings-section">
            <p className="label-accent settings-section__label">Wall style</p>
            <div className="settings-style-grid">
              {['polaroid', 'film'].map((style) => (
                <button
                  key={style}
                  type="button"
                  className={`settings-style-card${event?.wall_style === style ? ' settings-style-card--selected' : ''}`}
                  aria-pressed={event?.wall_style === style}
                  onClick={() => update({ wall_style: style })}
                >
                  <span className={`settings-style-preview settings-style-preview--${style}`} aria-hidden="true" />
                  <span>{style === 'polaroid' ? 'Polaroid' : 'Film Roll'}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <p className="label-accent settings-section__label">Wall colour</p>
            <div className="settings-color-grid" role="group" aria-label="Wall colour">
              {COLORS.map(([color, name]) => (
                <button
                  key={color}
                  type="button"
                  className={`settings-color-swatch${event?.wall_color === color ? ' settings-color-swatch--selected' : ''}`}
                  style={{ backgroundColor: color }}
                  aria-label={name}
                  aria-pressed={event?.wall_color === color}
                  onClick={() => update({ wall_color: color })}
                />
              ))}
            </div>
          </div>

          <div className="settings-section">
            <p className="label-accent settings-section__label">Time capsule</p>
            <div className="chip-row">
              {CAPSULES.map(([id, label]) => (
                <button key={id} type="button" className="chip" aria-pressed={event?.time_capsule === id} onClick={() => update({ time_capsule: id })}>
                  {label}
                </button>
              ))}
            </div>
            {event?.capsule_release_at ? <p className="subtext settings-release-note">Photos appear {new Date(event.capsule_release_at).toLocaleString()}.</p> : null}
          </div>

          <div className="settings-section settings-section--voice">
            <p className="label-accent settings-section__label">Voice notes</p>
            <label className="settings-voice-toggle" htmlFor="voice-notes-toggle">
              <span className="settings-voice-toggle__copy">
                <span className="settings-voice-toggle__title">Allow voice notes</span>
                <span className="subtext settings-voice-toggle__description">Guests can add voice notes to photos.</span>
              </span>
              <input
                id="voice-notes-toggle"
                className="settings-switch"
                type="checkbox"
                role="switch"
                checked={Boolean(event?.voice_notes_enabled)}
                onChange={(inputEvent) => update({ voice_notes_enabled: inputEvent.target.checked })}
              />
            </label>
          </div>

          {saved ? <p role="status" className="subtext settings-saved">Saved.</p> : null}
          <div className="settings-save-row">
            <button type="button" className="btn settings-save-button" onClick={saveChanges} disabled={!event}>
              Save changes
            </button>
          </div>
        </section>
      </main>
    </MomentoShell>
  )
}
