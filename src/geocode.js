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
