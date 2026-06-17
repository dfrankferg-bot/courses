import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store.jsx'
import { searchPlaces } from '../data/geocode.js'
import { CATEGORIES, categoryOf } from '../data/categories.js'

export default function AddPlaceForm({ trip, dayIndex }) {
  const { dispatch } = useStore()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const timer = useRef(null)

  // Debounced search against Nominatim.
  useEffect(() => {
    if (!open) return
    clearTimeout(timer.current)
    if (query.trim().length < 3) {
      setResults([])
      return
    }
    setLoading(true)
    setError('')
    timer.current = setTimeout(async () => {
      try {
        const hits = await searchPlaces(query, { near: trip.center })
        setResults(hits)
      } catch (e) {
        setError('Search is unavailable right now. You can still add a place by name.')
      } finally {
        setLoading(false)
      }
    }, 450)
    return () => clearTimeout(timer.current)
  }, [query, open, trip.center])

  function add(place) {
    dispatch({
      type: 'ADD_PLACE',
      tripId: trip.id,
      place: {
        name: place.name,
        category: place.category || 'other',
        address: place.address || '',
        lat: place.lat ?? null,
        lng: place.lng ?? null,
        dayIndex,
        time: '',
        cost: 0,
        notes: '',
      },
    })
    setQuery('')
    setResults([])
    setOpen(false)
  }

  function addManual() {
    if (!query.trim()) return
    add({ name: query.trim(), category: 'other' })
  }

  if (!open) {
    return (
      <button className="add-place-trigger" onClick={() => setOpen(true)}>
        + Add a place
      </button>
    )
  }

  return (
    <div className="add-place">
      <div className="add-place-input">
        <input
          autoFocus
          value={query}
          placeholder="Search for a place, attraction, restaurant…"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) add(results[0])
            if (e.key === 'Enter' && !results[0]) addManual()
            if (e.key === 'Escape') setOpen(false)
          }}
        />
        <button className="link-btn" onClick={() => { setOpen(false); setQuery('') }}>
          Close
        </button>
      </div>

      {loading && <div className="add-place-hint">Searching…</div>}
      {error && <div className="add-place-hint error">{error}</div>}

      {results.length > 0 && (
        <ul className="results">
          {results.map((r, i) => {
            const cat = categoryOf(r.category)
            return (
              <li key={i}>
                <button className="result" onClick={() => add(r)}>
                  <span className="result-emoji">{cat.emoji}</span>
                  <span className="result-body">
                    <span className="result-name">{r.name}</span>
                    <span className="result-address">{r.address}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {!loading && query.trim().length >= 1 && results.length === 0 && (
        <button className="add-place-hint link" onClick={addManual}>
          + Add “{query.trim()}” as a custom place
        </button>
      )}
    </div>
  )
}
