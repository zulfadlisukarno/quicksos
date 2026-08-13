import {
  loadStateData,
  normalizeStateName,
  normalizeDistrictName,
  getEmergencyContacts,
} from '../src/data-loader.js';

const DATA_BASE = '../data/';

const sections = {
  env: document.getElementById('env-section'),
  geo: document.getElementById('geo-section'),
  geocode: document.getElementById('geocode-section'),
  lookup: document.getElementById('lookup-section'),
  timings: document.getElementById('timings-section'),
};

const retryBtn = document.getElementById('retry-btn');

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

function render(secId, { rows = [], raw = null, status = 'ok', message = null } = {}) {
  const body = sections[secId].querySelector('.debug-body');
  let html = '';

  if (message) {
    html += `<p class="debug-status ${status}">${escapeHtml(message)}</p>`;
  }

  if (rows.length) {
    html += '<table class="debug-table">';
    for (const [k, v] of rows) {
      html += `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v == null ? '—' : v)}</td></tr>`;
    }
    html += '</table>';
  }

  if (raw !== null && raw !== undefined) {
    html += `<details class="debug-raw"><summary>JSON mentah</summary><pre>${escapeHtml(JSON.stringify(raw, null, 2))}</pre></details>`;
  }

  body.innerHTML = html;
}

function getPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&accept-language=ms`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return { url, data };
}

function inspectDistrictMatch(stateData, districtName) {
  if (!stateData || !districtName) return null;
  const normalized = normalizeDistrictName(districtName);
  for (const d of stateData.districts) {
    if (d.district === normalized) return { district: d, method: 'district (slug)' };
    if (d.aliases && d.aliases.length) {
      const alias = d.aliases.find((a) => normalizeDistrictName(a) === normalized);
      if (alias) return { district: d, method: 'alias', matched: alias };
    }
    if (d.district_name.toLowerCase() === districtName.toLowerCase()) {
      return { district: d, method: 'district_name' };
    }
  }
  return null;
}

const timingLabels = {
  geolocation: 'Geolokasi',
  reverseGeocode: 'Reverse geocode',
  dataLookup: 'Carian data',
  total: 'Jumlah',
};

function renderTimings(timings) {
  const rows = Object.entries(timings).map(([k, v]) => [
    timingLabels[k] || k,
    `${v} ms`,
  ]);
  render('timings', { rows, raw: timings });
}

async function runLookupData(address, timings, t0) {
  const t2 = performance.now();

  const stateRaw = address.state || '';
  const distRaw = address.district || address.city || address.town || address.village || address.county || address.suburb || address.neighbourhood || '';

  const stateSlug = normalizeStateName(stateRaw);
  const stateData = await loadStateData(stateSlug, DATA_BASE);

  const rows = [
    ['Daerah mentah', distRaw || '—'],
    ['Negeri mentah', stateRaw || '—'],
    ['Slug negeri', stateSlug || '—'],
    ['Data negeri dijumpai', stateData ? 'Ya' : 'Tidak'],
  ];

  let level = 'national';
  let matchInfo = null;
  let stateName = stateData ? stateData.state_name : null;

  if (stateData) {
    matchInfo = inspectDistrictMatch(stateData, distRaw);
    if (matchInfo) {
      level = 'district';
      rows.push(['Padanan daerah', matchInfo.district.district_name]);
      rows.push(['Kaedah padanan', matchInfo.method]);
      if (matchInfo.matched) rows.push(['Alias padan', matchInfo.matched]);
    } else {
      level = 'state';
      rows.push(['Padanan daerah', 'Tiada — guna tahap negeri']);
    }
  } else {
    rows.push(['Padanan daerah', 'Tiada — guna tahap nasional']);
  }

  rows.push(['Tahap akhir', level]);

  const pipeline = {
    level,
    state: stateName,
    district: matchInfo ? matchInfo.district.district_name : null,
    facilities: matchInfo ? matchInfo.district.facilities : null,
    stateFacilities: stateData ? stateData.state_facilities : null,
  };

  const appResult = await getEmergencyContacts(address, DATA_BASE);

  timings.dataLookup = Math.round(performance.now() - t2);
  timings.total = Math.round(performance.now() - t0);
  rows.push(['Masa carian data (ms)', timings.dataLookup]);
  rows.push(['Keputusan getEmergencyContacts()', appResult.level]);

  render('lookup', { rows, raw: { pipeline, appResult } });
  renderTimings(timings);
}

async function runDebug() {
  const timings = {};
  const t0 = performance.now();

  render('env', {
    rows: [
      ['User agent', navigator.userAgent],
      ['Protokol', location.protocol],
      ['HTTPS', location.protocol === 'https:' ? 'Ya' : 'Tidak'],
      ['Geolokasi disokong', 'geolocation' in navigator ? 'Ya' : 'Tidak'],
      ['PWA (standalone)', isStandalone() ? 'Ya' : 'Tidak'],
      ['Tarikh / masa', new Date().toISOString()],
    ],
  });

  if (!('geolocation' in navigator)) {
    render('geo', { status: 'error', message: 'Geolocation tidak disokong oleh pelayar ini.' });
    renderTimings(timings);
    return;
  }

  const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 };

  try {
    const position = await getPosition(options);
    timings.geolocation = Math.round(performance.now() - t0);

    render('geo', {
      rows: [
        ['Status', 'Berjaya'],
        ['Latitude', position.coords.latitude],
        ['Longitude', position.coords.longitude],
        ['Ketepatan (m)', position.coords.accuracy],
        ['Altitud (m)', position.coords.altitude],
        ['Ketepatan altitud (m)', position.coords.altitudeAccuracy],
        ['Arah (°)', position.coords.heading],
        ['Kelajuan (m/s)', position.coords.speed],
        ['Masa (ms)', timings.geolocation],
      ],
      raw: { options, position },
    });

    await runGeocode(position, timings, t0);
  } catch (err) {
    timings.geolocation = Math.round(performance.now() - t0);
    const descriptions = {
      1: 'PERMISSION_DENIED — akses ditolak',
      2: 'POSITION_UNAVAILABLE — tiada maklumat lokasi',
      3: 'TIMEOUT — permintaan tamat masa',
    };
    render('geo', {
      status: 'error',
      message: descriptions[err.code] || String(err && err.message || err),
      rows: [['Masa (ms)', timings.geolocation]],
      raw: err,
    });
    renderTimings(timings);
  }
}

async function runGeocode(position, timings, t0) {
  const { latitude, longitude } = position.coords;
  const t1 = performance.now();

  let geocodeResult = null;
  try {
    geocodeResult = await reverseGeocode(latitude, longitude);
    timings.reverseGeocode = Math.round(performance.now() - t1);
  } catch (err) {
    timings.reverseGeocode = Math.round(performance.now() - t1);
    render('geocode', {
      status: 'error',
      message: String(err && err.message || err),
      rows: [['Masa (ms)', timings.reverseGeocode]],
    });
    renderTimings(timings);
    return;
  }

  const address = geocodeResult.data.address;
  const lat = geocodeResult.data.lat || latitude;
  const lon = geocodeResult.data.lon || longitude;
  const stateRaw = address.state || '';
  const distRaw = address.district || address.city || address.town || address.village || address.county || address.suburb || address.neighbourhood || '';

  render('geocode', {
    rows: [
      ['Status', 'Berjaya'],
      ['URL', geocodeResult.url],
      ['Masa (ms)', timings.reverseGeocode],
      ['Lat/Lon (dipulangkan)', `${lat}, ${lon}`],
      ['Nama paparan', geocodeResult.data.display_name || '—'],
      ['Negeri mentah', stateRaw || '—'],
      ['Daerah mentah', distRaw || '—'],
      ['Negeri dinormalkan', normalizeStateName(stateRaw) || '—'],
    ],
    raw: { url: geocodeResult.url, ...geocodeResult.data },
  });

  await runLookupData(address, timings, t0);
}

retryBtn.addEventListener('click', runDebug);

runDebug();
