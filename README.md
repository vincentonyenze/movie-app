# Movie Discovery

A movie browsing app: discover popular, top-rated and new movies, filter by genre, search, see full details with cast and trailer, and keep a list of favourites. Built with plain HTML, CSS and JavaScript. No frameworks or libraries.

This is **Project 8** in my beginner-to-expert web development roadmap, and the last project of Level 1 (vanilla JavaScript). It brings together everything from the earlier projects: API requests (Weather App), ES modules and a store (Notes App), and localStorage (Expense Tracker).

<!-- Add a screenshot: save one as screenshot.png in this folder and uncomment the line below -->
<!-- ![Movie Discovery screenshot](screenshot.png) -->

## Features

- Browse popular movies from TMDB
- Search as you type (debounced), or press Enter to search at once
- Filter by genre and sort by popularity, rating, newest or oldest
- **Load more** pagination, without duplicate movies
- Details dialog: backdrop, tagline, runtime, rating and votes, genres, overview, top cast and a trailer link
- ❤️ Favourites, saved in the browser and synced between open tabs
- Favourites view with its own search, genre filter and sort, which also works offline
- Skeleton loading cards, plus clear empty and error states with **Try again**
- Out-of-date requests are cancelled, so a slow answer can never replace a newer one
- Keyboard friendly: skip link, `/` to search, Esc to close, focus kept in a sensible place
- Screen-reader friendly labels and announcements
- Responsive images (`srcset`) and lazy loading
- Responsive layout from phone to desktop

## Built with

- HTML5 (`<template>`, `<dialog>`, `aria-pressed`, `aria-busy`, live regions)
- CSS3 (custom properties, Grid `auto-fill`, `aspect-ratio`, `:has()`, `::backdrop`, `scroll-snap`, `@keyframes`, `prefers-reduced-motion`)
- Vanilla JavaScript (ES6+) in **ES modules**
- [TMDB API](https://developer.themoviedb.org/) (discover, search, genres, movie details with credits and videos)
- Browser APIs: `fetch`, `AbortController`, `localStorage`, the `storage` event, dynamic `import()`

## How it works

```
user action ──► state ──► refresh()
                            ├─ Discover:   api.js ──► TMDB ──► ui.js
                            └─ Favourites: favourites.js (filter + sort in the browser) ──► ui.js
```

1. **State:** `main.js` keeps what the user asked for: the view, search text, genre and sort.
2. **One entry point:** search, genres, sort and the tabs only change the state and call `refresh()`.
3. **Discover** asks TMDB for page 1. **Load more** asks for the next page and adds it to the end.
4. **Favourites** are already in the browser, so they're filtered and sorted with `filter()` and `sort()`, with no requests at all.
5. **The favourites store** tells its subscribers whenever the list changes (here or in another tab), and every ❤️ on the page updates.
6. **`api.js`** is the only file that knows about TMDB: URLs, the key, error codes and its field names. Everything else gets tidy movie objects.

## What I learned

- **Working with a real API:** reading docs, choosing endpoints (`/discover` vs `/movie/popular`), `append_to_response`, and working within limits (search can't filter or sort)
- **API keys:** sending a Bearer token in a header, keeping it out of git with `.gitignore` and an example config file, and why a frontend can't truly hide a key
- **One fetch function for every request,** with custom error classes (`ConfigError`, `NetworkError`, `ApiError`)
- **Cleaning data at the edge:** turning TMDB's fields into one simple movie shape
- **Race conditions:** cancelling requests with `AbortController`, with separate controllers for separate jobs
- **Debouncing** search (reused from the Notes App)
- **State-driven rendering:** state vs results, and one `refresh()` for every control
- **Pagination:** replace vs append, and removing duplicates with a `Set`
- **Filtering on the server vs in the browser,** and when each makes sense
- **Progressive rendering:** opening the dialog instantly with what's already known
- **`<template>` and `<dialog>`:** less JavaScript for cards and popups
- **The store pattern again,** reused from the Notes App for favourites
- **Accessibility:** focus management, skip links, `tabindex="-1"`, keyboard shortcuts and screen-reader text
- **Image performance:** `srcset`, `sizes`, `loading="lazy"` and avoiding layout shift

## How to run

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd movie-app
   ```
2. Get a free TMDB key: sign up at [themoviedb.org](https://www.themoviedb.org/), go to **Settings → API**, and copy the **API Read Access Token** (the long one starting with `eyJ`).
3. Create your config file and paste the token into it:
   ```bash
   cp js/config.example.js js/config.js
   ```
4. Open the folder in VS Code and start **Live Server** (right-click `index.html` → *Open with Live Server*).

No installation or build step is needed. A local server **is** needed, because browsers block ES modules on pages opened straight from a file (`file://`).

**Notes:**

- `js/config.js` is in `.gitignore`, so your key is never committed. Without it, the app shows a message explaining what to do.
- Your computer's date and time must be correct. HTTPS requests fail if the clock is far off.
- Deploying to GitHub Pages: `config.js` isn't in the repository, so the deployed site needs it added separately (for example, a deploy branch that includes it). TMDB's read-only token is designed for client apps, but anyone can see it in DevTools once the site is live. Truly secret keys need a backend, which comes in Level 4.

## Project structure

```
movie-app/
├── index.html            # Header, filters, grid, card <template>, details <dialog>
├── style.css             # Theme, cards, skeletons, dialog, responsive design
├── .gitignore            # Keeps js/config.js (your key) out of git
├── js/
│   ├── main.js           # Entry point: state, events, loading, views
│   ├── api.js            # TMDB requests, errors and data cleaning
│   ├── favourites.js     # Favourites store: localStorage, subscribers, tab sync
│   ├── ui.js             # Rendering cards, states, dialog, focus helpers
│   ├── dom.js            # Every element the app uses, looked up once
│   ├── utils.js          # debounce, formatRuntime
│   ├── config.example.js # Template for your key (committed)
│   └── config.js         # Your real key (NOT committed)
└── README.md
```

## Known limitations

- TMDB's search can't filter by genre or sort, so searching clears the genre and switches sorting off.
- Switching back to Discover starts again from page 1.
- Saved favourites keep the rating from when they were added; it isn't refreshed.
- Favourites are stored in this browser only. They don't sync between devices.
- TMDB never returns more than 500 pages for a list.

## Possible improvements

- Keep the search, genre and sort in the URL (`?genre=35&sort=…`), so links and the Back button work
- Infinite scroll instead of a **Load more** button
- "Similar movies" in the details dialog
- TV shows as well as movies
- Rebuild in React (Project 16 in my roadmap)

## Credits

Movie data and images from [TMDB](https://www.themoviedb.org/). This product uses the TMDB API but is not endorsed or certified by TMDB.
