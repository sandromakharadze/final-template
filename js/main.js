// main.js — entry point for index.html

import { searchMusic, debounce } from './api.js';

// ── DOM refs ──────────────────────────────────────────────
const form         = document.getElementById('search-form');
const input        = document.getElementById('search-input');
const searchError  = document.getElementById('search-error');
const retryBtn     = document.getElementById('retry-btn');
const limitSelect  = document.getElementById('results-limit');
const chips        = document.querySelectorAll('.chip');

const stateEmpty     = document.getElementById('state-empty');
const stateLoading   = document.getElementById('state-loading');
const stateError     = document.getElementById('state-error');
const stateNoResults = document.getElementById('state-no-results');
const resultsMeta    = document.getElementById('results-meta');
const resultsTerm    = document.getElementById('results-term');
const resultsCount   = document.getElementById('results-count');
const cardsGrid      = document.getElementById('cards-grid');

const menuBtn   = document.querySelector('.nav__menu-btn');
const mobileNav = document.getElementById('nav-links-mobile');


// ── App state ─────────────────────────────────────────────
let currentQuery  = '';
let currentEntity = 'musicTrack';
let crate         = loadCrate();


// ── Session counter (closure) ─────────────────────────────
// Keeps a private running total of items added this session.
function createSessionCounter() {
  let count = 0;
  return {
    increment() { count++; },
    decrement() { count = Math.max(0, count - 1); },
    get()       { return count; },
  };
}
const sessionCounter = createSessionCounter();


// ── localStorage helpers ──────────────────────────────────
function loadCrate() {
  try {
    return JSON.parse(localStorage.getItem('tunecrate')) ?? [];
  } catch {
    return [];
  }
}

function saveCrate() {
  localStorage.setItem('tunecrate', JSON.stringify(crate));
}

function isInCrate(id) {
  return crate.some(item => item.id === id);
}

function addToCrate(item) {
  if (isInCrate(item.id)) return;
  crate.push(item);
  saveCrate();
  sessionCounter.increment();
}

function removeFromCrate(id) {
  crate = crate.filter(item => item.id !== id);
  saveCrate();
  sessionCounter.decrement();
}

function saveLastQuery(query) {
  sessionStorage.setItem('tunecrate-last-query', query);
}

function loadLastQuery() {
  return sessionStorage.getItem('tunecrate-last-query') ?? '';
}


// ── State display ─────────────────────────────────────────
const allStates = [stateEmpty, stateLoading, stateError, stateNoResults, resultsMeta];

function showState(active) {
  allStates.forEach(el => {
    if (el === active) {
      el.removeAttribute('hidden');
    } else {
      el.setAttribute('hidden', '');
    }
  });

  if (active !== resultsMeta) cardsGrid.innerHTML = '';
}


// ── Card creation ─────────────────────────────────────────
function getArtworkUrl(item) {
  return (item.artworkUrl100 ?? '').replace('100x100', '600x600');
}

function getBadgeLabel(wrapperType) {
  const labels = { track: 'Track', collection: 'Album', artist: 'Artist' };
  return labels[wrapperType] ?? wrapperType;
}

