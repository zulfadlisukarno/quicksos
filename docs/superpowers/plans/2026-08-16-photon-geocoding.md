# Photon Geocoding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch reverse geocoding from Nominatim-only to Photon-primary with Nominatim fallback, exposed through a shared `src/geocode.js` module.

**Architecture:** A single `src/geocode.js` module exports `reverseGeocode(lat, lon)` returning a normalized `{ address, displayName, provider, url, raw }` result or `null`. It tries Photon first, falls back to Nominatim on HTTP error, empty features, or missing `state`. `main.js` and the `gubed` debug page both consume the module; `gubed` additionally shows which provider was used and the raw payload.

**Tech Stack:** Vanilla ES modules, Vite (`npm run dev` / `npm run build`). No test framework — verification is manual via the dev server (see Global Constraints).

## Global Constraints

- No automated test framework exists; verify manually through `npm run dev` at `http://localhost:5173`.
- Photon URL: `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}` — must NOT send a `lang` param (`lang=ms` is rejected with HTTP 400).
- Nominatim fallback URL: `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&accept-language=ms` (unchanged).
- Fallback triggers: Photon HTTP error, network error, `features[0].properties` missing, or `properties.state` missing (covers KL returning `city` but no `state`).
- Result shape from `reverseGeocode`:
  ```js
  {
    address: { state, district, city, town, county, suburb, village, country, ... },
    displayName: string,       // e.g. "Kota Bharu, Kelantan"
    provider: 'photon' | 'nominatim',
    url: string,               // request URL that succeeded
    raw: object                // raw provider response
  }
  ```
  Returns `null` only if both providers fail.
- Downstream consumers must still receive the same address shape `getEmergencyContacts()` expects (`address.state`, `address.district`, etc.).
- UI text stays in Malay (ms).

---

### Task 1: Create the `src/geocode.js` module

**Files:**
- Create: `src/geocode.js`

**Interfaces:**
- Consumes: nothing internal (only browser `fetch`).
- Produces: `reverseGeocode(lat, lon) -> Promise<Result | null>` as defined in Global Constraints.

- [ ] **Step 1: Write the module**

Create `src/geocode.js`:

```js
const PHOTON_URL = (lat, lon) =>
  `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`;

const NOMINATIM_URL = (lat, lon) =>
  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&accept-language=ms`;

function buildDisplayName(props) {
  const place = props.city || props.town || props.name || props.district || props.county || '';
  const state = props.state || '';
  return place && state ? `${place}, ${state}` : place || state || '';
}

function pickAddressFields(props) {
  const address = {};
  for (const field of ['state', 'district', 'city', 'town', 'county', 'suburb', 'village', 'country']) {
    if (props[field]) address[field] = props[field];
  }
  return address;
}

async function reverseGeocodePhoton(lat, lon) {
  try {
    const url = PHOTON_URL(lat, lon);
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const props = data.features && data.features[0] && data.features[0].properties;
    if (!props || !props.state) return null;
    return {
      address: pickAddressFields(props),
      displayName: buildDisplayName(props),
      provider: 'photon',
      url,
      raw: data,
    };
  } catch (error) {
    console.error('Photon geocoding error:', error);
    return null;
  }
}

async function reverseGeocodeNominatim(lat, lon) {
  try {
    const url = NOMINATIM_URL(lat, lon);
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const address = data.address || {};
    return {
      address,
      displayName: data.display_name || '',
      provider: 'nominatim',
      url,
      raw: data,
    };
  } catch (error) {
    console.error('Nominatim geocoding error:', error);
    return null;
  }
}

export async function reverseGeocode(lat, lon) {
  const photonResult = await reverseGeocodePhoton(lat, lon);
  if (photonResult) return photonResult;
  return reverseGeocodeNominatim(lat, lon);
}
```

- [ ] **Step 2: Verify the module loads**

Run: `npm run dev` (or `npx vite`) and confirm the server starts without errors. Then in the browser console at `http://localhost:5173`:

```js
import('./src/geocode.js').then(m => m.reverseGeocode(3.139, 101.6869)).then(r => console.log(r))
```

Expected: `provider: 'nominatim'` and `address.state === 'Kuala Lumpur'` (Photon returns no state for KL, so fallback fires). Repeat with `reverseGeocode(6.1244, 102.2392)` — expected `provider: 'photon'` and `address.state === 'Kelantan'`.

- [ ] **Step 3: Commit**

```bash
git add src/geocode.js
git commit -m "feat: add shared reverse geocode module with Photon + Nominatim fallback"
```

---

### Task 2: Wire `main.js` to the shared module

