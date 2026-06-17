import { useMemo, useState } from 'react'
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
  const { dispatch } = useStore()
  const [dragId, setDragId] = useState(null)
  const [overDay, setOverDay] = useState(undefined)

  const byDay = useMemo(() => {
    const map = new Map()
    days.forEach((d) => map.set(d.index, []))
    map.set(null, [])
    trip.places.forEach((p) => {
      const key = map.has(p.dayIndex) ? p.dayIndex : null
      map.get(key).push(p)
    })
    // Manual order takes priority; time and insertion order break ties.
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          (a.order ?? 0) - (b.order ?? 0) || (a.time || '99:99').localeCompare(b.time || '99:99')
      )
    }
    return map
  }, [trip.places, days])

  function dropOnCard(e, targetPlace) {
    e.preventDefault()
    e.stopPropagation()
    if (dragId && dragId !== targetPlace.id) {
      dispatch({
        type: 'MOVE_PLACE',
        tripId: trip.id,
        placeId: dragId,
        dayIndex: targetPlace.dayIndex,
        beforeId: targetPlace.id,
      })
    }
    setDragId(null)
    setOverDay(undefined)
  }

  function dropOnDay(e, dayIndex) {
    e.preventDefault()
    if (dragId) {
      dispatch({ type: 'MOVE_PLACE', tripId: trip.id, placeId: dragId, dayIndex, beforeId: null })
    }
    setDragId(null)
    setOverDay(undefined)
  }

  const dragProps = (dayIndex) => ({
    onDragOver: (e) => {
      e.preventDefault()
      if (overDay !== dayIndex) setOverDay(dayIndex)
    },
    onDrop: (e) => dropOnDay(e, dayIndex),
  })

  function renderCard(p, index) {
    return (
      <PlaceCard
        key={p.id}
        trip={trip}
        place={p}
        index={index}
        days={days}
        focused={p.id === focusId}
        onFocus={onFocus}
        dragging={p.id === dragId}
        onDragStart={() => setDragId(p.id)}
        onDragEnd={() => { setDragId(null); setOverDay(undefined) }}
        onDropOnCard={(e) => dropOnCard(e, p)}
      />
    )
  }

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
            <div
              className={'day-stops' + (overDay === d.index ? ' drag-over' : '')}
              {...dragProps(d.index)}
            >
              {stops.length === 0 && <p className="muted small day-empty">Nothing planned yet.</p>}
              {stops.map((p, i) => renderCard(p, i + 1))}
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
          <span className="day-count">{(byDay.get(null) || []).length}</span>
        </div>
        <div
          className={'day-stops' + (overDay === null ? ' drag-over' : '')}
          {...dragProps(null)}
        >
          {(byDay.get(null) || []).length === 0 && (
            <p className="muted small day-empty">Add places you're considering here.</p>
          )}
          {(byDay.get(null) || []).map((p) => renderCard(p, null))}
        </div>
        <AddPlaceForm trip={trip} dayIndex={null} />
      </div>
    </div>
  )
}
