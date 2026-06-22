import { useState } from 'react'
import { useStore } from '../store.jsx'
import { searchPlaces } from '../data/geocode.js'

const EMOJIS = ['✈️', '🏖️', '🏔️', '🌸', '🗺️', '🚗', '🎒', '🏛️', '🌴', '🍷']

export default function NewTripModal({ onClose, onCreated }) {
  const { dispatch } = useStore()
  const [title, setTitle] = useState('')
  const [destination, setDestination] = useState('')
  const [emoji, setEmoji] = useState('✈️')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  async function handleCreate(e) {
    e.preventDefault()
    let center = null
    if (destination.trim()) {
      try {
        const hits = await searchPlaces(destination)
        if (hits[0]) center = { lat: hits[0].lat, lng: hits[0].lng }
      } catch {
        /* geocoding is best-effort */
      }
    }
    const id = `trip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
    dispatch({
      type: 'ADD_TRIP',
      id,
      title: title.trim() || destination.trim() || 'Untitled trip',
      destination: destination.trim(),
      emoji,
      startDate,
      endDate,
      center,
    })
    onCreated(id)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Plan a new trip</h2>
        <form onSubmit={handleCreate}>
          <label className="field">
            <span>Trip name</span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer in Lisbon"
            />
          </label>

          <label className="field">
            <span>Destination</span>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="City or region"
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Start date</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label className="field">
              <span>End date</span>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>

          <div className="field">
            <span>Icon</span>
            <div className="emoji-picker">
              {EMOJIS.map((e) => (
                <button
                  type="button"
                  key={e}
                  className={'emoji-opt' + (emoji === e ? ' active' : '')}
                  onClick={() => setEmoji(e)}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create trip
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
