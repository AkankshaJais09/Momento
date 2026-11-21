import { useState } from 'react'

export default function DeleteEventDialog({ event, onCancel, onDelete, deleting, error }) {
  const [confirmation, setConfirmation] = useState('')
  const canDelete = confirmation.trim() === event.name && !deleting

  return (
    <div className="delete-event-backdrop">
      <section
        className="delete-event-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-event-title"
        aria-describedby="delete-event-description"
      >
        <h2 id="delete-event-title">Delete {event.name}?</h2>
        <p id="delete-event-description">
          Removes all photos, voice notes and comments. This can't be undone.
        </p>
        {error ? <p className="delete-event-dialog__error" role="alert">{error}</p> : null}
        <label htmlFor="delete-event-confirmation">Type "{event.name}" to confirm</label>
        <input
          id="delete-event-confirmation"
          className="delete-event-dialog__input"
          type="text"
          autoComplete="off"
          autoFocus
          value={confirmation}
          onChange={(inputEvent) => setConfirmation(inputEvent.target.value)}
          disabled={deleting}
        />
        <div className="delete-event-dialog__actions">
          <button type="button" className="delete-event-dialog__cancel" onClick={onCancel} disabled={deleting}>
            Cancel
          </button>
          <button type="button" className="delete-event-dialog__confirm" onClick={onDelete} disabled={!canDelete}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </section>
    </div>
  )
}
