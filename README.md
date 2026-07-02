# QuickSOS 🚨

Emergency numbers for Malaysia at your fingertips. A Progressive Web App (PWA) that detects your location and displays local emergency contacts for your district.

## Features

- **Auto-detect location** — Uses browser geolocation + OpenStreetMap Nominatim to find your district
- **Local emergency numbers** — Shows hospital, police (IPD), bomba, and APM for your specific district
- **District aliases** — Search "Gunong" → Bachok, "KB" → Kota Bharu, etc.
- **Fallback chain** — District → State → National numbers if location unavailable
- **Manual selector** — Dropdown to select state/district if geolocation fails
- **PWA installable** — Add to home screen on Android & iOS
- **Offline support** — Works after first load via service worker caching
- **Tap to call** — One-tap calling with `tel:` links

## Coverage

| State | Hospital | Police (IPD) | Bomba | APM |
|-------|----------|--------------|-------|-----|
| Kelantan | 10 districts | 10 districts | ✅ | ✅ |
| Kuala Lumpur | — | 4 districts | ✅ | ✅ |
| Selangor | — | 4 districts | ✅ | ✅ |
| Kedah | 4 districts | 4 districts | ✅ | ✅ |
| Johor | 4 districts | 4 districts | ✅ | ✅ |
| Other 11 states | — | ✅ | ✅ | ✅ |

## Tech Stack

- Vanilla HTML/CSS/JS (no framework)
- Vite (dev server & build)
- OpenStreetMap Nominatim (free geocoding)
- PWA with service worker

## Data Sources

- [layanlah.blogspot.com](https://layanlah.blogspot.com) — Hospital, police, bomba directories
- [kickstory.net](https://kickstory.net) — IPD phone numbers all states
- [999.gov.my](https://999.gov.my) — APM/JPAM hotlines

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
quicksos/
├── src/
│   ├── data/
│   │   ├── national.json          # Fallback emergency hotlines
│   │   └── states/
│   │       ├── kelantan.json      # 10 districts
│   │       ├── kuala-lumpur.json
│   │       ├── selangor.json
│   │       └── ... (16 states)
│   └── data-loader.js             # State/district matching logic
├── index.html
├── main.js                        # App logic
├── style.css                      # Styles
├── sw.js                          # Service worker
└── manifest.json                  # PWA manifest
```

## How It Works

1. **Geolocation** → Browser gets lat/lon
2. **Reverse geocode** → Nominatim returns state + district
3. **Data lookup** → Match against local JSON data
4. **Display** → Show hospital, police, bomba, APM with tap-to-call

## License

MIT