**Files:**
- Modify: `main.js:1` (import), `main.js:111-122` (remove inline `reverseGeocode`), `main.js:138-147` (use module result)

**Interfaces:**
- Consumes: `reverseGeocode` from `./src/geocode.js` (Task 1) returning `{ address, ... }` or `null`.
- Produces: `main.js` keeps its existing behavior — reads `address.state` / `address.district` and calls `getEmergencyContacts(address)`.

- [ ] **Step 1: Add the import**

Replace the import at `main.js:1`:

```js
import { getEmergencyContacts } from './src/data-loader.js';
```

with:

```js
import { getEmergencyContacts } from './src/data-loader.js';
import { reverseGeocode } from './src/geocode.js';
```

- [ ] **Step 2: Remove the inline `reverseGeocode` function**

Delete the whole function at `main.js:111-122`:

```js
async function reverseGeocode(lat, lon) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&accept-language=ms`
    );
    const data = await response.json();
    return data.address;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}
```

- [ ] **Step 3: Use the module result in `getLocation`**

Replace the block at `main.js:138-147` (currently):

```js
      const address = await reverseGeocode(latitude, longitude);
      
      console.log('Address:', address);
      
      const district = address.district || address.city || address.town || address.village || address.county || address.suburb || address.neighbourhood || '';
      const state = address.state || '';
```

with:

```js
      const geoResult = await reverseGeocode(latitude, longitude);
      const address = geoResult ? geoResult.address : null;
      
      console.log('Address:', address);
      
      const district = address ? (address.district || address.city || address.town || address.village || address.county || address.suburb || address.neighbourhood || '') : '';
      const state = address ? (address.state || '') : '';
```

The remaining lines (`locationText`, `getEmergencyContacts(address)`, `renderFacilities`) are unchanged — `getEmergencyContacts(null)` already returns the national fallback.

- [ ] **Step 4: Verify end-to-end**

With `npm run dev` running, open `http://localhost:5173` (allow location permission). Expected:
- Location label shows `📍 <district>, <state>`.
- District-level emergency contacts render (or state/national fallback if your area isn't in the data).
- Browser console shows `Address: {...}` with a populated `state` field, no errors.

- [ ] **Step 5: Commit**

```bash
git add main.js
git commit -m "feat: use shared geocode module in main app"
```

---

### Task 3: Wire `gubed` debug page to the shared module

**Files:**
- Modify: `gubed/gubed.js:1-6` (import), `gubed/gubed.js:64-70` (remove inline `reverseGeocode`), `gubed/gubed.js:219-259` (`runGeocode`), `gubed/index.html:29` (section title)

**Interfaces:**
- Consumes: `reverseGeocode` from `../src/geocode.js` (Task 1) returning `{ address, displayName, provider, url, raw }` or `null`.
- Produces: unchanged `runLookupData(address, timings, t0)` — still called with the normalized `address`.

- [ ] **Step 1: Add the import**

Replace the import block at `gubed/gubed.js:1-6`:

```js
import {
  loadStateData,
  normalizeStateName,
  normalizeDistrictName,
  getEmergencyContacts,
} from '../src/data-loader.js';
```

with:

```js
import {
  loadStateData,
  normalizeStateName,
  normalizeDistrictName,
  getEmergencyContacts,
} from '../src/data-loader.js';
import { reverseGeocode } from '../src/geocode.js';
```

- [ ] **Step 2: Remove the inline `reverseGeocode` function**

Delete the whole function at `gubed/gubed.js:64-70`:

```js
async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&accept-language=ms`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return { url, data };
}
```

- [ ] **Step 3: Rewrite `runGeocode`**

Replace the whole `runGeocode` function at `gubed/gubed.js:219-259`:

```js
async function runGeocode(position, timings, t0) {
  const { latitude, longitude } = position.coords;
  const t1 = performance.now();

  let geocodeResult = null;
  try {
    geocodeResult = await reverseGeocode(latitude, longitude);
    timings.reverseGeocode = Math.round(performance.now() - t1);
  } catch (err) {
    render('geocode', {
      status: 'error',
      message: String(err && err.message || err),
      rows: [['Masa (ms)', timings.reverseGeocode]],
    });
    renderTimings(timings);
    return;
  }

  if (!geocodeResult) {
    render('geocode', {
      status: 'error',
      message: 'Geocoding gagal — kedua-dua Photon dan Nominatim tidak dapat dipanggil',
      rows: [['Masa (ms)', timings.reverseGeocode]],
    });
    renderTimings(timings);
    return;
  }

  const address = geocodeResult.address;
  const stateRaw = address.state || '';
  const distRaw = address.district || address.city || address.town || address.village || address.county || address.suburb || address.neighbourhood || '';

  render('geocode', {
    rows: [
      ['Status', 'Berjaya'],
      ['Provider', geocodeResult.provider],
      ['URL', geocodeResult.url],
      ['Masa (ms)', timings.reverseGeocode],
      ['Lat/Lon (dipulangkan)', `${latitude}, ${longitude}`],
      ['Nama paparan', geocodeResult.displayName || '—'],
      ['Negeri mentah', stateRaw || '—'],
      ['Daerah mentah', distRaw || '—'],
      ['Negeri dinormalkan', normalizeStateName(stateRaw) || '—'],
    ],
    raw: { url: geocodeResult.url, provider: geocodeResult.provider, ...geocodeResult.raw },
  });

  await runLookupData(address, timings, t0);
}
```

- [ ] **Step 4: Update the section title in `gubed/index.html`**

Change `gubed/index.html:29`:

```html
        <h2>Reverse Geocode (Nominatim)</h2>
