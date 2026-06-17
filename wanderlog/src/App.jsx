import { useEffect, useState } from 'react'
import { useStore } from './store.jsx'
import Sidebar from './components/Sidebar.jsx'
import TripView from './components/TripView.jsx'
import EmptyState from './components/EmptyState.jsx'

export default function App() {
  const { trips } = useStore()
  const [activeId, setActiveId] = useState(() => trips[0]?.id ?? null)

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
