// Entry point: the only script loaded by index.html.
// It connects the pieces: user events -> state -> API -> UI.
import { elements } from "./dom.js";
import { discoverMovies, searchMovies, getGenres, getMovieDetails } from "./api.js";
import { debounce } from "./utils.js";
import { subscribe, getFavourites, getFavouriteIds, toggleFavourite } from "./favourites.js";
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
  openDetails,
  renderDetails,
  renderDetailsError,
  closeDetails,
  renderFavouriteState,
  renderView,
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
  view: "discover", // "discover" (movies from TMDB) or "favourites" (saved ones)
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
      renderMovies(movies, getFavouriteIds());
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
    appendMovies(newMovies, getFavouriteIds());
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

// ===== Favourites view =====
// Favourites are already in the browser, so search, genres and sort all
// work here without asking TMDB: plain filter() and sort() on an array.

// Movies without a rating or year go to the end, whichever way we sort
function compareMaybe(a, b, direction) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === "asc" ? a - b : b - a;
}

// The same <option> values as Discover. "Most popular" becomes
// "Recently added", because we don't store popularity.
const FAVOURITE_SORTS = {
  "popularity.desc": (a, b) => b.addedAt - a.addedAt,
  "vote_average.desc": (a, b) => compareMaybe(a.rating, b.rating, "desc"),
  "primary_release_date.desc": (a, b) => compareMaybe(a.year, b.year, "desc"),
  "primary_release_date.asc": (a, b) => compareMaybe(a.year, b.year, "asc"),
};

function getVisibleFavourites() {
  const query = state.query.toLowerCase();
  return getFavourites()
    .filter((movie) => movie.title.toLowerCase().includes(query))
    .filter((movie) => state.genreId === null || movie.genreIds.includes(state.genreId))
    .sort(FAVOURITE_SORTS[state.sortBy]); // filter() made a new array, so sorting it is safe
}

// "Favourites matching “dune”", "Your favourites", "Your Comedy favourites"
function getFavouritesTitle() {
  if (state.query) return `Favourites matching “${state.query}”`;
  const genre = genres.find((g) => g.id === state.genreId);
  return ["Your", genre?.name, "favourites"].filter(Boolean).join(" ");
}

function showFavourites() {
  // A Discover request still on its way must not land on this view
  currentRequest?.abort();

  const movies = getVisibleFavourites();
  // The grid's click handlers look movies up in `results`, so favourites go there too
  Object.assign(results, { movies, page: 0, totalPages: 0 });

  renderResultsHeader(getFavouritesTitle(), movies.length);
  renderLoadMore({ hasMore: false });
  if (movies.length > 0) {
    renderMovies(movies, getFavouriteIds());
  } else if (getFavourites().length === 0) {
    renderEmpty("No favourites yet. Tap ♡ on any movie to save it here.");
  } else {
    renderEmpty("None of your favourites match these filters.");
  }
}

// Show whatever the state asks for: Discover fetches, Favourites doesn't.
// Search, genres, sort and the tabs all call this.
function refresh() {
  if (state.view === "favourites") showFavourites();
  else loadMovies();
}

function handleTabClick(event) {
  const view = event.currentTarget.dataset.view;
  if (view === state.view) return;

  // A search is for one place, so it's cleared. Genre and sort are kept.
  state.view = view;
  state.query = "";
  elements.searchInput.value = "";
  renderView(view);
  renderSort(state.sortBy, state.view, false);
  refresh();
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
  renderSort(state.sortBy, state.view, query !== "");
  refresh();
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
  renderSort(state.sortBy, state.view, false);
  refresh();
}

// ===== Sort =====
function handleSortChange() {
  state.sortBy = elements.sortSelect.value;
  refresh();
}

// ===== Details =====
// The details request has its own controller: opening a movie shouldn't
// cancel a list that's loading, and closing the dialog should cancel the
// details we no longer need.
let detailsRequest = null;

// The movie shown in the dialog: first the card's data, then the full
// details once they arrive. The dialog's ❤️ button saves this one.
let openMovie = null;

async function showDetails(movieId) {
  const movie = results.movies.find((m) => m.id === movieId);
  if (!movie) return;

  detailsRequest?.abort();
  const request = new AbortController();
  detailsRequest = request;

  openMovie = movie;
  openDetails(movie, getFavouriteIds());
  try {
    const details = await getMovieDetails(movieId, request.signal);
    openMovie = details;
    renderDetails(details);
  } catch (error) {
    if (error.name === "AbortError") return;
    renderDetailsError(error);
  } finally {
    if (detailsRequest === request) detailsRequest = null;
  }
}

// One listener for every card in the grid (event delegation).
// Each card has two buttons: ❤️, or the rest of the card to open details.
function handleGridClick(event) {
  const card = event.target.closest(".movie-card");
  if (!card) return;
  const movieId = Number(card.dataset.id);

  if (event.target.closest(".movie-card__fav")) {
    const movie = results.movies.find((m) => m.id === movieId);
    if (movie) toggleFavourite(movie);
  } else if (event.target.closest(".movie-card__open")) {
    showDetails(movieId);
  }
}

function handleDetailsFav() {
  if (openMovie) toggleFavourite(openMovie);
}

// Clicks on the dark area outside the dialog land on the <dialog> itself;
// clicks on its content land on the elements inside
function handleDialogClick(event) {
  if (event.target === elements.details) closeDetails();
}

// Runs however the dialog was closed: ✕, Esc or clicking outside
function handleDialogClose() {
  detailsRequest?.abort();
  openMovie = null;
}

// ===== Init =====
elements.searchInput.addEventListener("input", searchSoon);
elements.searchForm.addEventListener("submit", handleSearchSubmit);
elements.genreList.addEventListener("click", handleGenreClick);
elements.sortSelect.addEventListener("change", handleSortChange);
elements.loadMoreBtn.addEventListener("click", loadMoreMovies);
elements.movieGrid.addEventListener("click", handleGridClick);
elements.detailsClose.addEventListener("click", closeDetails);
elements.details.addEventListener("click", handleDialogClick);
elements.details.addEventListener("close", handleDialogClose);
elements.detailsFav.addEventListener("click", handleDetailsFav);
elements.tabButtons.forEach((button) => button.addEventListener("click", handleTabClick));
// "Try again" repeats the load that failed, with the same state,
// and fetches the genres too if they failed the first time
elements.retryBtn.addEventListener("click", () => {
  if (genres.length === 0) loadGenres();
  refresh();
});

// Browsers sometimes keep a <select>'s old value after a refresh,
// so make the page match the state before the first load
renderView(state.view);
renderSort(state.sortBy, state.view, false);

// Every change to the favourites (a click here, or another tab) updates
// the hearts and the count. On the Favourites view the list itself
// changes too: an un-hearted movie leaves it.
subscribe(() => {
  renderFavouriteState(getFavouriteIds());
  if (state.view === "favourites") showFavourites();
});
renderFavouriteState(getFavouriteIds());

// Both start at the same time; neither waits for the other
loadGenres();
refresh();
