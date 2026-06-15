// api.js — iTunes Search API fetch logic

const BASE_URL = 'https://itunes.apple.com/search';

/**
 * Search the iTunes API.
 * @param {string} term    - Search query
 * @param {string} entity  - 'musicTrack' | 'album' | 'musicArtist'
 * @param {number} limit   - Max results to return
 * @returns {Promise<object[]>} Array of result objects
 */
export async function searchMusic(term, entity = 'musicTrack', limit = 24) {
  const params = new URLSearchParams({ term, entity, limit, media: 'music' });
  const response = await fetch(`${BASE_URL}?${params}`);

  if (!response.ok) {
    throw new Error(`iTunes API error: ${response.status}`);
  }

  const data = await response.json();
  return data.results;
}

/**
 * Returns a debounced version of fn that only fires after
 * the user stops calling it for `delay` ms. Closes over
 * the timer so each debounced function has its own private timeout.
 * @param {Function} fn
 * @param {number}   delay
 */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}