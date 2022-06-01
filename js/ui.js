// Everything that draws on the page. These functions take data and update
// the DOM; they never fetch anything or change the app's state.
import { elements } from "./dom.js";
import { imageUrl } from "./api.js";

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
}

// The heading above the grid, e.g. "Popular movies" and "10,000 movies"
export function renderResultsHeader(title, totalResults) {
  elements.resultsTitle.textContent = title;
  // toLocaleString adds the thousands separators: 10000 -> "10,000"
  elements.resultsCount.textContent =
    `${totalResults.toLocaleString("en-US")} movie${totalResults === 1 ? "" : "s"}`;
}
