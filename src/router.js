// ============================================================
// SPA Hash Router
// ============================================================
const routes = {};
let currentCleanup = null;

export function registerRoute(path, handler) {
  routes[path] = handler;
}

export function navigateTo(path) {
  window.location.hash = path;
}

export function getCurrentRoute() {
  return window.location.hash.slice(1) || '/';
}

export function initRouter() {
  async function handleRoute() {
    const hash = getCurrentRoute();
    // Parse path and params: e.g. /artist/1 → path=/artist, param=1
    const parts = hash.split('/').filter(Boolean);
    const basePath = '/' + (parts[0] || '');
    const param = parts[1] || null;

    // Run cleanup from previous route
    if (currentCleanup && typeof currentCleanup === 'function') {
      currentCleanup();
      currentCleanup = null;
    }

    const handler = routes[basePath] || routes['/'];
    if (handler) {
      currentCleanup = await handler(param);
    }
  }

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
