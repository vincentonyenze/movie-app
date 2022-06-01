// Every element the app needs, looked up once and shared with other modules
export const elements = {
  // Header
  tabButtons: document.querySelectorAll(".tabs__btn"),
  favCount: document.getElementById("fav-count"),
  searchForm: document.getElementById("search-form"),
  searchInput: document.getElementById("search-input"),

  // Toolbar
  genreList: document.getElementById("genre-list"),
  sortSelect: document.getElementById("sort-select"),

  // Results
  resultsTitle: document.getElementById("results-title"),
  resultsCount: document.getElementById("results-count"),
  movieGrid: document.getElementById("movie-grid"),
  cardTemplate: document.getElementById("movie-card-template"),
  loadMoreBtn: document.getElementById("load-more-btn"),

  // Empty and error states
  status: document.getElementById("status"),
  statusIcon: document.getElementById("status-icon"),
  statusMessage: document.getElementById("status-message"),
  retryBtn: document.getElementById("retry-btn"),

  // Details dialog
  details: document.getElementById("details"),
  detailsClose: document.getElementById("details-close"),
  detailsBackdrop: document.getElementById("details-backdrop"),
  detailsPoster: document.getElementById("details-poster"),
  detailsTitle: document.getElementById("details-title"),
  detailsTagline: document.getElementById("details-tagline"),
  detailsMeta: document.getElementById("details-meta"),
  detailsGenres: document.getElementById("details-genres"),
  detailsFav: document.getElementById("details-fav"),
  detailsTrailer: document.getElementById("details-trailer"),
  detailsOverview: document.getElementById("details-overview"),
  detailsCast: document.getElementById("details-cast"),
  detailsStatus: document.getElementById("details-status"),
};
