# QuickSOS Agent Instructions

## Project Overview
QuickSOS is a Progressive Web App (PWA) that displays Malaysian emergency contacts based on the user's detected location. See [README.md](../README.md) for full details.

## Tech Stack
- Vanilla HTML/CSS/JS — no frameworks
- Vite for dev server and build
- OpenStreetMap Nominatim for reverse geocoding
- Service worker for offline PWA support

## Development Commands
```bash
npm run dev      # Start dev server
npm run build    # Production build (outputs to dist/)
npm run preview  # Preview production build
```

## Key Conventions

### Data Structure
- State data lives in `src/data/states/<state-slug>.json` and `public/data/states/<state-slug>.json` (keep both in sync)
- `national.json` contains fallback hotlines
- Each state JSON has `districts[]` with `district` (slug), `district_name` (display), `aliases[]`, and `facilities: { hospital, police, fire, apm }`
- Always add district aliases for common local names and abbreviations

### Code Style
- Use vanilla JS with ES modules (`type: "module"` in package.json)
- Keep UI text in **Malay (ms)** — this is a Malaysian public service app
- English is fine for code comments and internal names

### Service Worker
- `sw.js` uses cache-busting via `CACHE_NAME` constant
- **Bump the cache version** (e.g., `quicksos-v6` → `quicksos-v7`) whenever deploying a new build to avoid stale assets

### Geolocation & Fallbacks
- `main.js` handles browser geolocation → Nominatim reverse geocode → `src/data-loader.js` lookup
- Fallback chain: District → State facilities → National hotlines
- Manual selector in `index.html` allows users to pick state/district if geolocation fails

### Adding New State/District Data
1. Create `src/data/states/<state-slug>.json` following the schema in existing files
2. Mirror it to `public/data/states/<state-slug>.json`
3. Update `src/data-loader.js` `normalizeStateName()` if the state has unusual naming in Nominatim
4. Verify phone numbers against official government sources (KKM, RMP, Bomba, Civil Defence)

## Common Pitfalls
- Nominatim district names often don't match official district names exactly — aliases are critical
- The `public/data/` directory is what gets served in production; `src/data/` is for development/reference. Keep them identical.
- When adding a new contact type, update both `renderFacilities()` in `main.js` and the data schema.
