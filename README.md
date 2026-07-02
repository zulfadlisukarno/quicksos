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

### Hospital (Source: kkm.synchronet.my)

| State | Districts |
|-------|-----------|
| Kelantan | 9 (Gua Musang, Jeli, Machang, Pasir Mas, Kota Bharu, Kuala Krai, Tanah Merah, Pasir Puteh, Tumpat) |
| Johor | 5 (JB, Muar, Batu Pahat, Segamat, Kluang) |
| Kedah | 4 (Kota Setar, Kuala Muda, Kulim, Langkawi) |
| Melaka | 3 (Melaka Tengah, Alor Gajah, Jasin) |
| Negeri Sembilan | 4 (Port Dickson, Tampin, Jempol, Rembau) |
| Pahang | 4 (Kuantan, Temerloh, Raub, Bentong) |
| Penang | 4 (Timur Laut, Seberang Perai Utara, Barat Daya, Seberang Perai Tengah) |
| Perak | 4 (Ipoh, Taiping, Batu Gajah, Manjung) |
| Perlis | 1 (Kangar) |
| Sabah | 3 (KK, Lahad Datu, Keningau) |
| Sarawak | 2 (Miri, Bintulu) |
| Selangor | 3 (Petaling, Hulu Langat, Gombak) |
| Terengganu | 5 (Kuala Terengganu, Kemaman, Besut, Dungun, Setiu) |
| Kuala Lumpur | 1 (Hospital Kuala Lumpur) |
| Labuan | 1 (Hospital Labuan) |
| Putrajaya | 1 (Hospital Putrajaya) |

### Police / IPD (Source: rmp.gov.my)

| State | Districts |
|-------|-----------|
| Kelantan | 10 |
| Johor | 10 |
| Kedah | 10 |
| Melaka | 3 |
| Negeri Sembilan | 7 |
| Pahang | 11 |
| Penang | 5 |
| Perak | 14 |
| Perlis | 3 |
| Sabah | 19 |
| Sarawak | 23 |
| Selangor | 15 |
| Terengganu | 7 |
| Kuala Lumpur | 4 |

### Bomba / Fire (Source: bomba.gov.my)

| State | Phone |
|-------|-------|
| Johor | 07-2248281 |
| Kedah | 04-7344444 |
| Kelantan | 09-7444444 |
| Melaka | 06-2316844 |
| Negeri Sembilan | 06-7611444 |
| Pahang | 09-5732978 |
| Perak | 05-5474444 |
| Perlis | 04-9760544 |
| Penang | 04-2221444 |
| Sabah | 088-210214 |
| Sarawak | 082-364486 |
| Selangor | 03-55194444 |
| Terengganu | 09-6234444 |
| Kuala Lumpur | 03-26913703 |
| Putrajaya | 03-88880970 |
| Labuan | 087-414444 |

### APM / Civil Defence (Source: civildefence.gov.my)

| State | Phone |
|-------|-------|
| Johor | 07-2364567 |
| Kedah | 04-7205580 |
| Kelantan | 09-7416160 |
| Melaka | 06-2325466 |
| Negeri Sembilan | 06-7615587 |
| Pahang | 09-5445991 |
| Perak | 05-5288030 |
| Perlis | 04-9762510 |
| Penang | 04-2297804 |
| Sabah | 088-264161 |
| Sarawak | 082-256685 |
| Selangor | 03-33411031 |
| Terengganu | 09-6672991 |
| Kuala Lumpur | 03-26925533 |
| Putrajaya | 03-88881999 |
| Labuan | 087-425155 |

## Tech Stack

- Vanilla HTML/CSS/JS (no framework)
- Vite (dev server & build)
- OpenStreetMap Nominatim (free geocoding)
- PWA with service worker

## Data Sources

| Source | Data | URL |
|--------|------|-----|
| KKM Synchronet | Hospital phone numbers | https://kkm.synchronet.my/fasiliti-kesihatan/hospital/ |
| RMP Gov My | Police IPD directories | https://www.rmp.gov.my/direktori/direktori-pdrm/ |
| Bomba Gov My | Fire station directories | https://www.bomba.gov.my/balai-bomba-*/ |
| Civil Defence Gov My | APM district directories | https://www.civildefence.gov.my/*/ |
| Layanlah Blogspot | Backup data | https://layanlah.blogspot.com |
| Kickstory Net | Backup IPD numbers | https://kickstory.net |
| 999 Gov My | APM hotlines | https://999.gov.my |

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
│   │   ├── national.json              # Fallback emergency hotlines
│   │   └── states/
│   │       ├── kelantan.json          # 10 districts
│   │       ├── kuala-lumpur.json
│   │       ├── selangor.json
│   │       └── ... (16 states)
│   └── data-loader.js                 # State/district matching logic
├── index.html
├── main.js                            # App logic
├── style.css                          # Styles
├── sw.js                              # Service worker
└── manifest.json                      # PWA manifest
```

## How It Works

1. **Geolocation** → Browser gets lat/lon
2. **Reverse geocode** → Nominatim returns state + district
3. **Data lookup** → Match against local JSON data
4. **Display** → Show hospital, police, bomba, APM with tap-to-call

## License

MIT
