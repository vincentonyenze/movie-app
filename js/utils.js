// Small helpers that don't depend on the page or the movies

// 166 -> "2h 46m", 120 -> "2h", 45 -> "45m"
export function formatRuntime(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

// Wait until calls stop for `delayMs`, then run `fn` once with the
// latest arguments. Typing "batman" quickly = 1 request, not 6.
// debounced.flush() runs a waiting call right now (e.g. when Enter is pressed).
// (The same helper as in the Notes App: good code is worth reusing.)
export function debounce(fn, delayMs) {
  let timeoutId = null;
  let lastArgs = [];

  function run() {
    timeoutId = null;
    fn(...lastArgs);
  }

  function debounced(...args) {
    lastArgs = args;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(run, delayMs);
  }

  debounced.flush = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      run();
    }
  };

  return debounced;
}
