// Everything that draws on the page. These functions take data and update
// the DOM; they never fetch anything or change the app's state.
import { elements } from "./dom.js";
import { imageUrl, ConfigError, NetworkError, ApiError } from "./api.js";
import { formatRuntime } from "./utils.js";

// TMDB sends 20 movies per page, so show 20 placeholders while loading
const SKELETON_COUNT = 20;

// ===== Favourite buttons =====
// The ❤️ on a card: a filled heart when it's a favourite. The hidden label
// says what clicking will do, for screen readers.
function setCardFavButton(button, isFav) {
  button.setAttribute("aria-pressed", String(isFav));
  button.firstElementChild.textContent = isFav ? "♥" : "♡";
  button.lastElementChild.textContent = isFav ? "Remove from favourites" : "Add to favourites";
}

function setDetailsFavButton(isFav) {
  elements.detailsFav.setAttribute("aria-pressed", String(isFav));
  elements.detailsFav.textContent = isFav ? "♥ In favourites" : "♡ Add to favourites";
}

// Bring every heart on the page up to date, plus the count in the tab.
// Called whenever the favourites change (here or in another tab).
export function renderFavouriteState(favouriteIds) {
  elements.favCount.textContent = favouriteIds.size;

  elements.movieGrid.querySelectorAll(".movie-card").forEach((card) => {
    const button = card.querySelector(".movie-card__fav");
    setCardFavButton(button, favouriteIds.has(Number(card.dataset.id)));
  });

  if (elements.details.open) {
    setDetailsFavButton(favouriteIds.has(Number(elements.details.dataset.movieId)));
  }
}

// Fill a copy of the <template> from index.html with one movie's data
function createMovieCard(movie, favouriteIds) {
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

  setCardFavButton(card.querySelector(".movie-card__fav"), favouriteIds.has(movie.id));

  return fragment;
}

// Replace everything in the grid with these movies.
// favouriteIds: a Set, so each card knows whether to show a filled heart
export function renderMovies(movies, favouriteIds) {
  elements.movieGrid.replaceChildren(
    ...movies.map((movie) => createMovieCard(movie, favouriteIds))
  );
  elements.movieGrid.setAttribute("aria-busy", "false");
  hideStatus();
}

// Add movies to the end of the grid ("Load more"), keeping the ones there
export function appendMovies(movies, favouriteIds) {
  elements.movieGrid.append(
    ...movies.map((movie) => createMovieCard(movie, favouriteIds))
  );
}

// hasMore: are there pages left? isLoading / failed change the button's text
export function renderLoadMore({ hasMore, isLoading = false, failed = false }) {
  const button = elements.loadMoreBtn;
  button.hidden = !hasMore;
  button.disabled = isLoading;
  if (isLoading) button.textContent = "Loading…";
  else if (failed) button.textContent = "Couldn't load more. Try again";
  else button.textContent = "Load more";
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
  elements.loadMoreBtn.hidden = true;
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
  elements.loadMoreBtn.hidden = true;
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

// TMDB's search can't sort, so the dropdown is switched off while
// searching Discover. Favourites are sorted in the browser, so it always works there.
export function renderSort(sortBy, view, isSearching) {
  const isDisabled = view === "discover" && isSearching;
  elements.sortSelect.value = sortBy;
  elements.sortSelect.disabled = isDisabled;
  elements.sortSelect.title = isDisabled ? "Sorting isn't available for search results" : "";
  // We don't save popularity with favourites, so that option sorts by date added
  elements.sortSelect.options[0].textContent =
    view === "favourites" ? "Recently added" : "Most popular";
}

// Highlight the tab for the current view, and match the search box's hint
export function renderView(view) {
  elements.tabButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.view === view));
  });
  elements.searchInput.placeholder =
    view === "favourites" ? "Search your favourites…" : "Search movies…";
}

// The heading above the grid, e.g. "Popular movies" and "10,000 movies"
export function renderResultsHeader(title, totalResults) {
  elements.resultsTitle.textContent = title;
  // toLocaleString adds the thousands separators: 10000 -> "10,000"
  elements.resultsCount.textContent =
    `${totalResults.toLocaleString("en-US")} movie${totalResults === 1 ? "" : "s"}`;
}

