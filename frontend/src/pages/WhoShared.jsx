import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import MomentoShell from '../components/MomentoShell'
import PageHeader from '../components/PageHeader'
import { request } from '../api'

function countLabel(count, singular) {
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}

export default function WhoShared() {
  const { eventId } = useParams()
  const [contributors, setContributors] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    request(`/events/${eventId}/contributors/`)
      .then((people) => {
        if (active) setContributors(people)
      })
      .catch((err) => {
        if (active) setError(err.message || 'Could not load contributors.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [eventId])

  const photoCount = contributors.reduce((total, person) => total + (Number(person.photo_count) || 0), 0)
  const voiceNoteCount = contributors.reduce((total, person) => total + (Number(person.voice_note_count) || 0), 0)

  return (
    <MomentoShell>
      <main className="momento-scroll who-shared-page">
        <PageHeader label="HOST VIEW" title="Who shared" />
        <p className="subtext who-shared-summary">
          {countLabel(contributors.length, 'guest')} · {countLabel(photoCount, 'photo')} · {countLabel(voiceNoteCount, 'voice note')} · only you can see emails
        </p>
        {error ? <p role="alert" className="subtext">{error}</p> : null}
        {loading ? <p role="status" className="subtext">Loading guests…</p> : null}
        <div className="who-shared-list">
          {contributors.map((person) => (
            <section className="who-shared-row" key={person.user_id}>
              <span className="who-shared-avatar" aria-hidden="true">
                {(person.name?.trim().charAt(0) || '?').toUpperCase()}
              </span>
              <div className="who-shared-identity">
                <h2>{person.name}</h2>
                <p>{person.email}</p>
              </div>
              <div className="who-shared-tags">
                <span>{countLabel(Number(person.photo_count) || 0, 'photo')}</span>
                <span>{countLabel(Number(person.voice_note_count) || 0, 'voice note')}</span>
              </div>
            </section>
          ))}
          {!loading && !contributors.length && !error ? <p className="subtext">No one has shared yet.</p> : null}
        </div>
        <Link to={`/events/${eventId}/share`} className="who-shared-invite">
          <span>Share your link to get more guests</span>
          <span className="who-shared-invite__action">Copy link</span>
        </Link>
      </main>
    </MomentoShell>
  )
}
