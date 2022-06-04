// Entry point: the only script loaded by index.html.
// It connects the pieces: user events -> API -> UI.
import { elements } from "./dom.js";
import { getPopularMovies } from "./api.js";
import {
  renderMovies,
  renderResultsHeader,
  renderLoading,
  renderEmpty,
  renderError,
} from "./ui.js";

// Every load goes through the same steps:
// show skeletons -> fetch -> show movies, "nothing found" or an error
async function loadPopularMovies() {
  renderLoading();
  try {
    const { movies, totalResults } = await getPopularMovies();
    renderResultsHeader("Popular movies", totalResults);
    if (movies.length === 0) {
      renderEmpty("No movies to show right now.");
    } else {
      renderMovies(movies);
    }
  } catch (error) {
    renderError(error);
  }
}

// "Try again" repeats the load that failed
elements.retryBtn.addEventListener("click", loadPopularMovies);

loadPopularMovies();
