import { useState } from 'react'
import NewTripModal from './NewTripModal.jsx'

export default function EmptyState({ onCreate }) {
  const [showNew, setShowNew] = useState(false)
  return (
    <div className="empty-state">
      <div className="empty-card">
        <div className="empty-emoji">🗺️</div>
        <h1>Start planning your next trip</h1>
        <p className="muted">
          Build a day-by-day itinerary, drop places on the map, and keep an eye on your budget —
          all saved right in your browser.
        </p>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + Create a trip
        </button>
      </div>
      {showNew && (
        <NewTripModal onClose={() => setShowNew(false)} onCreated={(id) => onCreate(id)} />
      )}
    </div>
  )
}
