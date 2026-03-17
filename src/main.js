// ============================================================
// KidArt Gallery — Main Entry Point
// ============================================================
import { registerRoute, initRouter } from './router.js';
import { renderNavbar } from './components/navbar.js';
import { renderLanding } from './pages/landing.js';
import { renderLogin } from './pages/login.js';
import { renderGallery3D } from './pages/gallery3d.js';
import { renderArtists } from './pages/artist.js';
import { renderAIStudio } from './pages/ai-studio.js';

// Register routes
registerRoute('/', () => {
  renderNavbar();
  renderLanding();
});

registerRoute('/login', () => {
  renderNavbar();
  renderLogin();
});

registerRoute('/gallery', () => {
  renderNavbar();
  return renderGallery3D();
});

registerRoute('/artists', (param) => {
  renderNavbar();
  renderArtists(param);
});

registerRoute('/ai-studio', () => {
  renderNavbar();
  renderAIStudio();
});

// Initialize router
initRouter();
