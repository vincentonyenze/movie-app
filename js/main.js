// Entry point: the only script loaded by index.html.
// It connects the pieces: user events -> API -> UI.
import { getPopularMovies } from "./api.js";
import { renderMovies, renderResultsHeader } from "./ui.js";

async function loadPopularMovies() {
  try {
    const { movies, totalResults } = await getPopularMovies();
    renderResultsHeader("Popular movies", totalResults);
    renderMovies(movies);
  } catch (error) {
    // Proper on-screen error messages come in the next step
    console.error(`${error.name}: ${error.message}`);
  }
}

loadPopularMovies();
