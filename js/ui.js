// Everything that draws on the page. These functions take data and update
// the DOM; they never fetch anything or change the app's state.
import { elements } from "./dom.js";
import { imageUrl, ConfigError, NetworkError, ApiError } from "./api.js";

// TMDB sends 20 movies per page, so show 20 placeholders while loading
const SKELETON_COUNT = 20;

// Fill a copy of the <template> from index.html with one movie's data
function createMovieCard(movie) {
  // cloneNode(true) copies the element and everything inside it
  const fragment = elements.cardTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".movie-card");
  card.dataset.id = movie.id;

  card.querySelector(".movie-card__title").textContent = movie.title;
  card.querySelector(".movie-card__year").textContent = movie.year ?? "";
  card.querySelector(".movie-card__rating").textContent =
    movie.rating !== null ? `★ ${movie.rating.toFixed(1)}` : "";

  const poster = card.querySelector(".movie-card__poster");
  const posterSrc = imageUrl(movie.posterPath);
  if (posterSrc) {
    poster.src = posterSrc;
    // A broken image link gets the same placeholder as a missing poster
    poster.addEventListener("error", () => {
      card.classList.add("movie-card--no-poster");
    }, { once: true });
  } else {
    card.classList.add("movie-card--no-poster");
  }

  return fragment;
}

// Replace everything in the grid with these movies
export function renderMovies(movies) {
  elements.movieGrid.replaceChildren(...movies.map(createMovieCard));
  elements.movieGrid.setAttribute("aria-busy", "false");
  hideStatus();
}

// A grey card shape: poster, title line, shorter year line
function createSkeletonCard() {
  const item = document.createElement("li");
  item.setAttribute("aria-hidden", "true"); // nothing here for screen readers

  for (const modifier of ["poster", "text", "text skeleton--short"]) {
    const block = document.createElement("div");
    block.className = `skeleton skeleton--${modifier}`;
    item.append(block);
  }
  return item;
}

export function renderLoading() {
  // Array.from({ length: 20 }, fn) makes 20 items by calling fn 20 times
  elements.movieGrid.replaceChildren(
    ...Array.from({ length: SKELETON_COUNT }, createSkeletonCard)
  );
  elements.movieGrid.setAttribute("aria-busy", "true");
  elements.resultsCount.textContent = "Loading…";
  hideStatus();
}

// The empty and error states share one box: an icon, a message, and
// optionally a "Try again" button
function showStatus({ icon, message, canRetry = false }) {
  elements.movieGrid.replaceChildren();
  elements.movieGrid.setAttribute("aria-busy", "false");
  elements.statusIcon.textContent = icon;
  elements.statusMessage.textContent = message;
  elements.retryBtn.hidden = !canRetry;
  elements.status.hidden = false;
}

function hideStatus() {
  elements.status.hidden = true;
}

export function renderEmpty(message) {
  elements.resultsCount.textContent = "0 movies";
  showStatus({ icon: "🎞️", message });
}

// Each kind of error gets its own icon. The messages were already
// written in api.js, close to where each problem is detected.
function iconForError(error) {
  if (error instanceof ConfigError) return "🔑";
  if (error instanceof NetworkError) return "📡";
  return "⚠️";
}

export function renderError(error) {
  // Anything that isn't one of our own errors is a bug in the code:
  // log the details for us, show the user something calm
  const isKnown = [ConfigError, NetworkError, ApiError].some(
    (ErrorClass) => error instanceof ErrorClass
  );
  if (!isKnown) console.error(error);

  elements.resultsCount.textContent = "";
  showStatus({
    icon: iconForError(error),
    message: isKnown ? error.message : "Something went wrong. Please try again.",
    canRetry: true,
  });
}

// One chip per genre, plus "All" at the start (its id is "")
export function renderGenres(genres) {
  const chips = [{ id: "", name: "All" }, ...genres].map((genre) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "genre-chip";
    chip.dataset.genreId = genre.id;
    chip.textContent = genre.name;
    return chip;
  });
  elements.genreList.replaceChildren(...chips);
}

// Mark which chip is selected (null = "All")
export function renderSelectedGenre(genreId) {
  const selected = String(genreId ?? ""); // dataset values are always strings
  elements.genreList.querySelectorAll(".genre-chip").forEach((chip) => {
    chip.setAttribute("aria-pressed", String(chip.dataset.genreId === selected));
  });
}

// TMDB's search can't sort, so the dropdown is switched off while searching
export function renderSort(sortBy, isSearching) {
  elements.sortSelect.value = sortBy;
  elements.sortSelect.disabled = isSearching;
  elements.sortSelect.title = isSearching ? "Sorting isn't available for search results" : "";
}

// The heading above the grid, e.g. "Popular movies" and "10,000 movies"
export function renderResultsHeader(title, totalResults) {
  elements.resultsTitle.textContent = title;
  // toLocaleString adds the thousands separators: 10000 -> "10,000"
  elements.resultsCount.textContent =
    `${totalResults.toLocaleString("en-US")} movie${totalResults === 1 ? "" : "s"}`;
}
