// The favourites "store": the list of ❤️ movies, saved in localStorage.
// It knows nothing about HTML. When the list changes it tells its
// subscribers (the same pattern as the Notes App's store).
//
// Each favourite is a copy of the movie's basic fields, so the
// Favourites view can show them without asking TMDB again:
// { id, title, year, rating, posterPath, overview, genreIds, addedAt }

const STORAGE_KEY = "movie-app:favourites";

// ===== Saving and loading =====
function isValidFavourite(item) {
  return (
    Boolean(item) &&
    Number.isInteger(item.id) &&
    typeof item.title === "string" &&
    Number.isFinite(item.addedAt)
  );
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(saved)) return [];
    // Keep the good ones even if one is damaged, instead of losing them all
    return saved.filter(isValidFavourite);
  } catch (error) {
    console.error("Could not load favourites:", error);
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favourites));
  } catch (error) {
    console.error("Could not save favourites:", error);
  }
}

// Newest first
let favourites = load();

// ===== Subscribers =====
const listeners = [];

// Call `listener()` every time the favourites change
export function subscribe(listener) {
  listeners.push(listener);
}

function notify() {
  listeners.forEach((listener) => listener());
}

// ===== Reading =====
export function getFavourites() {
  return favourites;
}

// A Set of ids, for quick "is this one a favourite?" checks while drawing
export function getFavouriteIds() {
  return new Set(favourites.map((movie) => movie.id));
}

export function isFavourite(id) {
  return favourites.some((movie) => movie.id === id);
}

// ===== Changing =====
// Only these fields are stored. A details object also has the cast,
// trailer and more, which we don't need to keep.
function toFavourite(movie) {
  const { id, title, year, rating, posterPath, overview, genreIds } = movie;
  return { id, title, year, rating, posterPath, overview, genreIds, addedAt: Date.now() };
}

// Add the movie if it isn't a favourite, remove it if it is.
// Returns true if it's a favourite now.
export function toggleFavourite(movie) {
  const wasFavourite = isFavourite(movie.id);
  favourites = wasFavourite
    ? favourites.filter((item) => item.id !== movie.id)
    : [toFavourite(movie), ...favourites];
  save();
  notify();
  return !wasFavourite;
}

// ===== Other tabs =====
// ❤️ a movie in one tab and the others update too (as in the Notes App)
window.addEventListener("storage", (event) => {
  if (event.storageArea !== localStorage) return;
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  favourites = load();
  notify();
});
