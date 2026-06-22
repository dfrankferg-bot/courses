// Lightweight place search using OpenStreetMap's free Nominatim service.
// No API key required. Be gentle: one request per user action, debounced by the UI.
export async function searchPlaces(query, { near } = {}) {
  const q = query.trim()
  if (q.length < 3) return []
  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '6',
  })
  // Bias results toward the trip's area when we know it.
  if (near && Number.isFinite(near.lat) && Number.isFinite(near.lng)) {
    const d = 1.5
    params.set('viewbox', `${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}`)
  }
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Search failed (${res.status})`)
  const data = await res.json()
  return data.map((r) => ({
    name: r.name || r.display_name.split(',')[0],
    address: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    category: guessCategory(r),
  }))
}

function guessCategory(r) {
  const t = `${r.type} ${r.category}`.toLowerCase()
  if (/hotel|hostel|guest|motel|lodging/.test(t)) return 'hotel'
  if (/restaurant|cafe|bar|food|pub|fast_food|bakery/.test(t)) return 'food'
  if (/park|forest|wood|beach|nature|peak|water|garden/.test(t)) return 'nature'
  if (/shop|mall|market|store|supermarket/.test(t)) return 'shopping'
  if (/station|airport|bus|train|transport/.test(t)) return 'transport'
  if (/museum|attraction|monument|castle|temple|viewpoint|gallery|tourism/.test(t))
    return 'attraction'
  return 'other'
}
