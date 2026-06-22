// A sample trip so the app looks alive on first load. Users can delete it.
export function seedTrips() {
  return [
    {
      id: 'trip-kyoto',
      title: 'Kyoto Spring Escape',
      destination: 'Kyoto, Japan',
      emoji: '🌸',
      startDate: '2026-04-03',
      endDate: '2026-04-06',
      center: { lat: 35.0116, lng: 135.7681 },
      places: [
        {
          id: 'p1', name: 'Fushimi Inari Taisha', category: 'attraction',
          address: '68 Fukakusa Yabunouchicho, Fushimi Ward', lat: 34.9671, lng: 135.7727,
          dayIndex: 0, order: 0, time: '08:30', cost: 0, notes: 'Go early to beat the crowds on the torii gate trail.',
        },
        {
          id: 'p2', name: 'Nishiki Market', category: 'food',
          address: 'Nakagyo Ward', lat: 35.0050, lng: 135.7649,
          dayIndex: 0, order: 1, time: '12:30', cost: 25, notes: 'Street food lunch — try the tamagoyaki.',
        },
        {
          id: 'p3', name: 'Kiyomizu-dera', category: 'attraction',
          address: '1-294 Kiyomizu, Higashiyama Ward', lat: 34.9949, lng: 135.7851,
          dayIndex: 1, order: 0, time: '09:00', cost: 4, notes: 'Sunset views over the city are worth a second trip.',
        },
        {
          id: 'p4', name: 'Arashiyama Bamboo Grove', category: 'nature',
          address: 'Ukyo Ward', lat: 35.0094, lng: 135.6669,
          dayIndex: 2, order: 0, time: '08:00', cost: 0, notes: '',
        },
        {
          id: 's1', name: 'Kinkaku-ji (Golden Pavilion)', category: 'attraction',
          address: '1 Kinkakujicho, Kita Ward', lat: 35.0394, lng: 135.7292,
          dayIndex: null, order: 0, time: '', cost: 5, notes: 'Maybe day 3 if there is time.',
        },
      ],
    },
  ]
}
