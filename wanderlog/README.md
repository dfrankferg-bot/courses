# Wanderlog — Trip Planner

A travel trip-planning web app inspired by [Wanderlog](https://wanderlog.com).
Plan trips day by day, search for real places, drop them on a map, and keep an
eye on your budget — all in the browser, with no account or backend required.

> This is an independent, educational re-creation of the *concept*. It does not
> use any of Wanderlog's code, assets, or branding.

## Features

- **Multiple trips** — create trips with a destination, dates, and an icon.
- **Day-by-day itinerary** — days are generated from the trip dates; add and
  edit stops.
- **Drag-and-drop reordering** — grab any stop and drag it to reorder within a
  day or move it to another day (or to the "Want to go" list). Manual order is
  saved per stop.
- **"Want to go" list** — park ideas that aren't scheduled yet, then drag them
  onto a day later.
- **Real place search** — type a place name to search OpenStreetMap
  (via the free Nominatim API) and add it with its address and coordinates.
  No API key required.
- **Interactive map** — every located stop shows as a category-colored pin
  (Leaflet + OpenStreetMap tiles). Hovering a stop highlights its pin and
  vice-versa; the map auto-fits to your places.
- **Budget tracking + breakdown** — give each stop a cost and the trip total
  updates live; click the budget chip for a per-category breakdown with bars
  and percentages.
- **Sharing & export** — generate a shareable link that encodes the entire
  itinerary in the URL (opening it imports a copy, no backend), or export the
  trip as Markdown, JSON, or a printable / PDF itinerary.
- **Local persistence** — everything is saved to `localStorage`, so your trips
  survive a refresh. A sample Kyoto trip is included on first load.

## Tech stack

- React 18 + Vite
- react-leaflet / Leaflet for the map
- OpenStreetMap Nominatim for geocoding
- Plain CSS (no UI framework)

## Getting started

```bash
cd wanderlog
npm install
npm run dev
```

Then open the printed local URL (default http://localhost:5173).

To build for production:

```bash
npm run build
npm run preview
```

## Project structure

```
wanderlog/
├── index.html
├── vite.config.js
├── public/favicon.svg
└── src/
    ├── main.jsx              # entry point
    ├── App.jsx               # top-level layout + active trip
    ├── store.jsx             # reducer + localStorage + helpers
    ├── styles.css
    ├── data/
    │   ├── categories.js      # place categories (emoji + color)
    │   ├── geocode.js         # Nominatim place search
    │   ├── share.js           # share link + Markdown/JSON/print export
    │   └── seed.js            # sample trip
    └── components/
        ├── Sidebar.jsx        # trip switcher
        ├── NewTripModal.jsx   # create a trip
        ├── EmptyState.jsx
        ├── TripView.jsx       # itinerary + map split view
        ├── TripHeader.jsx     # title, dates, budget, share/edit/delete
        ├── BudgetBreakdown.jsx# per-category budget popover
        ├── ShareModal.jsx     # share link + export options
        ├── Itinerary.jsx      # days + "want to go" + drag-and-drop
        ├── PlaceCard.jsx      # a single draggable stop (view/edit)
        ├── AddPlaceForm.jsx   # search + add a place
        └── MapPanel.jsx       # Leaflet map with pins
```

## Notes

- Geocoding and map tiles require an internet connection at runtime (they call
  OpenStreetMap). The rest of the app works offline.
- Data lives only in your browser. Clearing site data removes your trips.
