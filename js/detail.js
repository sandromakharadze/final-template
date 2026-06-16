// detail.js — entry point for detail.html

// ── DOM refs ──────────────────────────────────────────────
const stateError    = document.getElementById('state-error');
const detailContent = document.getElementById('detail-content');
const detailArt     = document.getElementById('detail-art');
const detailGenre   = document.getElementById('detail-genre');
const detailTitle   = document.getElementById('detail-title');
const detailArtist  = document.getElementById('detail-artist');
const detailAlbum   = document.getElementById('detail-album');
const detailMeta    = document.getElementById('detail-meta');
const saveBtn       = document.getElementById('save-btn');
const itunesLink    = document.getElementById('itunes-link');
const feedback      = document.getElementById('detail-feedback');
const menuBtn       = document.querySelector('.nav__menu-btn');
const mobileNav     = document.getElementById('nav-links-mobile');


// ── localStorage helpers ──────────────────────────────────
function loadCrate() {
  try {
    return JSON.parse(localStorage.getItem('tunecrate')) ?? [];
  } catch {
    return [];
  }
}

function saveCrate(crate) {
  localStorage.setItem('tunecrate', JSON.stringify(crate));
}

function isInCrate(id) {
  return loadCrate().some(item => item.id === id);
}

function addToCrate(item) {
  const crate = loadCrate();
  if (isInCrate(item.id)) return;
  crate.push(item);
  saveCrate(crate);
}

function removeFromCrate(id) {
  saveCrate(loadCrate().filter(item => item.id !== id));
}


// ── Helpers ───────────────────────────────────────────────
function getArtworkUrl(item) {
  return (item.artworkUrl100 ?? '').replace('100x100', '600x600');
}

function formatDuration(ms) {
  if (!ms) return null;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).getFullYear();
}

// Build a <dt>/<dd> pair and append to the <dl>
function addMetaRow(label, value) {
  if (!value) return;
  const dt = document.createElement('dt');
  dt.className   = 'detail__meta-label';
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.className   = 'detail__meta-value';
  dd.textContent = value;
  detailMeta.append(dt, dd);
}


// ── Render detail ─────────────────────────────────────────
function renderDetail(item) {
  const artUrl  = getArtworkUrl(item);
  const title   = item.trackName ?? item.collectionName ?? item.artistName ?? 'Unknown';
  const artist  = item.artistName ?? '';
  const album   = item.collectionName && item.trackName ? item.collectionName : null;

  // Art
  detailArt.src = artUrl;
  detailArt.alt = `${title} artwork`;

  // Text
  detailGenre.textContent  = item.primaryGenreName ?? '';
  detailTitle.textContent  = title;
  detailArtist.textContent = artist;
  detailAlbum.textContent  = album ?? '';

  // Meta rows — built dynamically
  detailMeta.innerHTML = '';
  addMetaRow('Track number', item.trackNumber ? `${item.trackNumber} of ${item.trackCount}` : null);
  addMetaRow('Duration',     formatDuration(item.trackTimeMillis));
  addMetaRow('Released',     formatDate(item.releaseDate));
  addMetaRow('Country',      item.country);
  addMetaRow('Label',        item.artistName);

  // iTunes link
  itunesLink.href = item.trackViewUrl ?? item.collectionViewUrl ?? item.artistViewUrl ?? '#';

  // Save button state
  updateSaveBtn(item);

  // Show content
  detailContent.removeAttribute('hidden');
}


// ── Save button ───────────────────────────────────────────
function updateSaveBtn(item) {
  const saved = isInCrate(item.id);
  saveBtn.textContent = saved ? '✓ Saved to Crate' : '+ Add to Crate';
  saveBtn.classList.toggle('btn--primary', !saved);
  saveBtn.classList.toggle('btn--outline', saved);
}

function showFeedback(msg) {
  feedback.textContent = msg;
  setTimeout(() => { feedback.textContent = ''; }, 2500);
}


// ── Error state ───────────────────────────────────────────
function showError(msg) {
  document.getElementById('error-message').textContent = msg;
  stateError.removeAttribute('hidden');
  detailContent.setAttribute('hidden', '');
}


// ── Init ──────────────────────────────────────────────────
function init() {
  let item;
  try {
    item = JSON.parse(localStorage.getItem('tunecrate-preview'));
  } catch {
    item = null;
  }

  if (!item) {
    showError('No track data found. Go back and click a result.');
    return;
  }

  // Confirm the URL id matches what's in storage (basic guard)
  const params     = new URLSearchParams(window.location.search);
  const urlId      = Number(params.get('id'));
  const storedId   = item.id;

  if (urlId && storedId && urlId !== storedId) {
    showError('Track data mismatch. Please go back and try again.');
    return;
  }

  renderDetail(item);

  // Save / unsave toggle — closes over item
  saveBtn.addEventListener('click', () => {
    if (isInCrate(item.id)) {
      removeFromCrate(item.id);
      showFeedback('Removed from crate.');
    } else {
      addToCrate(item);
      showFeedback('Added to crate!');
    }
    updateSaveBtn(item);
  });
}

init();


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
