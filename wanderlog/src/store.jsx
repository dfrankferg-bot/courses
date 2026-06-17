import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { seedTrips } from './data/seed.js'

const STORAGE_KEY = 'wanderlog.trips.v1'

const uid = (prefix = 'id') =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (err) {
    console.warn('Could not read saved trips:', err)
  }
  return seedTrips()
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_TRIP': {
      const trip = {
        id: action.id || uid('trip'),
        title: action.title || 'Untitled trip',
        destination: action.destination || '',
        emoji: action.emoji || '✈️',
        startDate: action.startDate || '',
        endDate: action.endDate || '',
        center: action.center || null,
        places: [],
      }
      return [trip, ...state]
    }
    case 'UPDATE_TRIP':
      return state.map((t) => (t.id === action.tripId ? { ...t, ...action.patch } : t))
    case 'DELETE_TRIP':
      return state.filter((t) => t.id !== action.tripId)
    case 'ADD_PLACE':
      return state.map((t) =>
        t.id === action.tripId
          ? { ...t, places: [...t.places, { id: uid('place'), ...action.place }] }
          : t
      )
    case 'UPDATE_PLACE':
      return state.map((t) =>
        t.id === action.tripId
          ? {
              ...t,
              places: t.places.map((p) =>
                p.id === action.placeId ? { ...p, ...action.patch } : p
              ),
            }
          : t
      )
    case 'DELETE_PLACE':
      return state.map((t) =>
        t.id === action.tripId
          ? { ...t, places: t.places.filter((p) => p.id !== action.placeId) }
          : t
      )
    default:
      return state
  }
}

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [trips, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trips))
    } catch (err) {
      console.warn('Could not save trips:', err)
    }
  }, [trips])

  const value = useMemo(() => ({ trips, dispatch }), [trips])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within a StoreProvider')
  return ctx
}

// ---- helpers shared by components ----

export function daysOfTrip(trip) {
  if (!trip?.startDate || !trip?.endDate) return []
  const start = new Date(trip.startDate + 'T00:00:00')
  const end = new Date(trip.endDate + 'T00:00:00')
  if (isNaN(start) || isNaN(end) || end < start) return []
  const out = []
  const d = new Date(start)
  let i = 0
  while (d <= end) {
    out.push({ index: i, date: new Date(d) })
    d.setDate(d.getDate() + 1)
    i += 1
  }
  return out
}

export function tripBudget(trip) {
  return (trip?.places || []).reduce((sum, p) => sum + (Number(p.cost) || 0), 0)
}
