// Everything that talks to TMDB lives here. The rest of the app asks for
// movies and gets back plain, tidy objects. It never sees URLs, headers or
// TMDB's own field names.

const API_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

// ===== Errors =====
// Different classes for different problems, so the UI can show the right
// message with `instanceof` instead of guessing from the text.

// The key is missing or wrong
export class ConfigError extends Error {
  name = "ConfigError";
}

// The request never got an answer (offline, DNS, wrong clock...)
export class NetworkError extends Error {
  name = "NetworkError";
}

// TMDB answered, but with an error status like 404 or 500
export class ApiError extends Error {
  name = "ApiError";

  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// ===== The key =====
// config.js is gitignored, so it may not exist (e.g. right after cloning).
// A normal `import` at the top would stop the whole app with a 404.
// `import()` is a function: it returns a promise we can catch.
let tokenPromise = null;

function getToken() {
  // Only load the file once; later calls reuse the same promise
  tokenPromise ??= import("./config.js")
    .then(({ TMDB_TOKEN }) => {
      if (!TMDB_TOKEN || !TMDB_TOKEN.startsWith("eyJ")) {
        throw new ConfigError("Paste your TMDB read access token into js/config.js.");
      }
      return TMDB_TOKEN;
    })
    .catch((error) => {
      tokenPromise = null; // let the next call try again after you fix it
      if (error instanceof ConfigError) throw error;
      throw new ConfigError("js/config.js is missing. Copy js/config.example.js to js/config.js and add your TMDB token.");
    });
  return tokenPromise;
}

// ===== One function for every request =====
// path: like "/movie/popular"
// params: query parameters, e.g. { page: 2 } becomes "?page=2"
// signal: from an AbortController, to cancel a request we no longer need
async function tmdbFetch(path, params = {}, { signal } = {}) {
  const token = await getToken();

  const url = new URL(API_BASE + path);
  url.search = new URLSearchParams({ language: "en-US", ...params });

  let response;
  try {
    response = await fetch(url, {
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
  } catch (error) {
    // A cancelled request isn't a failure; let the caller recognise it
    if (error.name === "AbortError") throw error;
    throw new NetworkError("Couldn't reach TMDB. Check your internet connection and your computer's date and time.");
  }

  // fetch() only throws when there's no answer at all. A 404 or 500 still
  // "succeeds", so the status has to be checked by hand.
  if (!response.ok) {
    throw new ApiError(messageForStatus(response.status), response.status);
  }

  return response.json();
}

function messageForStatus(status) {
  if (status === 401) return "TMDB rejected the key. Check the token in js/config.js.";
  if (status === 404) return "That movie couldn't be found.";
  if (status === 429) return "Too many requests. Wait a moment and try again.";
  if (status >= 500) return "TMDB is having problems right now. Try again later.";
  return `Something went wrong (error ${status}).`;
}

// ===== Images =====
// TMDB only gives a path like "/abc.jpg". The full URL also needs a size:
// w185, w342, w500, w780, w1280 or "original".
export function imageUrl(path, size = "w342") {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

// ===== Cleaning the data =====
// TMDB uses names like release_date and vote_average, and may send empty
// strings or zeros. We turn every movie into the same simple shape here,
// once, so the rest of the app never has to worry about it.
function toMovie(raw) {
  return {
    id: raw.id,
    title: raw.title || raw.original_title || "Untitled",
    year: Number.parseInt(raw.release_date, 10) || null, // "2024-02-27" -> 2024
    // An average of 0 votes isn't a rating of 0
    rating: raw.vote_count > 0 ? Math.round(raw.vote_average * 10) / 10 : null,
    posterPath: raw.poster_path ?? null,
    overview: raw.overview ?? "",
    genreIds: raw.genre_ids ?? [],
  };
}

// A page of results: the movies plus what's needed for "Load more"
function toPage(data) {
  return {
    movies: data.results.map(toMovie),
    page: data.page,
    // TMDB never returns more than page 500, even if it says there are more
    totalPages: Math.min(data.total_pages, 500),
    totalResults: data.total_results,
  };
}

// ===== Endpoints =====
export async function getPopularMovies(page = 1, signal) {
  const data = await tmdbFetch("/movie/popular", { page }, { signal });
  return toPage(data);
}

export async function searchMovies(query, page = 1, signal) {
  const data = await tmdbFetch(
    "/search/movie",
    { query, page, include_adult: false },
    { signal }
  );
  return toPage(data);
}
