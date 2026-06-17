import { useEffect, useRef, useState } from 'react'
import { useStore } from './store.jsx'
import { readSharedTrip, clearShareHash } from './data/share.js'
import Sidebar from './components/Sidebar.jsx'
import TripView from './components/TripView.jsx'
import EmptyState from './components/EmptyState.jsx'

export default function App() {
  const { trips, dispatch } = useStore()
  const [activeId, setActiveId] = useState(() => trips[0]?.id ?? null)
  const importedRef = useRef(false)

  // If the app was opened via a share link, import that trip once and select it.
  useEffect(() => {
    if (importedRef.current) return
    const shared = readSharedTrip()
    if (shared) {
      importedRef.current = true
      const id = `trip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
      dispatch({ type: 'IMPORT_TRIP', id, trip: shared })
      setActiveId(id)
      clearShareHash()
    }
  }, [dispatch])

  // Keep a valid selection if the active trip gets deleted.
  useEffect(() => {
    if (!trips.find((t) => t.id === activeId)) {
      setActiveId(trips[0]?.id ?? null)
    }
  }, [trips, activeId])

  const activeTrip = trips.find((t) => t.id === activeId) || null

  return (
    <div className="app">
      <Sidebar activeId={activeId} onSelect={setActiveId} />
      <main className="main">
        {activeTrip ? (
          <TripView trip={activeTrip} />
        ) : (
          <EmptyState onCreate={setActiveId} />
        )}
      </main>
    </div>
  )
}
