# Matcha Map

A recreation of the Matcha Map app, built as a **React + Vite + TypeScript** web app —
a split-view interface with a list of matcha spots on the left and a dark Leaflet map
on the right.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed URL (default http://localhost:5173). In Cursor you can also use
the built-in terminal, or the "Run" panel.

Other scripts:

- `npm run build` — type-check + production build into `dist/`
- `npm run preview` — serve the production build locally

## Project structure

```
matcha-app/
├── index.html              # Vite entry (loads Inter + mounts React)
├── vite.config.ts
├── tsconfig.json
├── package.json
└── src/
    ├── main.tsx            # React root
    ├── App.tsx             # State + layout (spots, selection, add/punch/remove)
    ├── index.css           # All styles (CSS variables for the green theme)
    ├── types.ts            # Spot / PlaceResult types
    ├── data.ts             # Seed spots + mock autocomplete results
    └── components/
        ├── Sidebar.tsx     # Brand header, stat pills, spot list
        ├── SpotCard.tsx    # A single spot row
        ├── MapView.tsx     # Leaflet map (dark CARTO tiles) + FAB
        ├── Sheet.tsx       # Reusable bottom-sheet shell
        ├── DetailSheet.tsx # Spot detail + 10-slot punch card
        ├── AddSheet.tsx    # "Add Matcha Spot" form w/ autocomplete
        ├── Stars.tsx       # Star rating (read-only or interactive)
        └── icons.tsx       # Inline SVG icon set
```

## Notes

- **Map** uses Leaflet with the CARTO `dark_all` basemap to match the original's dark
  look (the provided Leaflet snippet, swapped from the light OSM tiles).
- **State is in-memory** in `App.tsx`. Refreshing resets to the seed data in `data.ts`.
- The name-field autocomplete is mocked (`placeResults` in `data.ts`); the original
  hits a live places/geocoding API. Swap that array for a real fetch to wire it up.
- Font is Inter, matching the original.
