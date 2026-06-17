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
    case 'IMPORT_TRIP': {
      const t = action.trip || {}
      const trip = {
        id: action.id || uid('trip'),
        title: t.title || 'Imported trip',
        destination: t.destination || '',
        emoji: t.emoji || '✈️',
        startDate: t.startDate || '',
        endDate: t.endDate || '',
        center: t.center || null,
        places: (t.places || []).map((p, i) => ({
          ...p,
          id: uid('place'),
          order: p.order ?? i,
        })),
      }
      return [trip, ...state]
    }
    case 'UPDATE_TRIP':
      return state.map((t) => (t.id === action.tripId ? { ...t, ...action.patch } : t))
    case 'DELETE_TRIP':
      return state.filter((t) => t.id !== action.tripId)
    case 'ADD_PLACE':
      return state.map((t) => {
        if (t.id !== action.tripId) return t
        const order = t.places.filter((p) => p.dayIndex === action.place.dayIndex).length
        return { ...t, places: [...t.places, { id: uid('place'), order, ...action.place }] }
      })
    case 'MOVE_PLACE': {
      const { tripId, placeId, dayIndex, beforeId } = action
      return state.map((t) => {
        if (t.id !== tripId) return t
        const moving = t.places.find((p) => p.id === placeId)
        if (!moving) return t
        const target = { ...moving, dayIndex }
        // Rebuild the ordered list for the destination day, inserting the moved place.
        const dayList = t.places
          .filter((p) => p.id !== placeId && p.dayIndex === dayIndex)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        let at = dayList.length
        if (beforeId) {
          const idx = dayList.findIndex((p) => p.id === beforeId)
          if (idx >= 0) at = idx
        }
        dayList.splice(at, 0, target)
        const orderById = new Map(dayList.map((p, i) => [p.id, i]))
        return {
          ...t,
          places: t.places.map((p) => {
            if (p.id === placeId) return { ...target, order: orderById.get(placeId) }
            if (orderById.has(p.id)) return { ...p, order: orderById.get(p.id) }
            return p
          }),
        }
      })
    }
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

// Totals per category, sorted high → low, for the budget breakdown.
export function budgetByCategory(trip) {
  const totals = {}
  for (const p of trip?.places || []) {
    const cost = Number(p.cost) || 0
    if (cost <= 0) continue
    totals[p.category] = (totals[p.category] || 0) + cost
  }
  return Object.entries(totals)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
}