function buildCard(item) {
  const saved     = isInCrate(item.id);
  const artUrl    = getArtworkUrl(item);
  const title     = item.trackName ?? item.collectionName ?? item.artistName ?? 'Unknown';
  const artist    = item.artistName ?? '';
  const badgeText = getBadgeLabel(item.wrapperType);

  const card = document.createElement('article');
  card.className = 'card';
  card.setAttribute('role', 'listitem');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${title} by ${artist}`);

  // Art
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

  // Save button — closes over this card's item object
  const saveBtn = document.createElement('button');
  saveBtn.className = saved ? 'card__save-btn card__save-btn--saved' : 'card__save-btn';
  saveBtn.setAttribute('aria-label',   saved ? 'Remove from crate' : 'Save to crate');
  saveBtn.setAttribute('aria-pressed', String(saved));
  saveBtn.textContent = saved ? '♥' : '♡';

  saveBtn.addEventListener('click', e => {
    e.stopPropagation();
    const nowSaved = saveBtn.classList.contains('card__save-btn--saved');

    if (nowSaved) {
      removeFromCrate(item.id);
      saveBtn.classList.remove('card__save-btn--saved');
      saveBtn.textContent = '♡';
      saveBtn.setAttribute('aria-label',   'Save to crate');
      saveBtn.setAttribute('aria-pressed', 'false');
    } else {
      addToCrate(item);
      saveBtn.classList.add('card__save-btn--saved');
      saveBtn.textContent = '♥';
      saveBtn.setAttribute('aria-label',   'Remove from crate');
      saveBtn.setAttribute('aria-pressed', 'true');
    }
  });

  artWrap.appendChild(saveBtn);

  // Body
  const body = document.createElement('div');
  body.className = 'card__body';

  const titleEl = document.createElement('p');
  titleEl.className   = 'card__title';
  titleEl.textContent = title;

  const artistEl = document.createElement('p');
  artistEl.className   = 'card__artist';
  artistEl.textContent = artist;

  const badge = document.createElement('span');
  badge.className   = 'card__type-badge';
  badge.textContent = badgeText;

  body.append(titleEl, artistEl, badge);
  card.append(artWrap, body);

  // Navigate to detail page on card click — closes over this item
  function openDetail() {
    localStorage.setItem('tunecrate-preview', JSON.stringify(item));
    saveLastQuery(input.value.trim());
    window.location.href = `detail.html?id=${item.id}`;
  }

  card.addEventListener('click', openDetail);
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDetail();
    }
  });

  return card;
}

function renderCards(results) {
  cardsGrid.innerHTML = '';
  const fragment = document.createDocumentFragment();
  results.forEach(item => fragment.appendChild(buildCard(item)));
  cardsGrid.appendChild(fragment);
}


// ── Normalise iTunes results ──────────────────────────────
// iTunes returns different id fields depending on result type.
// Attach a consistent `id` so the rest of the code doesn't care.
function normaliseResults(results) {
  return results.map(item => ({
    ...item,
    id: item.trackId ?? item.collectionId ?? item.artistId,
  }));
}


// ── Search ────────────────────────────────────────────────
async function runSearch(query, entity, limit) {
  currentQuery = query;
  showState(stateLoading);
  setSearchError('');

  try {
    const raw     = await searchMusic(query, entity, limit);
    const results = normaliseResults(raw);

    if (results.length === 0) {
      showState(stateNoResults);
      document.getElementById('no-results-term').textContent =
        `Nothing matched "${query}". Try a different name.`;
      return;
    }

    showState(resultsMeta);
    resultsTerm.textContent  = `"${query}"`;
    resultsCount.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;
    renderCards(results);

  } catch (err) {
    showState(stateError);
    document.getElementById('error-message').textContent =
      'Could not reach the iTunes API. Check your connection and try again.';
    console.error(err);
  }
}


// ── Form submit ───────────────────────────────────────────
function setSearchError(msg) {
  if (msg) {
    searchError.textContent = msg;
    searchError.removeAttribute('hidden');
  } else {
    searchError.setAttribute('hidden', '');
    searchError.textContent = '';
  }
}

function handleSubmit(e) {
  e.preventDefault();

  const query = input.value.trim();

  if (!query) {
    setSearchError('Please enter a search term.');
    input.focus();
    return;
  }
  if (query.length < 2) {
    setSearchError('Search must be at least 2 characters.');
    input.focus();
    return;
  }

  setSearchError('');
  runSearch(query, currentEntity, Number(limitSelect.value));
}

form.addEventListener('submit', handleSubmit);


// ── Live search (debounced on input) ──────────────────────
const debouncedSearch = debounce(query => {
  if (query.length >= 2) {
    runSearch(query, currentEntity, Number(limitSelect.value));
  }
}, 500);

input.addEventListener('input', () => {
  setSearchError('');
  debouncedSearch(input.value.trim());
});


// ── Filter chips ──────────────────────────────────────────
chips.forEach(chip => {
  chip.addEventListener('click', () => {
    chips.forEach(c => {
      c.classList.remove('chip--active');
      c.setAttribute('aria-pressed', 'false');
    });
    chip.classList.add('chip--active');
    chip.setAttribute('aria-pressed', 'true');
    currentEntity = chip.dataset.type;

    if (currentQuery) runSearch(currentQuery, currentEntity, Number(limitSelect.value));
  });
});


// ── Limit select ──────────────────────────────────────────
limitSelect.addEventListener('change', () => {
  if (currentQuery) runSearch(currentQuery, currentEntity, Number(limitSelect.value));
});


// ── Retry button ──────────────────────────────────────────
retryBtn.addEventListener('click', () => {
  if (currentQuery) {
    runSearch(currentQuery, currentEntity, Number(limitSelect.value));
  } else {
    showState(stateEmpty);
  }
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


// ── Restore last search on back-navigation ────────────────
const lastQuery = loadLastQuery();
if (lastQuery) {
  input.value = lastQuery;
  runSearch(lastQuery, currentEntity, Number(limitSelect.value));
}