<<<<<<< HEAD
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
=======
// Create Event form component allowing users to start a new event photo album.
// Collects event name, optional description, start date, and end date with validation.

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Plus, ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

export default function CreateEvent({ onCreated, onCancel }) {
  useDocumentMeta('Create an Event', 'Start a new shared photo album for your trip or gathering.');
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanName = name.trim();
    if (!cleanName) {
      setError('Event name is required.');
      return;
    }

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      setError('End date cannot be earlier than start date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: cleanName,
        description: description.trim(),
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate).toISOString() : null,
      };

      const newEvent = await api.post('/events/', payload);
      showToast('Event created successfully!', 'success');
      if (onCreated) {
        onCreated(newEvent);
      } else {
        const eventId = newEvent.id || newEvent.pk;
        navigate(`/events/${eventId}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to create event. Please verify your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '560px',
        margin: '0 auto',
        padding: 'var(--space-6) var(--space-4)',
      }}
    >
      <div style={{ marginBottom: 'var(--space-6)' }}>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            style={{ marginBottom: 'var(--space-4)', padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
          >
            <ArrowLeft size={14} />
            <span>Back to events</span>
          </button>
        ) : (
          <Link
            to="/events"
            className="btn btn-secondary"
            style={{ marginBottom: 'var(--space-4)', padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
          >
            <ArrowLeft size={14} />
            <span>Back to events</span>
          </Link>
        )}

        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 600,
            margin: '0 0 var(--space-2) 0',
            color: 'var(--color-text)',
          }}
        >
          Create an event
        </h1>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-text-muted)',
            margin: 0,
          }}
        >
          Set up a shared photo album for a trip, celebration, or meetup.
        </p>
      </div>

      <div className="card">
        {error && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-2)',
              padding: 'var(--space-3)',
              marginBottom: 'var(--space-4)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(201, 42, 42, 0.1)',
              border: '1px solid var(--color-danger)',
              color: 'var(--color-danger)',
              fontSize: '0.875rem',
              lineHeight: 1.4,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label
              htmlFor="eventName"
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 500,
                marginBottom: 'var(--space-1)',
                color: 'var(--color-text)',
              }}
            >
              Event name <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              id="eventName"
              type="text"
              required
              maxLength={200}
              className="input"
              placeholder="Summer Road Trip 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label
              htmlFor="eventDescription"
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 500,
                marginBottom: 'var(--space-1)',
                color: 'var(--color-text)',
              }}
            >
              Description <span style={{ color: 'var(--color-text-subtle)' }}>(optional)</span>
            </label>
            <textarea
              id="eventDescription"
              rows={3}
              maxLength={1000}
              className="input"
              placeholder="Notes or details about this event..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--space-4)',
              marginBottom: 'var(--space-6)',
            }}
          >
            <div>
              <label
                htmlFor="startDate"
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  marginBottom: 'var(--space-1)',
                  color: 'var(--color-text)',
                }}
              >
                Start date <span style={{ color: 'var(--color-text-subtle)' }}>(optional)</span>
              </label>
              <input
                id="startDate"
                type="date"
                className="input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label
                htmlFor="endDate"
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  marginBottom: 'var(--space-1)',
                  color: 'var(--color-text)',
                }}
              >
                End date <span style={{ color: 'var(--color-text-subtle)' }}>(optional)</span>
              </label>
              <input
                id="endDate"
                type="date"
                className="input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="btn btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ padding: '0.5rem 1.25rem' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Creating event...</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Create event</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
>>>>>>> 898b826f7d4c2eb9d89ffa11785bb347e39fe93f
}
