import { useState } from 'react'
import { useStore, daysOfTrip, tripBudget } from '../store.jsx'
import NewTripModal from './NewTripModal.jsx'

export default function Sidebar({ activeId, onSelect }) {
  const { trips } = useStore()
  const [showNew, setShowNew] = useState(false)

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-pin">📍</span>
        <span className="brand-name">Wanderlog</span>
      </div>

      <button className="btn btn-primary new-trip-btn" onClick={() => setShowNew(true)}>
        + New trip
      </button>

      <div className="trip-list">
        <div className="trip-list-label">Your trips</div>
        {trips.length === 0 && <p className="muted small">No trips yet.</p>}
        {trips.map((trip) => {
          const days = daysOfTrip(trip).length
          const stops = trip.places.filter((p) => p.dayIndex !== null).length
          return (
            <button
              key={trip.id}
              className={'trip-item' + (trip.id === activeId ? ' active' : '')}
              onClick={() => onSelect(trip.id)}
            >
              <span className="trip-item-emoji">{trip.emoji}</span>
              <span className="trip-item-body">
                <span className="trip-item-title">{trip.title}</span>
                <span className="trip-item-meta">
                  {trip.destination || 'No destination'}
                  {days ? ` · ${days} day${days > 1 ? 's' : ''}` : ''}
                  {stops ? ` · ${stops} stop${stops > 1 ? 's' : ''}` : ''}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="sidebar-foot muted small">
        Saved locally in your browser ·{' '}
        {trips.reduce((n, t) => n + t.places.length, 0)} places
      </div>

      {showNew && (
        <NewTripModal
          onClose={() => setShowNew(false)}
          onCreated={(id) => {
            setShowNew(false)
            onSelect(id)
          }}
        />
      )}
    </aside>
  )
}
