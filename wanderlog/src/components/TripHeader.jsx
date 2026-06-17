import { useState } from 'react'
import { useStore } from '../store.jsx'

function fmtRange(trip) {
  if (!trip.startDate) return 'No dates set'
  const opts = { month: 'short', day: 'numeric' }
  const s = new Date(trip.startDate + 'T00:00:00').toLocaleDateString(undefined, opts)
  if (!trip.endDate) return s
  const e = new Date(trip.endDate + 'T00:00:00').toLocaleDateString(undefined, {
    ...opts,
    year: 'numeric',
  })
  return `${s} – ${e}`
}

export default function TripHeader({ trip, days, budget }) {
  const { dispatch } = useStore()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(trip)

  function save() {
    dispatch({
      type: 'UPDATE_TRIP',
      tripId: trip.id,
      patch: {
        title: draft.title.trim() || 'Untitled trip',
        destination: draft.destination,
        startDate: draft.startDate,
        endDate: draft.endDate,
      },
    })
    setEditing(false)
  }

  function remove() {
    if (confirm(`Delete "${trip.title}"? This can't be undone.`)) {
      dispatch({ type: 'DELETE_TRIP', tripId: trip.id })
    }
  }

  return (
    <header className="trip-header">
      <div className="trip-header-main">
        <span className="trip-header-emoji">{trip.emoji}</span>
        <div>
          <h1>{trip.title}</h1>
          <div className="trip-header-sub">
            {trip.destination && <span>{trip.destination}</span>}
            <span>·</span>
            <span>{fmtRange(trip)}</span>
            <span>·</span>
            <span>{days.length || '—'} day{days.length === 1 ? '' : 's'}</span>
          </div>
        </div>
      </div>

      <div className="trip-header-side">
        <div className="budget-chip">
          <span className="budget-label">Budget</span>
          <span className="budget-value">${budget.toLocaleString()}</span>
        </div>
        <button className="btn btn-ghost" onClick={() => { setDraft(trip); setEditing(true) }}>
          Edit
        </button>
        <button className="btn btn-ghost danger" onClick={remove}>
          Delete
        </button>
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit trip</h2>
            <label className="field">
              <span>Trip name</span>
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Destination</span>
              <input
                value={draft.destination}
                onChange={(e) => setDraft({ ...draft, destination: e.target.value })}
              />
            </label>
            <div className="field-row">
              <label className="field">
                <span>Start date</span>
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                />
              </label>
              <label className="field">
                <span>End date</span>
                <input
                  type="date"
                  value={draft.endDate}
                  min={draft.startDate || undefined}
                  onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={save}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
