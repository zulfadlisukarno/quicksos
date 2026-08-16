# Design: Move Reverse Geocoding to Photon with Nominatim Fallback

Date: 2026-08-16

## Context

`quicksos` is a PWA that detects a user's location via `navigator.geolocation`,
reverse-geocodes the lat/lon to a state + district, then looks up local emergency
numbers from bundled JSON data.

Reverse geocoding currently uses the Nominatim public API
(`https://nominatim.openstreetmap.org/reverse`). The goal is to switch to Photon
(`https://photon.komoot.io/reverse`) as the primary provider, keeping Nominatim
as a fallback for resilience and for cases where Photon does not return a usable
state.

## Requirements

- Photon is the primary reverse-geocoding provider.
- Nominatim remains as a fallback when Photon fails (HTTP error, empty feature
  set) or returns no `state`.
- Existing downstream consumers (`src/data-loader.js`'s `getEmergencyContacts`)
  continue to receive the same address object shape they already expect.
- The `gubed` debug page keeps working and shows which provider was used, the
  display name, and raw provider JSON.

## Provider differences

| Aspect | Nominatim | Photon |
|--------|-----------|--------|
| Endpoint | `.../reverse?format=json&lat=..&lon=..&zoom=10&accept-language=ms` | `.../reverse?lat=..&lon=..` |
| Response shape | `{ address: {...}, lat, lon, display_name }` | GeoJSON FeatureCollection; fields in `features[0].properties` |
| Language | `accept-language=ms` supported | Only `default|de|en|fr` (ms rejected) |
| State reliability | Returns `state` consistently | May omit `state` (e.g. KL returns `city` but no `state`) |
| Nearest-feature | Zoom-limited to admin areas | Returns nearest feature (street/house/building) |

Live test results:

- `photon.komoot.io/reverse?lat=3.139&lon=101.6869` (Bangsar, KL) →
  `properties.district: "Bangsar"`, `properties.city: "Kuala Lumpur"`, **no `state`**.
- `photon.komoot.io/reverse?lat=6.1244&lon=102.2392` (Kota Bharu) →
  `properties.state: "Kelantan"`, `properties.county: "Kota Bharu"`,
  `properties.city: "Kota Bharu"`.
- Photon rejects `lang=ms` (HTTP 400) — must NOT send a `lang` param.

## Architecture

### New module: `src/geocode.js`

Exports one function:

```
reverseGeocode(lat, lon) -> Promise<{
  address: { state, district, city, town, county, suburb, ... },
  displayName: string,
  provider: 'photon' | 'nominatim',
  url: string,       // request URL that succeeded
  raw: object        // raw provider response
} | null>
```

Logic:

1. Try Photon: `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}` (no `lang`).
   - If response not ok → go to fallback.
   - Parse `data.features[0].properties`. If no features → fallback.
   - Map properties to address shape: copy through `district`, `city`, `town`,
     `county`, `suburb`, `state`, `country`.
   - If `address.state` is missing → fallback (covers the KL case).
   - Build `displayName` from the most specific available field (e.g. city/town,
     plus state).
   - Return with `provider: 'photon'`.
2. Fallback Nominatim: existing URL with `accept-language=ms`.
   - Parse `data.address`. `displayName` from `data.display_name`.
   - Return with `provider: 'nominatim'`.
3. If both fail → return `null` (callers already handle null/error).

### `main.js`

- Remove the inline `reverseGeocode` (main.js:111-122).
- Import `reverseGeocode` from `./src/geocode.js`.
- Keep the rest of `getLocation()` unchanged — it already reads `address.state`
  / `address.district` etc., which the module's normalized `address` provides.

### `gubed/gubed.js` + `gubed/index.html`

- Import `reverseGeocode` from `../src/geocode.js`.
- Adapt the existing geocode section:
  - "Provider" row → `'photon' | 'nominatim'`.
  - "Nama paparan" row → module's `displayName`.
  - Raw JSON → module's `raw`.
  - Keep URL row using the provider's request URL (return the URL from the
    module, e.g. add a `url` field on the result).
- Update section title in `gubed/index.html` from "Reverse Geocode (Nominatim)"
  to "Reverse Geocode (Photon + Nominatim)".

### Result shape

The module result carries `url` (the request URL that succeeded) so `gubed` can
display it, alongside `displayName`, `provider`, and `raw`.

## Files changed

- `src/geocode.js` — new module.
- `main.js` — use shared module.
- `gubed/gubed.js` — use shared module, show provider.
- `gubed/index.html` — section title.
- `README.md` — update feature/tech-stack/how-it-works mentions of Nominatim.
- `.github/AGENTS.md` — update the pipeline description on line 37.

## Error handling

- Any failure in the primary Photon call (HTTP error, network error, no features,
  missing state) falls back to Nominatim.
- If both fail, `null` is returned. `main.js` currently does not guard against a
  null `address` from `reverseGeocode` beyond the existing call site behavior —
  the design keeps behavior equivalent to today (a failed geocode currently
  produces a `null`/error and the fallback emergency numbers flow). No new UI
  behavior introduced.

## Testing / verification

No automated test framework exists (package.json has only `dev`, `build`,
`preview`). Verification is manual via `npm run dev`:

1. Open `index.html` — location resolves and emergency numbers render.
2. Open `/gubed/` — geocode section shows provider, display name, URL, raw JSON.
3. Simulate Photon failure (block `photon.komoot.io` in devtools) — confirm
   fallback to Nominatim fires and app still resolves.
4. `npm run build` succeeds.
