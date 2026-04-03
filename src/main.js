// ============================================================
// KidArt Gallery — Main Entry Point v2
// ============================================================
import { registerRoute, initRouter } from './router.js';
import { renderNavbar } from './components/navbar.js';
import { renderLanding } from './pages/landing.js';
import { renderLogin } from './pages/login.js';
import { renderGallery3D } from './pages/gallery3d/index.js';
import { renderArtists } from './pages/artist.js';
import { renderAIStudio } from './pages/ai-studio.js';
import { renderStorybook } from './pages/story/storybook.js';

// Register routes
registerRoute('/', () => {
  renderNavbar();
  return renderLanding();
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

registerRoute('/storybook', () => {
  renderNavbar();
  return renderStorybook();
});

// Initialize router
initRouter();
