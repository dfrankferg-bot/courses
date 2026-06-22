import { useState } from 'react'
import { useStore } from '../store.jsx'
import { categoryOf, CATEGORIES, CATEGORY_KEYS } from '../data/categories.js'

export default function PlaceCard({
  trip,
  place,
  index,
  days,
  focused,
  onFocus,
  dragging,
  onDragStart,
  onDragEnd,
  onDropOnCard,
}) {
  const { dispatch } = useStore()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(place)
  const cat = categoryOf(place.category)

  function patch(p) {
    dispatch({ type: 'UPDATE_PLACE', tripId: trip.id, placeId: place.id, patch: p })
  }

  function saveEdit() {
    patch({
      name: draft.name.trim() || place.name,
      category: draft.category,
      time: draft.time,
      cost: Number(draft.cost) || 0,
      notes: draft.notes,
    })
    setEditing(false)
  }

  function moveTo(value) {
    dispatch({
      type: 'MOVE_PLACE',
      tripId: trip.id,
      placeId: place.id,
      dayIndex: value === '' ? null : Number(value),
      beforeId: null,
    })
  }

  return (
    <div
      className={'place-card' + (focused ? ' focused' : '') + (dragging ? ' dragging' : '')}
      style={{ '--cat': cat.color }}
      draggable={!editing}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart?.()
      }}
      onDragEnd={() => onDragEnd?.()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDropOnCard?.(e)}
      onMouseEnter={() => onFocus?.(place.id)}
      onMouseLeave={() => onFocus?.(null)}
    >
      <span className="drag-handle" title="Drag to reorder">⠿</span>
      {index != null && <span className="place-order">{index}</span>}
      <span className="place-emoji" title={cat.label}>{cat.emoji}</span>

      <div className="place-main">
        {editing ? (
          <div className="place-edit">
            <input
              className="place-edit-name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <div className="place-edit-row">
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              >
                {CATEGORY_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {CATEGORIES[k].emoji} {CATEGORIES[k].label}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={draft.time}
                onChange={(e) => setDraft({ ...draft, time: e.target.value })}
              />
              <span className="cost-input">
                $
                <input
                  type="number"
                  min="0"
                  value={draft.cost}
                  onChange={(e) => setDraft({ ...draft, cost: e.target.value })}
                />
              </span>
            </div>
            <textarea
              className="place-edit-notes"
              placeholder="Notes"
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
            <div className="place-edit-actions">
              <button className="btn btn-ghost small" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button className="btn btn-primary small" onClick={saveEdit}>
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="place-title-row">
              <span className="place-name">{place.name}</span>
              {place.time && <span className="place-time">{place.time}</span>}
              {place.cost > 0 && <span className="place-cost">${place.cost}</span>}
            </div>
            {place.address && <div className="place-address">{place.address}</div>}
            {place.notes && <div className="place-notes">{place.notes}</div>}
            <div className="place-actions">
              <select
                className="day-select"
                value={place.dayIndex == null ? '' : place.dayIndex}
                onChange={(e) => moveTo(e.target.value)}
                title="Move to day"
              >
                <option value="">💡 Want to go</option>
                {days.map((d) => (
                  <option key={d.index} value={d.index}>
                    Day {d.index + 1}
                  </option>
                ))}
              </select>
              <button className="link-btn" onClick={() => { setDraft(place); setEditing(true) }}>
                Edit
              </button>
              <button
                className="link-btn danger"
                onClick={() =>
                  dispatch({ type: 'DELETE_PLACE', tripId: trip.id, placeId: place.id })
                }
              >
                Remove
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
