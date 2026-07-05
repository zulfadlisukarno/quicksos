import { getEmergencyContacts } from './src/data-loader.js';

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
    statusText.innerHTML += '<br><button class="retry-btn" onclick="getLocation()">Cuba Lagi</button>';
  }
}

function renderFacilities(facilities, stateFacilities, level) {
  contactsList.innerHTML = '';
  
  const items = [];
  
  if (level === 'district' && facilities) {
    if (facilities.hospital) {
      items.push({
        icon: '🏥',
        name: facilities.hospital.name,
        number: facilities.hospital.phone,
        type: 'Hospital'
      });
    }
    if (facilities.police) {
      items.push({
        icon: '🚔',
        name: facilities.police.name,
        number: facilities.police.phone,
        type: 'Polis'
      });
    }
    if (facilities.fire) {
      items.push({
        icon: '🚒',
        name: facilities.fire.name,
        number: facilities.fire.phone,
        type: 'Bomba'
      });
    }
    if (facilities.apm) {
      items.push({
        icon: '🛡️',
        name: facilities.apm.name,
        number: facilities.apm.phone,
        type: 'APM'
      });
    }
  }
  
  if (level === 'state' && stateFacilities) {
    if (stateFacilities.police) {
      items.push({
        icon: '🚔',
        name: stateFacilities.police.name,
        number: stateFacilities.police.phone,
        type: 'Polis (Negeri)'
      });
    }
    if (stateFacilities.fire) {
      items.push({
        icon: '🚒',
        name: stateFacilities.fire.name,
        number: stateFacilities.fire.phone,
        type: 'Bomba (Negeri)'
      });
    }
    if (stateFacilities.apm) {
      items.push({
        icon: '🛡️',
        name: stateFacilities.apm.name,
        number: stateFacilities.apm.phone,
        type: 'APM (Negeri)'
      });
    }
  }
  
  if (items.length === 0) {
    items.push(
      { icon: '🚔', name: 'Polis', number: '999', type: 'Kecemasan' },
      { icon: '🚒', name: 'Bomba', number: '994', type: 'Kecemasan' },
      { icon: '🚑', name: 'Ambulans', number: '999', type: 'Kecemasan' },
      { icon: '🛡️', name: 'APM', number: '03-2687 1400', type: 'Kecemasan' }
    );
  }
  
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'contact-card';
    card.innerHTML = `
      <div class="contact-info">
        <h3>${item.icon} ${item.name}</h3>
        <p>${item.type}</p>
      </div>
      <div class="contact-number">
        <a href="tel:${item.number}" class="call-btn">${item.number}</a>
      </div>
    `;
    contactsList.appendChild(card);
  });
}

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

async function getLocation() {
  if (!navigator.geolocation) {
    showLocationStatus('Geolocation tidak disokong oleh pelayar anda', true);
    return;
  }

  showLocationStatus('Mendapatkan lokasi anda...');

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      
      showLocationStatus('Mencari nombor kecemasan untuk kawasan anda...');
      
      const address = await reverseGeocode(latitude, longitude);
      
      console.log('Address:', address);
      
      const district = address.district || address.city || address.town || address.village || address.county || address.suburb || address.neighbourhood || '';
      const state = address.state || '';
      
      const locationText = district && state 
        ? `${district}, ${state}`
        : district || state || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      
      locationName.textContent = `📍 ${locationText}`;
      locationInfo.classList.remove('hidden');
      
      const result = await getEmergencyContacts(address);
      
      renderFacilities(result.facilities, result.stateFacilities, result.level);
      
      spinner.style.display = 'none';
      statusText.textContent = '';
      emergencyContacts.classList.remove('hidden');
    },
    (error) => {
      let message = 'Tidak dapat mendapatkan lokasi anda';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = 'Akses lokasi ditolak. Sila aktifkan kebenaran lokasi.';
          break;
        case error.POSITION_UNAVAILABLE:
          message = 'Maklumat lokasi tidak tersedia.';
          break;
        case error.TIMEOUT:
          message = 'Permintaan lokasi tamat masa.';
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

// PWA Install Prompt
const installBanner = document.getElementById('install-banner');
const installBtn = document.getElementById('install-btn');
const dismissInstallBtn = document.getElementById('dismiss-install-btn');
const iosHint = document.getElementById('ios-hint');

function isRunningAsPwa() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

function isIos() {
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

function isAndroid() {
  return /android/.test(window.navigator.userAgent.toLowerCase());
}

function isMobile() {
  return isIos() || isAndroid() || /webos|blackberry|iemobile|opera mini/.test(
    window.navigator.userAgent.toLowerCase()
  );
}

function shouldShowInstallBanner() {
  if (isRunningAsPwa()) return false;
  const dismissed = localStorage.getItem('quicksos-install-dismissed');
  return dismissed !== 'true' && dismissed !== 'installed';
}

function showInstallBanner() {
  if (!installBanner || !shouldShowInstallBanner()) return;

  installBanner.classList.remove('hidden');

  if (isIos()) {
    iosHint?.classList.remove('hidden');
    installBtn?.classList.add('hidden');
  } else if (isAndroid()) {
    installBtn?.classList.remove('hidden');
    iosHint?.classList.add('hidden');
  } else {
    installBtn?.classList.remove('hidden');
    iosHint?.classList.add('hidden');
  }
}

installBtn?.addEventListener('click', async () => {
  const prompt = window.deferredInstallPrompt;
  if (prompt) {
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem('quicksos-install-dismissed', 'installed');
    }
    window.deferredInstallPrompt = null;
    installBanner?.classList.add('hidden');
  } else {
    alert('Pilihan pasang tidak tersedia. Sila gunakan menu pelayar anda untuk \"Add to Home Screen\".');
  }
});

dismissInstallBtn?.addEventListener('click', () => {
  localStorage.setItem('quicksos-install-dismissed', 'true');
  installBanner?.classList.add('hidden');
});

window.addEventListener('appinstalled', () => {
  localStorage.setItem('quicksos-install-dismissed', 'installed');
  installBanner?.classList.add('hidden');
  window.deferredInstallPrompt = null;
});

// Show banner for mobile users
if (isMobile()) {
  showInstallBanner();
}

// Tip Modal
const tipBtn = document.getElementById('tip-btn');
const tipModal = document.getElementById('tip-modal');
const closeTipBtn = document.getElementById('close-tip-btn');
const modalOverlay = tipModal?.querySelector('.modal-overlay');

function openTipModal() {
  tipModal?.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeTipModal() {
  tipModal?.classList.add('hidden');
  document.body.style.overflow = '';
}

tipBtn?.addEventListener('click', openTipModal);
closeTipBtn?.addEventListener('click', closeTipModal);
modalOverlay?.addEventListener('click', closeTipModal);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && tipModal && !tipModal.classList.contains('hidden')) {
    closeTipModal();
  }
});
