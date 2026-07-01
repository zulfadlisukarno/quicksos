let nationalData = null;
const stateCache = {};

export async function loadNationalData() {
  if (nationalData) return nationalData;
  const response = await fetch('/src/data/national.json');
  nationalData = await response.json();
  return nationalData;
}

export async function loadStateData(stateSlug) {
  if (stateCache[stateSlug]) return stateCache[stateSlug];
  try {
    const response = await fetch(`/src/data/states/${stateSlug}.json`);
    if (!response.ok) return null;
    stateCache[stateSlug] = await response.json();
    return stateCache[stateSlug];
  } catch {
    return null;
  }
}

export function findDistrict(stateData, districtName) {
  if (!stateData || !districtName) return null;
  const normalized = normalizeDistrictName(districtName);
  return stateData.districts.find(d => {
    if (d.district === normalized) return true;
    if (d.aliases && d.aliases.some(a => normalizeDistrictName(a) === normalized)) return true;
    if (d.district_name.toLowerCase() === districtName.toLowerCase()) return true;
    return false;
  });
}

export function normalizeStateName(addressState) {
  if (!addressState) return null;
  const stateMap = {
    'kelantan': 'kelantan',
    'kota bharu': 'kelantan',
    'kuala lumpur': 'kuala-lumpur',
    'wilayah persekutuan kuala lumpur': 'kuala-lumpur',
    'wp kuala lumpur': 'kuala-lumpur',
    'selangor': 'selangor',
    'putrajaya': 'putrajaya',
    'wilayah persekutuan putrajaya': 'putrajaya',
    'labuan': 'labuan',
    'wilayah persekutuan labuan': 'labuan',
    'kedah': 'kedah',
    'johor': 'johor',
    'terengganu': 'terengganu',
    'pahang': 'pahang',
    'pinang': 'penang',
    'pulau pinang': 'penang',
    'perak': 'perak',
    'negeri sembilan': 'negeri-sembilan',
    'n. sembilan': 'negeri-sembilan',
    'melaka': 'melaka',
    'malacca': 'melaka',
    'sabah': 'sabah',
    'sarawak': 'sarawak',
    'perlis': 'perlis'
  };
  const normalized = addressState.toLowerCase().trim();
  return stateMap[normalized] || normalized.replace(/\s+/g, '-');
}

export function normalizeDistrictName(districtName) {
  if (!districtName) return '';
  return districtName.toLowerCase().trim().replace(/\s+/g, '-');
}

export async function getEmergencyContacts(address) {
  const national = await loadNationalData();
  
  if (!address) {
    return {
      level: 'national',
      state: null,
      district: null,
      facilities: null,
      contacts: national.contacts
    };
  }
  
  const stateSlug = normalizeStateName(address.state);
  const stateData = await loadStateData(stateSlug);
  
  if (!stateData) {
    return {
      level: 'national',
      state: address.state,
      district: null,
      facilities: null,
      contacts: national.contacts
    };
  }
  
  const district = findDistrict(stateData, address.district || address.city || address.town || address.village);
  
  if (district) {
    return {
      level: 'district',
      state: stateData.state_name,
      district: district.district_name,
      facilities: district.facilities,
      stateFacilities: stateData.state_facilities,
      contacts: national.contacts
    };
  }
  
  return {
    level: 'state',
    state: stateData.state_name,
    district: null,
    facilities: null,
    stateFacilities: stateData.state_facilities,
    contacts: national.contacts
  };
}
