const EMERGENCY_CONTACTS = [
  { name: 'Polis (Police)', number: '999', description: 'Police Emergency' },
  { name: 'Bomba (Fire & Rescue)', number: '994', description: 'Fire & Rescue' },
  { name: 'Ambulans (Ambulance)', number: '999', description: 'Medical Emergency' },
  { name: 'Jabatan Pertahanan Awam', number: '991', description: 'Civil Defence' },
  { name: 'APM (Mercy Malaysia)', number: '03-8911 1111', description: 'Disaster Relief' },
  { name: 'Bantuan Rela', number: '03-8064 2400', description: 'Volunteer Corps' },
  { name: 'TELEBOM', number: '1-800-88-8888', description: 'Mental Health Crisis' }
];

const statusText = document.getElementById('status-text');
const spinner = document.getElementById('spinner');
const locationInfo = document.getElementById('location-info');
const locationName = document.getElementById('location-name');
const emergencyContacts = document.getElementById('emergency-contacts');
const contactsList = document.getElementById('contacts-list');

function showLocationStatus(message, isError = false) {
  spinner.style.display = isError ? 'none' : 'block';
  statusText.textContent = message;
  if (isError) {
    statusText.classList.add('error');
    statusText.innerHTML += '<br><button class="retry-btn" onclick="getLocation()">Try Again</button>';
  }
}

function renderContacts(contacts) {
  contactsList.innerHTML = '';
  contacts.forEach(contact => {
    const card = document.createElement('div');
    card.className = 'contact-card';
    card.innerHTML = `
      <div class="contact-info">
        <h3>${contact.name}</h3>
        <p>${contact.description}</p>
      </div>
      <div class="contact-number">
        <a href="tel:${contact.number}" class="call-btn">${contact.number}</a>
      </div>
    `;
    contactsList.appendChild(card);
  });
}

async function reverseGeocode(lat, lon) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`
    );
    const data = await response.json();
    return data.address;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

async function getLocation() {
  if (!navigator.geolocation) {
    showLocationStatus('Geolocation is not supported by your browser', true);
    return;
  }

  showLocationStatus('Getting your location...');

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      
      showLocationStatus('Finding emergency numbers for your area...');
      
      const address = await reverseGeocode(latitude, longitude);
      
      const locationText = address 
        ? `${address.city || address.town || address.village || address.county || 'Unknown'}, ${address.state || 'Malaysia'}`
        : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      
      locationName.textContent = `📍 ${locationText}`;
      locationInfo.classList.remove('hidden');
      
      renderContacts(EMERGENCY_CONTACTS);
      
      spinner.style.display = 'none';
      statusText.textContent = '';
      emergencyContacts.classList.remove('hidden');
    },
    (error) => {
      let message = 'Unable to get your location';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = 'Location access denied. Please enable location permissions.';
          break;
        case error.POSITION_UNAVAILABLE:
          message = 'Location information is unavailable.';
          break;
        case error.TIMEOUT:
          message = 'Location request timed out.';
          break;
      }
      showLocationStatus(message, true);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    }
  );
}

window.getLocation = getLocation;

getLocation();
