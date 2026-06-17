// Place categories shared across the itinerary, map, and forms.
export const CATEGORIES = {
  attraction: { label: 'Attraction', emoji: '🎟️', color: '#7c5cff' },
  food: { label: 'Food & Drink', emoji: '🍽️', color: '#ff8c42' },
  hotel: { label: 'Lodging', emoji: '🏨', color: '#2d9cdb' },
  nature: { label: 'Nature', emoji: '🌲', color: '#27ae60' },
  shopping: { label: 'Shopping', emoji: '🛍️', color: '#eb5e9e' },
  transport: { label: 'Transport', emoji: '🚆', color: '#8a94a6' },
  other: { label: 'Other', emoji: '📍', color: '#e8505b' },
}

export const CATEGORY_KEYS = Object.keys(CATEGORIES)

export function categoryOf(key) {
  return CATEGORIES[key] || CATEGORIES.other
}
