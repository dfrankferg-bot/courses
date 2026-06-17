import { useMemo, useState } from 'react'
import { useStore, daysOfTrip, tripBudget } from '../store.jsx'
import Itinerary from './Itinerary.jsx'
import MapPanel from './MapPanel.jsx'
import TripHeader from './TripHeader.jsx'

export default function TripView({ trip }) {
  const { dispatch } = useStore()
  const [focusId, setFocusId] = useState(null)

  const days = useMemo(() => daysOfTrip(trip), [trip])
  const budget = tripBudget(trip)

  const center = useMemo(() => {
    if (trip.center && Number.isFinite(trip.center.lat)) return trip.center
    const p = trip.places.find((x) => Number.isFinite(x.lat))
    return p ? { lat: p.lat, lng: p.lng } : { lat: 20, lng: 0 }
  }, [trip.center, trip.places])

  return (
    <div className="trip-view">
      <TripHeader trip={trip} days={days} budget={budget} />
      <div className="trip-body">
        <section className="itinerary-pane">
          <Itinerary trip={trip} days={days} focusId={focusId} onFocus={setFocusId} />
        </section>
        <section className="map-pane">
          <MapPanel trip={trip} center={center} focusId={focusId} onFocus={setFocusId} />
        </section>
      </div>
    </div>
  )
}
