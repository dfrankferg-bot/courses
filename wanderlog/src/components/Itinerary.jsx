import { useMemo } from 'react'
import { useStore } from '../store.jsx'
import PlaceCard from './PlaceCard.jsx'
import AddPlaceForm from './AddPlaceForm.jsx'

function dayLabel(date, index) {
  return {
    title: `Day ${index + 1}`,
    sub: date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
  }
}

export default function Itinerary({ trip, days, focusId, onFocus }) {
  const byDay = useMemo(() => {
    const map = new Map()
    days.forEach((d) => map.set(d.index, []))
    map.set(null, [])
    trip.places.forEach((p) => {
      const key = map.has(p.dayIndex) ? p.dayIndex : null
      map.get(key).push(p)
    })
    // Sort each day's stops by time (blank times sink to the bottom).
    for (const list of map.values()) {
      list.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
    }
    return map
  }, [trip.places, days])

  const saved = byDay.get(null) || []

  return (
    <div className="itinerary">
      {days.length === 0 && (
        <p className="muted">Set start and end dates (Edit ↑) to build a day-by-day itinerary.</p>
      )}

      {days.map((d) => {
        const label = dayLabel(d.date, d.index)
        const stops = byDay.get(d.index) || []
        return (
          <div className="day" key={d.index}>
            <div className="day-head">
              <div>
                <span className="day-title">{label.title}</span>
                <span className="day-sub">{label.sub}</span>
              </div>
              <span className="day-count">{stops.length} stop{stops.length === 1 ? '' : 's'}</span>
            </div>
            <div className="day-stops">
              {stops.length === 0 && <p className="muted small day-empty">Nothing planned yet.</p>}
              {stops.map((p, i) => (
                <PlaceCard
                  key={p.id}
                  trip={trip}
                  place={p}
                  index={i + 1}
                  days={days}
                  focused={p.id === focusId}
                  onFocus={onFocus}
                />
              ))}
            </div>
            <AddPlaceForm trip={trip} dayIndex={d.index} />
          </div>
        )
      })}

      <div className="day saved-day">
        <div className="day-head">
          <div>
            <span className="day-title">💡 Want to go</span>
            <span className="day-sub">Ideas not yet scheduled</span>
          </div>
          <span className="day-count">{saved.length}</span>
        </div>
        <div className="day-stops">
          {saved.length === 0 && (
            <p className="muted small day-empty">Add places you're considering here.</p>
          )}
          {saved.map((p) => (
            <PlaceCard
              key={p.id}
              trip={trip}
              place={p}
              days={days}
              focused={p.id === focusId}
              onFocus={onFocus}
            />
          ))}
        </div>
        <AddPlaceForm trip={trip} dayIndex={null} />
      </div>
    </div>
  )
}
