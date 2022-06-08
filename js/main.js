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
  renderSort,
  appendMovies,
  renderLoadMore,
} from "./ui.js";

// Wait this long after the last keystroke before searching
const SEARCH_DELAY_MS = 400;

// The start of the heading for each sort option: "Top rated Horror movies"
const SORT_TITLES = {
  "popularity.desc": "Popular",
  "vote_average.desc": "Top rated",
  "primary_release_date.desc": "Newest",
  "primary_release_date.asc": "Oldest",
};

// What the user has asked to see. Every load reads from here.
// Searching doesn't mix with genres or sorting: TMDB's search can't
// filter or sort, so a search clears the genre and ignores the sort.
const state = {
  query: "", // "" means "not searching"
  genreId: null, // a TMDB genre id, or null for all genres
  sortBy: "popularity.desc", // one of the <option> values in index.html
};

// What's on screen now: the movies so far, and how far through the pages we are.
// This is the API's answer, kept separate from `state` (what the user asked for).
const results = {
  movies: [],
  page: 0,
  totalPages: 0,
};

// [{ id: 28, name: "Action" }, ...], filled once at startup
let genres = [];

// The controller for the request that's running now, so it can be
// cancelled when a newer one starts
let currentRequest = null;

// ===== Loading =====
// Ask the API for one page of whatever the state describes
function fetchPage(page, signal) {
  const { query, genreId, sortBy } = state;
  return query
    ? searchMovies(query, page, signal)
    : discoverMovies({ genreId, sortBy, page }, signal);
}

// Cancel the previous request if it hasn't finished, and start tracking a
// new one. Without this, a slow answer for "bat" could arrive after
// "batman" and replace its results.
function startRequest() {
  currentRequest?.abort();
  currentRequest = new AbortController();
  return currentRequest;
}

function finishRequest(request) {
  if (currentRequest === request) currentRequest = null;
}

// Start again from page 1. Search, genres and sort just change the state
// and call this.
async function loadMovies() {
  const request = startRequest();
  renderLoading();
  try {
    const { movies, page, totalPages, totalResults } = await fetchPage(1, request.signal);
    Object.assign(results, { movies, page, totalPages });

    renderResultsHeader(getResultsTitle(), totalResults);
    if (movies.length === 0) {
      renderEmpty(state.query ? `No movies match “${state.query}”.` : "No movies to show right now.");
    } else {
      renderMovies(movies);
      renderLoadMore({ hasMore: page < totalPages });
    }
  } catch (error) {
    // We cancelled this one on purpose; the newer request will draw the page
    if (error.name === "AbortError") return;
    renderError(error);
  } finally {
    finishRequest(request);
  }
}

// Add the next page under the movies already on screen
async function loadMoreMovies() {
  const request = startRequest();
  renderLoadMore({ hasMore: true, isLoading: true });
  try {
    const { movies, page, totalPages } = await fetchPage(results.page + 1, request.signal);

    // Popularity changes while you browse, so a movie can move from page 1
    // to page 2 and come back twice. Skip the ones we already have.
    const shownIds = new Set(results.movies.map((movie) => movie.id));
    const newMovies = movies.filter((movie) => !shownIds.has(movie.id));

    Object.assign(results, {
      movies: [...results.movies, ...newMovies],
      page,
      totalPages,
    });
    appendMovies(newMovies);
    renderLoadMore({ hasMore: page < totalPages });
  } catch (error) {
    if (error.name === "AbortError") return;
    // Keep the movies already on screen; just let the button try again
    console.warn("Couldn't load more:", error.message);
    renderLoadMore({ hasMore: true, failed: true });
  } finally {
    finishRequest(request);
  }
}

// "Results for “batman”", "Popular movies" or "Top rated Comedy movies"
function getResultsTitle() {
  if (state.query) return `Results for “${state.query}”`;
  const genre = genres.find((g) => g.id === state.genreId);
  return [SORT_TITLES[state.sortBy], genre?.name, "movies"].filter(Boolean).join(" ");
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
  renderSort(state.sortBy, query !== "");
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
  renderSort(state.sortBy, false);
  loadMovies();
}

// ===== Sort =====
function handleSortChange() {
  state.sortBy = elements.sortSelect.value;
  loadMovies();
}

// ===== Init =====
elements.searchInput.addEventListener("input", searchSoon);
elements.searchForm.addEventListener("submit", handleSearchSubmit);
elements.genreList.addEventListener("click", handleGenreClick);
elements.sortSelect.addEventListener("change", handleSortChange);
elements.loadMoreBtn.addEventListener("click", loadMoreMovies);
// "Try again" repeats the load that failed, with the same state,
// and fetches the genres too if they failed the first time
elements.retryBtn.addEventListener("click", () => {
  if (genres.length === 0) loadGenres();
  loadMovies();
});

// Browsers sometimes keep a <select>'s old value after a refresh,
// so make the page match the state before the first load
renderSort(state.sortBy, false);

// Both start at the same time; neither waits for the other
loadGenres();
loadMovies();