```

to:

```html
        <h2>Reverse Geocode (Photon + Nominatim)</h2>
```

- [ ] **Step 5: Verify the debug page**

With `npm run dev` running, open `http://localhost:5173/gubed/` (allow location permission). Expected:
- "Reverse Geocode" section shows a **Provider** row (`photon` or `nominatim`), the request URL, display name, raw state/district, normalized state, and the raw JSON details block.
- The debug page reports a successful geocode and continues to the "Carian Data" section.

- [ ] **Step 6: Commit**

```bash
git add gubed/gubed.js gubed/index.html
git commit -m "feat: use shared geocode module in gubed debug page with provider info"
```

---

### Task 4: Update documentation

**Files:**
- Modify: `README.md:7`, `README.md:104`, `README.md:158`
- Modify: `.github/AGENTS.md:9`, `.github/AGENTS.md:37`, `.github/AGENTS.md:44`

- [ ] **Step 1: Update `README.md` feature bullet**

Change `README.md:7`:

```markdown
- **Auto-detect location** — Uses browser geolocation + OpenStreetMap Nominatim to find your district
```

to:

```markdown
- **Auto-detect location** — Uses browser geolocation + Photon (OpenStreetMap) reverse geocoding with Nominatim fallback to find your district
```

- [ ] **Step 2: Update `README.md` tech stack**

Change `README.md:104`:

```markdown
- OpenStreetMap Nominatim (free geocoding)
```

to:

```markdown
- Photon (free geocoding) with Nominatim fallback
```

- [ ] **Step 3: Update `README.md` "How It Works"**

Change `README.md:158`:

```markdown
2. **Reverse geocode** → Nominatim returns state + district
```

to:

```markdown
2. **Reverse geocode** → Photon returns state + district (Nominatim as fallback)
```

- [ ] **Step 4: Update `.github/AGENTS.md`**

Three edits:

`AGENTS.md:9` — `- OpenStreetMap Nominatim for reverse geocoding` → `- Photon for reverse geocoding (Nominatim fallback)`

`AGENTS.md:37` — `- main.js handles browser geolocation → Nominatim reverse geocode → src/data-loader.js lookup` → `- main.js handles browser geolocation → Photon reverse geocode (Nominatim fallback) → src/data-loader.js lookup`

`AGENTS.md:44` — `if the state has unusual naming in Nominatim` → `if the state has unusual naming in the geocoding response`

- [ ] **Step 5: Verify no stale references**

Run:

```bash
rg -n "Nominatim|nominatim" README.md .github/AGENTS.md
```

Expected remaining matches are only the intentional fallback mentions (README lines 7/104/158 and AGENTS lines 9/37). No old "uses Nominatim" phrasing should remain.

- [ ] **Step 6: Commit**

```bash
git add README.md .github/AGENTS.md
git commit -m "docs: document Photon geocoding with Nominatim fallback"
```

---

### Task 5: Final verification and build

**Files:** none (verification only)

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: build succeeds with no errors, `dist/` produced.

- [ ] **Step 2: Full manual regression**

With `npm run dev` running:
1. Open `http://localhost:5173` — location resolves, emergency contacts render.
2. Open `http://localhost:5173/gubed/` — Provider row shows `photon` or `nominatim`, raw JSON present.
3. Simulate Photon failure: open devtools → Network → offline, or block `photon.komoot.io` via a request-blocking rule. Reload the app. Expected: geocode still resolves via Nominatim (app keeps working); on gubed, Provider shows `nominatim`.
4. If both are blocked, the app should degrade to national fallback numbers (no crash).

- [ ] **Step 3: Confirm clean git status**

Run: `git status --short`
Expected: no uncommitted changes (all four tasks committed).
