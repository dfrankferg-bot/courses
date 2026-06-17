import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { categoryOf } from '../data/categories.js'

function pinIcon(cat, focused) {
  return L.divIcon({
    className: 'pin-wrap',
    html: `<div class="pin${focused ? ' pin-focused' : ''}" style="--cat:${cat.color}">
             <span>${cat.emoji}</span>
           </div>`,
    iconSize: [34, 44],
    iconAnchor: [17, 42],
    popupAnchor: [0, -38],
  })
}

// Pan/zoom to fit every located place whenever the set changes.
function FitBounds({ points }) {
  const map = useMap()
  useMemo(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13)
    } else {
      map.fitBounds(points.map((p) => [p.lat, p.lng]), { padding: [40, 40] })
    }
  }, [points, map])
  return null
}

export default function MapPanel({ trip, center, focusId, onFocus }) {
  const located = trip.places.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))

  return (
    <div className="map-wrap">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={12}
        scrollWheelZoom
        className="leaflet-root"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {located.map((p) => {
          const cat = categoryOf(p.category)
          return (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={pinIcon(cat, p.id === focusId)}
              eventHandlers={{
                mouseover: () => onFocus?.(p.id),
                mouseout: () => onFocus?.(null),
              }}
            >
              <Popup>
                <strong>{p.name}</strong>
                <br />
                <span className="muted small">{cat.label}</span>
                {p.address && <div className="popup-address">{p.address}</div>}
              </Popup>
            </Marker>
          )
        })}
        <FitBounds points={located} />
      </MapContainer>

      {located.length === 0 && (
        <div className="map-empty">
          <p>No mapped places yet.</p>
          <p className="muted small">Search for a place in the itinerary to drop a pin here.</p>
        </div>
      )}
    </div>
  )
}
