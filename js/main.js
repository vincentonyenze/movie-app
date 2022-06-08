// Entry point: the only script loaded by index.html.
// It connects the pieces: user events -> state -> API -> UI.
import { elements } from "./dom.js";
import { discoverMovies, searchMovies, getGenres } from "./api.js";
import { debounce } from "./utils.js";
import {
  renderMovies,
  renderResultsHeader,
  renderLoading,
  renderEmpty,
  renderError,
  renderGenres,
  renderSelectedGenre,
} from "./ui.js";

// Wait this long after the last keystroke before searching
const SEARCH_DELAY_MS = 400;

// What the user has asked to see. Every load reads from here.
// Searching and genres don't mix: TMDB's search can't filter by genre,
// so choosing one clears the other.
const state = {
  query: "", // "" means "not searching"
  genreId: null, // a TMDB genre id, or null for all genres
};

// [{ id: 28, name: "Action" }, ...], filled once at startup
let genres = [];

// The controller for the request that's running now, so it can be
// cancelled when a newer one starts
let currentRequest = null;

// ===== Loading =====
// Fetch whatever the state asks for. There's only ONE load function: search,
// genres (and soon sort and pages) just change the state and call it.
async function loadMovies() {
  // Cancel the previous request if it hasn't finished. Without this, a slow
  // answer for "bat" could arrive after "batman" and replace its results.
  currentRequest?.abort();
  const request = new AbortController();
  currentRequest = request;

  renderLoading();
  try {
    const { query, genreId } = state;
    const { movies, totalResults } = query
      ? await searchMovies(query, 1, request.signal)
      : await discoverMovies({ genreId }, request.signal);

    renderResultsHeader(getResultsTitle(), totalResults);
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

// "Results for “batman”", "Comedy movies" or "Popular movies"
function getResultsTitle() {
  if (state.query) return `Results for “${state.query}”`;
  const genre = genres.find((g) => g.id === state.genreId);
  return genre ? `${genre.name} movies` : "Popular movies";
}

// The genre chips are a nice extra: if they fail to load, the movies
// still work, so log the problem instead of showing an error
async function loadGenres() {
  try {
    genres = await getGenres();
    renderGenres(genres);
    renderSelectedGenre(state.genreId);
  } catch (error) {
    console.warn("Couldn't load genres:", error.message);
  }
}

// ===== Search =====
function search() {
  const query = elements.searchInput.value.trim();
  // "batman" -> "batman " shouldn't send the same request again
  if (query === state.query) return;
  state.query = query;
  if (query) {
    state.genreId = null;
    renderSelectedGenre(null);
  }
  loadMovies();
}

const searchSoon = debounce(search, SEARCH_DELAY_MS);

// Pressing Enter searches straight away instead of waiting for the delay
function handleSearchSubmit(event) {
  event.preventDefault(); // a form would otherwise reload the page
  searchSoon.flush();
}

// ===== Genres =====
// One listener on the container handles every chip (event delegation)
function handleGenreClick(event) {
  const chip = event.target.closest(".genre-chip");
  if (!chip) return;

  // "" (the "All" chip) becomes null, "28" becomes the number 28
  const genreId = chip.dataset.genreId === "" ? null : Number(chip.dataset.genreId);
  if (genreId === state.genreId && !state.query) return;

  state.genreId = genreId;
  state.query = "";
  elements.searchInput.value = "";
  renderSelectedGenre(genreId);
  loadMovies();
}

// ===== Init =====
elements.searchInput.addEventListener("input", searchSoon);
elements.searchForm.addEventListener("submit", handleSearchSubmit);
elements.genreList.addEventListener("click", handleGenreClick);
// "Try again" repeats the load that failed, with the same state,
// and fetches the genres too if they failed the first time
elements.retryBtn.addEventListener("click", () => {
  if (genres.length === 0) loadGenres();
  loadMovies();
});

// Both start at the same time; neither waits for the other
loadGenres();
loadMovies();
