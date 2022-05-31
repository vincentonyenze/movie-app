// Entry point: the only script loaded by index.html.
import { getPopularMovies } from "./api.js";

// Temporary test for Step 6: check the API works before building the UI.
// Open DevTools (F12) -> Console to see the result.
async function testApi() {
  try {
    const { movies, totalResults } = await getPopularMovies();
    console.log(`✅ TMDB works! ${totalResults} popular movies. First page:`);
    console.table(movies.map(({ title, year, rating }) => ({ title, year, rating })));
  } catch (error) {
    console.error(`❌ ${error.name}: ${error.message}`);
  }
}

testApi();
