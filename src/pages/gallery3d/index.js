// ============================================================
// Gallery3D — Entry Point (init / cleanup / UI)
// ============================================================
import { isLoggedIn } from '../../utils/auth.js';
import { navigateTo } from '../../router.js';
import { GALLERY_TEMPLATES } from './templates.js';
import { s, EYE_HEIGHT } from './state.js';
import { buildGallery } from './scene.js';
import { setupInputs, animate, removeInputListeners, isMobile, startTour, stopTour, isTourActive } from './player.js';
import { stopSlideshow } from './artworks.js';

// ============================================================
// Render Gallery Page
// ============================================================
export function renderGallery3D() {
  if (!isLoggedIn()) {
    navigateTo('/login');
    return;
  }

  const content = document.getElementById('page-content');
  const templateKeys = Object.keys(GALLERY_TEMPLATES);

  content.innerHTML = `
    <div class="gallery3d-page" id="gallery3d-container">
      <canvas class="gallery3d-canvas" id="gallery3d-canvas"></canvas>

      <div class="gallery3d-overlay" id="gallery3d-overlay">
        <h2>\uD83C\uDFDB\uFE0F 3D 갤러리 입장</h2>

        <div class="gallery3d-template-select" id="template-select">
          <p class="template-select-label">전시 공간을 선택하세요</p>
          <div class="template-cards">
            ${templateKeys.map(key => {
              const t = GALLERY_TEMPLATES[key];
              return `
                <div class="template-card ${key === s.selectedTemplateKey ? 'active' : ''}"
                     data-template="${key}">
                  <span class="template-card__icon">${t.icon}</span>
                  <span class="template-card__name">${t.name}</span>
                  <span class="template-card__desc">${t.description}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <p style="margin-top: 18px; font-size: 0.9rem; color: var(--color-text-muted);">
          클릭하여 갤러리에 입장하세요
        </p>
        <p style="margin-top: 8px; font-size: 0.82rem; color: var(--color-text-dim);">
          <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 이동 &nbsp;|&nbsp; 마우스로 둘러보기 &nbsp;|&nbsp; <kbd>ESC</kbd> 나가기
        </p>
      </div>

      <div class="gallery3d-fade" id="gallery3d-fade"></div>

      <div class="gallery3d-hud" id="gallery3d-hud" style="display:none;">
        <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 이동</span>
        <span>마우스: 둘러보기</span>
        <span><kbd>M</kbd> 미니맵</span>
        <span><kbd>ESC</kbd> 메뉴</span>
        <button class="btn btn--ghost btn--sm" id="btn-tour" style="margin-left:var(--space-sm);padding:2px 8px;font-size:0.75rem;">🚶 투어</button>
      </div>

      <canvas id="gallery3d-minimap" class="gallery3d-minimap" width="150" height="150" style="display:none;"></canvas>

      ${isMobile ? `
        <div id="mobile-joystick" class="mobile-joystick" style="display:none;">
          <div class="joystick-base">
            <div class="joystick-knob"></div>
          </div>
        </div>
        <div id="mobile-look-area" class="mobile-look-area" style="display:none;"></div>
      ` : ''}

      <div class="artwork-popup" id="artwork-popup">
        <button class="artwork-popup__close" id="popup-close">\u2715</button>
        <div class="artwork-popup__image" id="popup-image"></div>
        <h3 class="artwork-popup__title" id="popup-title"></h3>
        <p class="artwork-popup__artist" id="popup-artist"></p>
        <p class="artwork-popup__desc" id="popup-desc"></p>
      </div>
    </div>
  `;

  // Template selection events
  content.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      content.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      s.selectedTemplateKey = card.dataset.template;
      if (s.scene && s.renderer) rebuildScene();
    });
  });

  // Wait for Three.js CDN
  if (typeof THREE === 'undefined') {
    const checkThree = setInterval(() => {
      if (typeof THREE !== 'undefined') {
        clearInterval(checkThree);
        initScene();
      }
    }, 100);
  } else {
    initScene();
  }

  return () => cleanup();
}

// ============================================================
// Scene Init
// ============================================================
function initScene() {
  const container = document.getElementById('gallery3d-container');
  const canvas = document.getElementById('gallery3d-canvas');
  if (!canvas || !container) return;

  s.currentTemplate = GALLERY_TEMPLATES[s.selectedTemplateKey];
  const T = s.currentTemplate;

  s.scene = new THREE.Scene();
  s.scene.background = new THREE.Color(T.colors.background);
  s.scene.fog = new THREE.Fog(T.fog.color, T.fog.near, T.fog.far);

  s.camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.1, 80);
  s.camera.position.set(0, EYE_HEIGHT, T.room.depth / 2 - 2);

  s.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  s.renderer.setSize(container.clientWidth, container.clientHeight);
  s.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  s.renderer.shadowMap.enabled = true;
  s.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  s.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  s.renderer.toneMappingExposure = T.lighting.toneExposure;

  s.clock = new THREE.Clock();

  // Setup minimap
  const minimapCanvas = document.getElementById('gallery3d-minimap');
  if (minimapCanvas) s.minimapCtx = minimapCanvas.getContext('2d');

  buildGallery(T);
  setupInputs(container);

  s.resizeHandler = () => {
    s.camera.aspect = container.clientWidth / container.clientHeight;
    s.camera.updateProjectionMatrix();
    s.renderer.setSize(container.clientWidth, container.clientHeight);
  };
  window.addEventListener('resize', s.resizeHandler);

  animate();

  // Tour button
  const tourBtn = document.getElementById('btn-tour');
  if (tourBtn) {
    tourBtn.addEventListener('click', () => {
      if (isTourActive()) {
        stopTour();
        tourBtn.textContent = '🚶 투어';
      } else {
        startTour();
        tourBtn.textContent = '⏹ 투어 중지';
      }
    });
  }
}

// ============================================================
// Rebuild when template changes
// ============================================================
function rebuildScene() {
  if (!s.scene) return;

  // Dispose everything
  s.scene.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
    }
  });
  s.scene.clear();

  s.artworkMeshes = [];
  s.colliders = [];

  s.currentTemplate = GALLERY_TEMPLATES[s.selectedTemplateKey];
  const T = s.currentTemplate;

  s.scene.background = new THREE.Color(T.colors.background);
  s.scene.fog = new THREE.Fog(T.fog.color, T.fog.near, T.fog.far);
  s.renderer.toneMappingExposure = T.lighting.toneExposure;

  s.camera.position.set(0, EYE_HEIGHT, T.room.depth / 2 - 2);
  s.yaw = 0; s.pitch = 0;
  s.velocity = { x: 0, z: 0 };

  buildGallery(T);
}

// ============================================================
// Cleanup
// ============================================================
function cleanup() {
  stopSlideshow();
  if (s.animationId) { cancelAnimationFrame(s.animationId); s.animationId = null; }
  removeInputListeners();
  if (s.resizeHandler) { window.removeEventListener('resize', s.resizeHandler); s.resizeHandler = null; }

  if (s.renderer) s.renderer.dispose();
  if (s.scene) {
    s.scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
      }
    });
  }

  s.moveForward = s.moveBackward = s.moveLeft = s.moveRight = false;
  s.isLocked = false;
  s.velocity = { x: 0, z: 0 };
  s.yaw = s.pitch = 0;
  s.artworkMeshes = [];
  s.colliders = [];
  s.currentTemplate = null;
  s.minimapCtx = null;
}
