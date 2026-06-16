// ── DOM refs ──────────────────────────────────────────────
const form        = document.getElementById('profile-form');
const usernameInput = document.getElementById('username');
const emailInput  = document.getElementById('email');
const genreSelect = document.getElementById('genre');
const explicitBox = document.getElementById('explicit');
const bioTextarea = document.getElementById('bio');
const bioCount    = document.getElementById('bio-count');
const resetBtn    = document.getElementById('reset-btn');
const banner      = document.getElementById('profile-banner');
const bannerMsg   = document.getElementById('profile-banner-msg');

const usernameError = document.getElementById('username-error');
const emailError    = document.getElementById('email-error');

const menuBtn   = document.querySelector('.nav__menu-btn');
const mobileNav = document.getElementById('nav-links-mobile');


// ── localStorage helpers ──────────────────────────────────
const PROFILE_KEY = 'tunecrate-profile';

function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) ?? {};
  } catch {
    return {};
  }
}

function saveProfile(data) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
}


// ── Validation helpers ────────────────────────────────────
function showFieldError(el, msg) {
  el.textContent = msg;
  el.removeAttribute('hidden');
}

function clearFieldError(el) {
  el.setAttribute('hidden', '');
  el.textContent = '';
}

function validateUsername() {
  const val = usernameInput.value.trim();
  if (!val) {
    showFieldError(usernameError, 'Display name is required.');
    return false;
  }
  if (val.length < 2) {
    showFieldError(usernameError, 'Must be at least 2 characters.');
    return false;
  }
  clearFieldError(usernameError);
  return true;
}

function validateEmail() {
  const val = emailInput.value.trim();
  if (!val) {
    showFieldError(emailError, 'Email is required.');
    return false;
  }
  // Simple email pattern check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
    showFieldError(emailError, 'Enter a valid email address.');
    return false;
  }
  clearFieldError(emailError);
  return true;
}


// ── Bio character counter ─────────────────────────────────
bioTextarea.addEventListener('input', () => {
  bioCount.textContent = `${bioTextarea.value.length} / 200`;
});


// ── Populate form from saved profile ─────────────────────
function populateForm(profile) {
  if (profile.username)   usernameInput.value  = profile.username;
  if (profile.email)      emailInput.value     = profile.email;
  if (profile.genre)      genreSelect.value    = profile.genre;
  if (profile.explicit !== undefined) explicitBox.checked = profile.explicit;
  if (profile.bio)        bioTextarea.value    = profile.bio;
  if (profile.bio)        bioCount.textContent = `${profile.bio.length} / 200`;

  if (profile.searchType) {
    const radio = form.querySelector(`input[name="search-type"][value="${profile.searchType}"]`);
    if (radio) radio.checked = true;
  }
}


// ── Show / hide banner ────────────────────────────────────
let bannerTimer;

function showBanner(msg) {
  bannerMsg.textContent = msg;
  banner.removeAttribute('hidden');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => banner.setAttribute('hidden', ''), 3500);
}


// ── Form submit ───────────────────────────────────────────
function handleSubmit(e) {
  e.preventDefault();

  const validName  = validateUsername();
  const validEmail = validateEmail();

  if (!validName || !validEmail) {
    // Focus the first invalid field
    if (!validName)  usernameInput.focus();
    else             emailInput.focus();
    return;
  }

  const searchType = form.querySelector('input[name="search-type"]:checked')?.value ?? 'musicTrack';

  const profile = {
    username:   usernameInput.value.trim(),
    email:      emailInput.value.trim(),
    genre:      genreSelect.value,
    searchType,
    explicit:   explicitBox.checked,
    bio:        bioTextarea.value.trim(),
  };

  saveProfile(profile);
  showBanner(`Profile saved — welcome, ${profile.username}!`);
}

form.addEventListener('submit', handleSubmit);


// ── Inline validation on blur ─────────────────────────────
usernameInput.addEventListener('blur', validateUsername);
emailInput.addEventListener('blur', validateEmail);

// Clear error as soon as user starts correcting
usernameInput.addEventListener('input', () => clearFieldError(usernameError));
emailInput.addEventListener('input',    () => clearFieldError(emailError));


// ── Reset button ──────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  form.reset();
  bioCount.textContent = '0 / 200';
  clearFieldError(usernameError);
  clearFieldError(emailError);
  banner.setAttribute('hidden', '');
});


// ── Mobile nav ────────────────────────────────────────────
menuBtn.addEventListener('click', () => {
  const isOpen = !mobileNav.hasAttribute('hidden');
  if (isOpen) {
    mobileNav.setAttribute('hidden', '');
    menuBtn.setAttribute('aria-expanded', 'false');
  } else {
    mobileNav.removeAttribute('hidden');
    menuBtn.setAttribute('aria-expanded', 'true');
  }
});

document.addEventListener('click', e => {
  if (!mobileNav.hasAttribute('hidden') &&
      !mobileNav.contains(e.target) &&
      !menuBtn.contains(e.target)) {
    mobileNav.setAttribute('hidden', '');
    menuBtn.setAttribute('aria-expanded', 'false');
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !mobileNav.hasAttribute('hidden')) {
    mobileNav.setAttribute('hidden', '');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.focus();
  }
});


// ── Init ──────────────────────────────────────────────────
populateForm(loadProfile());