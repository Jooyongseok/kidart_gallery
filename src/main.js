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
import { renderSNS } from './pages/sns.js';
import { renderCharacterGallery } from './pages/character/index.js';
import { renderCharacterExtract } from './pages/character/extract.js';
import { renderExperimentLab } from './pages/experiment.js';

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

registerRoute('/sns', () => {
  renderNavbar();
  return renderSNS();
});

registerRoute('/characters', () => {
  renderNavbar();
  return renderCharacterGallery();
});

registerRoute('/character-extract', () => {
  renderNavbar();
  return renderCharacterExtract();
});

registerRoute('/experiment', () => {
  renderNavbar();
  return renderExperimentLab();
});

// Initialize router
initRouter();