// ===== Details dialog =====
// Set an <img> from a TMDB path, or hide it when there's no image
function setImage(img, path, size) {
  const src = imageUrl(path, size);
  img.hidden = !src;
  if (src) img.src = src;
  else img.removeAttribute("src"); // don't leave the previous movie's picture
}

// "2024 · 2h 46m · ★ 8.2 (12,345 votes)", skipping anything we don't know
function formatMeta(movie) {
  const votes = movie.voteCount
    ? ` (${movie.voteCount.toLocaleString("en-US")} votes)`
    : "";
  return [
    movie.year,
    movie.runtime && formatRuntime(movie.runtime),
    movie.rating !== null && `★ ${movie.rating.toFixed(1)}${votes}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function createCastMember(person) {
  const item = document.createElement("li");
  item.className = "cast-member";

  // No photo: an empty grey box of the same size keeps the row tidy
  const photo = document.createElement(person.profilePath ? "img" : "div");
  photo.className = "cast-member__photo";
  if (person.profilePath) {
    photo.src = imageUrl(person.profilePath, "w185");
    photo.alt = ""; // the name is written right below
  }

  const name = document.createElement("span");
  name.className = "cast-member__name";
  name.textContent = person.name;

  const role = document.createElement("span");
  role.className = "cast-member__role";
  role.textContent = person.character;

  item.append(photo, name, role);
  return item;
}

// The cast list and its "Top cast" heading are shown or hidden together
function setCastVisible(isVisible) {
  elements.detailsCast.hidden = !isVisible;
  elements.detailsCast.previousElementSibling.hidden = !isVisible;
}

// Open the dialog straight away with what the card already knows (title,
// poster, year, rating, overview). The rest fills in when it arrives.
export function openDetails(movie, favouriteIds) {
  // Remember which movie is open, so its ❤️ button can be updated later
  elements.details.dataset.movieId = movie.id;
  setDetailsFavButton(favouriteIds.has(movie.id));

  elements.detailsTitle.textContent = movie.title;
  elements.detailsTagline.hidden = true;
  elements.detailsMeta.textContent = formatMeta(movie);
  elements.detailsGenres.replaceChildren();
  elements.detailsOverview.textContent = movie.overview || "No overview available.";
  elements.detailsTrailer.hidden = true;
  setImage(elements.detailsPoster, movie.posterPath, "w342");
  setImage(elements.detailsBackdrop, null);
  elements.detailsCast.replaceChildren();
  setCastVisible(false);

  elements.detailsStatus.textContent = "Loading details…";
  elements.detailsStatus.hidden = false;

  // showModal() (not show()) gives the backdrop, Esc to close, and keeps
  // keyboard focus inside the dialog
  if (!elements.details.open) elements.details.showModal();
  elements.details.scrollTop = 0;
}

export function renderDetails(movie) {
  elements.detailsTitle.textContent = movie.title;
  elements.detailsTagline.textContent = movie.tagline;
  elements.detailsTagline.hidden = !movie.tagline;
  elements.detailsMeta.textContent = formatMeta(movie);
  elements.detailsOverview.textContent = movie.overview || "No overview available.";
  setImage(elements.detailsPoster, movie.posterPath, "w342");
  setImage(elements.detailsBackdrop, movie.backdropPath, "w780");

  elements.detailsGenres.replaceChildren(
    ...movie.genreNames.map((name) => {
      const item = document.createElement("li");
      item.textContent = name;
      return item;
    })
  );

  elements.detailsCast.replaceChildren(...movie.cast.map(createCastMember));
  setCastVisible(movie.cast.length > 0);

  elements.detailsTrailer.hidden = !movie.trailerUrl;
  if (movie.trailerUrl) elements.detailsTrailer.href = movie.trailerUrl;

  elements.detailsStatus.hidden = true;
}

// Keep what's already shown; just explain that the rest didn't load
export function renderDetailsError(error) {
  elements.detailsStatus.textContent = `Couldn't load the full details. ${error.message}`;
  elements.detailsStatus.hidden = false;
}

export function closeDetails() {
  elements.details.close();
}
