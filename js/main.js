// Entry point: the only script loaded by index.html.
// It connects the pieces: user events -> state -> API -> UI.
import { elements } from "./dom.js";
import { getPopularMovies, searchMovies } from "./api.js";
import { debounce } from "./utils.js";
import {
  renderMovies,
  renderResultsHeader,
  renderLoading,
  renderEmpty,
  renderError,
} from "./ui.js";

// Wait this long after the last keystroke before searching
const SEARCH_DELAY_MS = 400;

// What the user has asked to see. Every load reads from here.
const state = {
  query: "", // "" means "not searching: show popular movies"
};

// The controller for the request that's running now, so it can be
// cancelled when a newer one starts
let currentRequest = null;

// ===== Loading =====
// Fetch whatever the state asks for. There's only ONE load function: search
// (and soon genres, sort and pages) just change the state and call it.
async function loadMovies() {
  // Cancel the previous request if it hasn't finished. Without this, a slow
  // answer for "bat" could arrive after "batman" and replace its results.
  currentRequest?.abort();
  const request = new AbortController();
  currentRequest = request;

  renderLoading();
  try {
    const { query } = state;
    const { movies, totalResults } = query
      ? await searchMovies(query, 1, request.signal)
      : await getPopularMovies(1, request.signal);

    renderResultsHeader(query ? `Results for “${query}”` : "Popular movies", totalResults);
    if (movies.length === 0) {
      renderEmpty(query ? `No movies match “${query}”.` : "No movies to show right now.");
    } else {
      renderMovies(movies);
    }
  } catch (error) {
    // We cancelled this one on purpose; the newer request will draw the page
    if (error.name === "AbortError") return;
    renderError(error);
  } finally {
    if (currentRequest === request) currentRequest = null;
  }
}

// ===== Search =====
function search() {
  const query = elements.searchInput.value.trim();
  // "batman" -> "batman " shouldn't send the same request again
  if (query === state.query) return;
  state.query = query;
  loadMovies();
}

const searchSoon = debounce(search, SEARCH_DELAY_MS);

// Pressing Enter searches straight away instead of waiting for the delay
function handleSearchSubmit(event) {
  event.preventDefault(); // a form would otherwise reload the page
  searchSoon.flush();
}

// ===== Init =====
elements.searchInput.addEventListener("input", searchSoon);
elements.searchForm.addEventListener("submit", handleSearchSubmit);
// "Try again" repeats the load that failed, with the same state
elements.retryBtn.addEventListener("click", loadMovies);

loadMovies();
