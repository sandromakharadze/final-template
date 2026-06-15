import { debounce } from './api.js';

// ── DOM refs ──────────────────────────────────────────────
const cardsGrid    = document.getElementById('cards-grid');
const stateEmpty   = document.getElementById('state-empty');
const resultsMeta  = document.getElementById('results-meta');
const resultsCount = document.getElementById('results-count');
const crateCount   = document.getElementById('crate-count');
const clearBtn     = document.getElementById('clear-crate-btn');
const sortSelect   = document.getElementById('sort-select');
const menuBtn      = document.querySelector('.nav__menu-btn');
const mobileNav    = document.getElementById('nav-links-mobile');


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

function removeFromCrate(id) {
  const crate = loadCrate().filter(item => item.id !== id);
  saveCrate(crate);
  return crate;
}


// ── Sorting ───────────────────────────────────────────────
function sortCrate(crate, method) {
  const copy = [...crate];
  if (method === 'oldest')  return copy;
  if (method === 'newest')  return copy.reverse();
  if (method === 'artist')  return copy.sort((a, b) => (a.artistName ?? '').localeCompare(b.artistName ?? ''));
  if (method === 'title')   return copy.sort((a, b) => {
    const ta = a.trackName ?? a.collectionName ?? a.artistName ?? '';
    const tb = b.trackName ?? b.collectionName ?? b.artistName ?? '';
    return ta.localeCompare(tb);
  });
  return copy;
}


// ── Card building ─────────────────────────────────────────
function buildCrateCard(item, onRemove) {
  const artUrl = (item.artworkUrl100 ?? '').replace('100x100', '600x600');
  const title  = item.trackName ?? item.collectionName ?? item.artistName ?? 'Unknown';
  const artist = item.artistName ?? '';
  const badge  = { track: 'Track', collection: 'Album', artist: 'Artist' }[item.wrapperType] ?? item.wrapperType;

  const card = document.createElement('article');
  card.className = 'card';
  card.setAttribute('role', 'listitem');
  card.setAttribute('aria-label', `${title} by ${artist}`);

  const artWrap = document.createElement('div');
  artWrap.className = 'card__art-wrap';

  if (artUrl) {
    const img     = document.createElement('img');
    img.className = 'card__art';
    img.src       = artUrl;
    img.alt       = `${title} artwork`;
    img.width     = 300;
    img.height    = 300;
    img.loading   = 'lazy';
    artWrap.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className   = 'card__art-placeholder';
    placeholder.textContent = '♪';
    artWrap.appendChild(placeholder);
  }

  // Remove button — closes over this card's item and the onRemove callback
  const removeBtn = document.createElement('button');
  removeBtn.className   = 'card__save-btn card__save-btn--saved';
  removeBtn.textContent = '♥';
  removeBtn.setAttribute('aria-label',   'Remove from crate');
  removeBtn.setAttribute('aria-pressed', 'true');

  removeBtn.addEventListener('click', e => {
    e.stopPropagation();
    onRemove(item.id);
    card.remove();
  });

  artWrap.appendChild(removeBtn);

  const body = document.createElement('div');
  body.className = 'card__body';

  const titleEl = document.createElement('p');
  titleEl.className   = 'card__title';
  titleEl.textContent = title;

  const artistEl = document.createElement('p');
  artistEl.className   = 'card__artist';
  artistEl.textContent = artist;

  const badgeEl = document.createElement('span');
  badgeEl.className   = 'card__type-badge';
  badgeEl.textContent = badge;

  body.append(titleEl, artistEl, badgeEl);
  card.append(artWrap, body);

  return card;
}


// ── Render ────────────────────────────────────────────────
function updateCountDisplay(crate) {
  const n = crate.length;
  crateCount.textContent  = `${n} item${n !== 1 ? 's' : ''} saved`;
  resultsCount.textContent = `${n} item${n !== 1 ? 's' : ''}`;
}

function handleRemove(id) {
  const updated = removeFromCrate(id);
  updateCountDisplay(updated);

  if (updated.length === 0) {
    stateEmpty.removeAttribute('hidden');
    resultsMeta.setAttribute('hidden', '');
    cardsGrid.innerHTML = '';
  }
}

function renderCrate() {
  const raw    = loadCrate();
  const sorted = sortCrate(raw, sortSelect.value);

  cardsGrid.innerHTML = '';
  updateCountDisplay(raw);

  if (sorted.length === 0) {
    stateEmpty.removeAttribute('hidden');
    resultsMeta.setAttribute('hidden', '');
    return;
  }

  stateEmpty.setAttribute('hidden', '');
  resultsMeta.removeAttribute('hidden');

  const fragment = document.createDocumentFragment();
  // Each card's remove handler closes over that item via buildCrateCard
  sorted.forEach(item => fragment.appendChild(buildCrateCard(item, handleRemove)));
  cardsGrid.appendChild(fragment);
}


// ── Events ────────────────────────────────────────────────
sortSelect.addEventListener('change', renderCrate);

clearBtn.addEventListener('click', () => {
  if (!confirm('Remove everything from your crate?')) return;
  saveCrate([]);
  renderCrate();
});

// Mobile nav toggle
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
renderCrate();