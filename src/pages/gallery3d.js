// ============================================================
// 3D Gallery Page — Three.js Immersive Exhibition
// Template-based architecture for switchable gallery designs
// Performance-optimized: reduced shadow maps, batched geometry
// ============================================================
import { getAllArtworks, generatePlaceholderImage } from '../data/sample-data.js';
import { isLoggedIn } from '../utils/auth.js';
import { navigateTo } from '../router.js';

// ============================================================
// Gallery Templates — Each defines the entire look & feel
// ============================================================
const GALLERY_TEMPLATES = {
  // ─── Modern White: Bright contemporary museum ───
  'modern-white': {
    name: '모던 화이트',
    icon: '🏛️',
    description: '밝고 깔끔한 현대 미술관',
    room: { width: 20, depth: 25, height: 5 },
    colors: {
      background: 0xf5f5f0, floor: 0xe8e4de, floorLine: 0xd5d0c8,
      wall: 0xfafaf8, wallAccent: 0xf0ede6, ceiling: 0xffffff,
      partition: 0xf2f0ea, pillar: 0xe8e5df,
      pedestal: 0xfafafa, pedestalTop: 0xffffff,
      frame: 0x3a3a3a, frameMat: 0xffffff,
      bench: 0xc8b898, namePlate: 0xf0ede6,
    },
    fog: { color: 0xf5f5f0, near: 20, far: 50 },
    moveSpeed: 3.5,
    lighting: {
      ambientColor: 0xfff8f0, ambientIntensity: 0.7,
      hemiGround: 0xf0ece0, hemiIntensity: 0.35,
      overheadColor: 0xffffff, overheadIntensity: 1.6,
      artSpotColor: 0xfffaf0, artSpotIntensity: 1.2,
      pedSpotColor: 0xfff5e8, pedSpotIntensity: 1.8,
      toneExposure: 1.5,
    },
    hasPedestals: true, pedestalCount: 3,
    hasPartition: true, hasBench: true, hasPillars: true,
  },

  // ─── Dark Luxury: High-end VIP gallery with dramatic lighting ───
  'dark-luxury': {
    name: '다크 럭셔리',
    icon: '🌙',
    description: '고급스러운 어두운 전시관',
    room: { width: 22, depth: 28, height: 6 },
    colors: {
      background: 0x0a0a14, floor: 0x15151f, floorLine: 0x1e1e30,
      wall: 0x12121e, wallAccent: 0x1a1a2a, ceiling: 0x0d0d18,
      partition: 0x18182a, pillar: 0x2a2a40,
      pedestal: 0x1a1a2e, pedestalTop: 0x222240,
      frame: 0xc9a96e, frameMat: 0x1a1a2e,
      bench: 0x2a2040, namePlate: 0x222235,
    },
    fog: { color: 0x0a0a14, near: 12, far: 45 },
    moveSpeed: 3.2,
    lighting: {
      ambientColor: 0x1a1a30, ambientIntensity: 0.15,
      hemiGround: 0x0a0a1a, hemiIntensity: 0.08,
      overheadColor: 0xfff0d0, overheadIntensity: 0.6,
      artSpotColor: 0xffebd0, artSpotIntensity: 2.5,
      pedSpotColor: 0xfff0d8, pedSpotIntensity: 3.0,
      toneExposure: 1.0,
    },
    hasPedestals: true, pedestalCount: 3,
    hasPartition: true, hasBench: true, hasPillars: true,
  },

  // ─── Kids Colorful: Bright, fun, rainbow-themed space ───
  'kids-colorful': {
    name: '키즈 컬러풀',
    icon: '🌈',
    description: '알록달록 즐거운 전시장',
    room: { width: 18, depth: 22, height: 4.5 },
    colors: {
      background: 0xfff8f0, floor: 0xffe8d8, floorLine: 0xf0d0b8,
      wall: 0xfff5ee, wallAccent: 0xffe0d0, ceiling: 0xffffff,
      partition: 0xffd0c0, pillar: 0xffb0a0,
      pedestal: 0xfff0e8, pedestalTop: 0xffffff,
      frame: 0xff6b6b, frameMat: 0xfff8f0,
      bench: 0xffb088, namePlate: 0xffe8d8,
    },
    fog: { color: 0xfff8f0, near: 15, far: 40 },
    moveSpeed: 3.0,
    lighting: {
      ambientColor: 0xfff0e8, ambientIntensity: 0.75,
      hemiGround: 0xffe0d0, hemiIntensity: 0.4,
      overheadColor: 0xffffff, overheadIntensity: 1.4,
      artSpotColor: 0xffffff, artSpotIntensity: 1.0,
      pedSpotColor: 0xfff0e0, pedSpotIntensity: 1.5,
      toneExposure: 1.4,
    },
    hasPedestals: true, pedestalCount: 4,
    hasPartition: false, hasBench: true, hasPillars: false,
  },
};

// ============================================================
// State
// ============================================================
let scene, camera, renderer, clock;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let isLocked = false;
let velocity = { x: 0, z: 0 };
let yaw = 0, pitch = 0;
let animationId = null;
let artworkMeshes = [];
let colliders = [];
let currentTemplate = null;
let selectedTemplateKey = 'modern-white';
let resizeHandler = null;

const DAMPING = 0.88;
const PLAYER_RADIUS = 0.4;
const EYE_HEIGHT = 1.65;
const MOUSE_SENSITIVITY = 0.002;

// ============================================================
// Export: Render Gallery Page
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
        <h2>🏛️ 3D 갤러리 입장</h2>

        <div class="gallery3d-template-select" id="template-select">
          <p class="template-select-label">전시 공간을 선택하세요</p>
          <div class="template-cards">
            ${templateKeys.map(key => {
              const t = GALLERY_TEMPLATES[key];
              return `
                <div class="template-card ${key === selectedTemplateKey ? 'active' : ''}"
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

      <div class="gallery3d-hud" id="gallery3d-hud" style="display:none;">
        <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 이동</span>
        <span>마우스: 둘러보기</span>
        <span><kbd>ESC</kbd> 메뉴</span>
      </div>

      <div class="artwork-popup" id="artwork-popup">
        <button class="artwork-popup__close" id="popup-close">✕</button>
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
      selectedTemplateKey = card.dataset.template;
      if (scene && renderer) rebuildScene();
    });
  });

  // Wait for Three.js
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

  currentTemplate = GALLERY_TEMPLATES[selectedTemplateKey];
  const T = currentTemplate;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(T.colors.background);
  scene.fog = new THREE.Fog(T.fog.color, T.fog.near, T.fog.far);

  camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.1, 80);
  camera.position.set(0, EYE_HEIGHT, T.room.depth / 2 - 2);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Cap for performance
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = T.lighting.toneExposure;

  clock = new THREE.Clock();

  buildGallery(T);
  setupInputs(container);

  resizeHandler = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  };
  window.addEventListener('resize', resizeHandler);

  animate();
}

// ============================================================
// Rebuild when template changes
// ============================================================
function rebuildScene() {
  if (!scene) return;

  // Dispose everything
  scene.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach(m => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    }
  });
  scene.clear();

  artworkMeshes = [];
  colliders = [];

  currentTemplate = GALLERY_TEMPLATES[selectedTemplateKey];
  const T = currentTemplate;

  scene.background = new THREE.Color(T.colors.background);
  scene.fog = new THREE.Fog(T.fog.color, T.fog.near, T.fog.far);
  renderer.toneMappingExposure = T.lighting.toneExposure;

  camera.position.set(0, EYE_HEIGHT, T.room.depth / 2 - 2);
  yaw = 0; pitch = 0;
  velocity = { x: 0, z: 0 };

  buildGallery(T);
}

// ============================================================
// Build entire gallery from template
// ============================================================
function buildGallery(T) {
  buildRoom(T);
  addLighting(T);
  placeArtworks(T);
  if (T.hasPedestals) placePedestals(T);
}

// ============================================================
// Room Construction
// ============================================================
function buildRoom(T) {
  const { width: W, depth: D, height: H } = T.room;
  const C = T.colors;

  // Floor
  const floorMat = new THREE.MeshStandardMaterial({ color: C.floor, roughness: 0.8, metalness: 0.02 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Subtle grid
  const grid = new THREE.GridHelper(Math.max(W, D), Math.max(W, D), C.floorLine, C.floorLine);
  grid.position.y = 0.005;
  grid.material.opacity = 0.12;
  grid.material.transparent = true;
  scene.add(grid);

  // Ceiling
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    new THREE.MeshStandardMaterial({ color: C.ceiling, roughness: 0.9 })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  scene.add(ceil);

  // Walls + colliders
  const wallMat = new THREE.MeshStandardMaterial({ color: C.wall, roughness: 0.65, metalness: 0.02 });
  addWall(W, H, 0, H / 2, -D / 2, 0, wallMat);
  addWall(W, H, 0, H / 2, D / 2, Math.PI, wallMat);
  addWall(D, H, -W / 2, H / 2, 0, Math.PI / 2, wallMat);
  addWall(D, H, W / 2, H / 2, 0, -Math.PI / 2, wallMat);
  addCollider(-W / 2 - 1, W / 2 + 1, -D / 2 - 1, -D / 2 + 0.15);
  addCollider(-W / 2 - 1, W / 2 + 1, D / 2 - 0.15, D / 2 + 1);
  addCollider(-W / 2 - 1, -W / 2 + 0.15, -D / 2, D / 2);
  addCollider(W / 2 - 0.15, W / 2 + 1, -D / 2, D / 2);

  // Baseboards
  const skirtMat = new THREE.MeshStandardMaterial({ color: C.wallAccent, roughness: 0.5 });
  const sk = 0.12;
  addBox(W, sk, 0.04, 0, sk / 2, -D / 2 + 0.02, skirtMat);
  addBox(W, sk, 0.04, 0, sk / 2, D / 2 - 0.02, skirtMat);
  addBox(0.04, sk, D, -W / 2 + 0.02, sk / 2, 0, skirtMat);
  addBox(0.04, sk, D, W / 2 - 0.02, sk / 2, 0, skirtMat);

  // Crown molding
  const crownMat = new THREE.MeshStandardMaterial({ color: C.wallAccent, roughness: 0.4, metalness: 0.05 });
  addBox(W, 0.06, 0.03, 0, H - 0.03, -D / 2 + 0.015, crownMat);
  addBox(W, 0.06, 0.03, 0, H - 0.03, D / 2 - 0.015, crownMat);
  addBox(0.03, 0.06, D, -W / 2 + 0.015, H - 0.03, 0, crownMat);
  addBox(0.03, 0.06, D, W / 2 - 0.015, H - 0.03, 0, crownMat);

  // Partition
  if (T.hasPartition) {
    const pMat = new THREE.MeshStandardMaterial({ color: C.partition, roughness: 0.6 });
    const pW = 6, pH = H * 0.65, pD = 0.18;
    const pZ = -D * 0.15;
    addBox(pW, pH, pD, 0, pH / 2, pZ, pMat);
    addBox(pW + 0.08, 0.04, pD + 0.04, 0, pH + 0.02, pZ,
      new THREE.MeshStandardMaterial({ color: C.pillar, roughness: 0.4, metalness: 0.1 }));
    addCollider(-pW / 2 - 0.25, pW / 2 + 0.25, pZ - pD / 2 - 0.25, pZ + pD / 2 + 0.25);
  }

  // Pillars
  if (T.hasPillars) {
    const pilGeo = new THREE.CylinderGeometry(0.15, 0.2, H, 8);
    const pilMat = new THREE.MeshStandardMaterial({ color: C.pillar, metalness: 0.12, roughness: 0.5 });
    const baseGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 8);
    const capGeo = new THREE.CylinderGeometry(0.28, 0.15, 0.08, 8);

    [[-W / 2 + 0.3, -D / 3], [W / 2 - 0.3, -D / 3],
     [-W / 2 + 0.3, D / 3],  [W / 2 - 0.3, D / 3]].forEach(([x, z]) => {
      scene.add(Object.assign(new THREE.Mesh(pilGeo, pilMat), { position: new THREE.Vector3(x, H / 2, z), castShadow: true }));
      scene.add(Object.assign(new THREE.Mesh(baseGeo, pilMat), { position: new THREE.Vector3(x, 0.04, z) }));
      scene.add(Object.assign(new THREE.Mesh(capGeo, pilMat), { position: new THREE.Vector3(x, H - 0.04, z) }));
      addCollider(x - 0.35, x + 0.35, z - 0.35, z + 0.35);
    });
  }

  // Bench
  if (T.hasBench) {
    const bMat = new THREE.MeshStandardMaterial({ color: C.bench, roughness: 0.5 });
    const bZ = D * 0.15;
    addBox(1.8, 0.06, 0.5, 0, 0.44, bZ, bMat, true);
    const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.42, 6);
    [[-0.7, -0.18], [-0.7, 0.18], [0.7, -0.18], [0.7, 0.18]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, bMat);
      leg.position.set(lx, 0.21, bZ + lz);
      scene.add(leg);
    });
    addCollider(-1.1, 1.1, bZ - 0.45, bZ + 0.45);
  }

  // ─── Template-specific decorations ───

  // Dark Luxury: add marble floor accents, golden trim
  if (selectedTemplateKey === 'dark-luxury') {
    // Reflective floor accent strip
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xc9a96e, metalness: 0.7, roughness: 0.2
    });
    addBox(W - 2, 0.01, 0.05, 0, 0.006, 0, accentMat);
    addBox(0.05, 0.01, D - 2, 0, 0.006, 0, accentMat);

    // Wall accent lights (small emissive rectangles)
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.3
    });
    for (let i = 0; i < 4; i++) {
      const zPos = -D / 2 + 3 + i * (D - 6) / 3;
      addBox(0.6, 0.02, 0.01, -W / 2 + 0.06, H * 0.75, zPos, glowMat);
      addBox(0.6, 0.02, 0.01, W / 2 - 0.06, H * 0.75, zPos, glowMat);
    }
  }

  // Kids Colorful: add rainbow arch, colorful floor circles
  if (selectedTemplateKey === 'kids-colorful') {
    // Colorful floor circles
    const circleColors = [0xff6b6b, 0xffa500, 0xffd700, 0x66cc66, 0x6699ff, 0xcc66ff];
    const circleGeo = new THREE.CircleGeometry(0.8, 16);
    circleColors.forEach((col, i) => {
      const mat = new THREE.MeshStandardMaterial({
        color: col, roughness: 0.9, transparent: true, opacity: 0.15
      });
      const circle = new THREE.Mesh(circleGeo, mat);
      circle.rotation.x = -Math.PI / 2;
      circle.position.set(
        (i % 3 - 1) * 4 + (Math.random() - 0.5) * 2,
        0.007,
        (Math.floor(i / 3) - 0.5) * 6
      );
      scene.add(circle);
    });

    // Small colorful cubes as decorations along walls
    const cubeGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    for (let i = 0; i < 8; i++) {
      const cMat = new THREE.MeshStandardMaterial({
        color: circleColors[i % circleColors.length], roughness: 0.6
      });
      const cube = new THREE.Mesh(cubeGeo, cMat);
      cube.position.set(
        -W / 2 + 1 + Math.random() * (W - 2),
        0.075,
        -D / 2 + 1 + Math.random() * (D - 2)
      );
      cube.rotation.y = Math.random() * Math.PI;
      cube.castShadow = true;
      scene.add(cube);
    }

    // Star shapes on ceiling (flat pentagons)
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.15,
      side: THREE.DoubleSide
    });
    for (let i = 0; i < 5; i++) {
      const star = createStarShape(0.3);
      const starMesh = new THREE.Mesh(star, starMat);
      starMesh.rotation.x = Math.PI / 2;
      starMesh.position.set(
        (Math.random() - 0.5) * (W - 4),
        H - 0.01,
        (Math.random() - 0.5) * (D - 4)
      );
      scene.add(starMesh);
    }
  }
}

// Create a star shape geometry
function createStarShape(radius) {
  const shape = new THREE.Shape();
  const points = 5;
  const inner = radius * 0.4;
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? radius : inner;
    if (i === 0) shape.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
    else shape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

// ============================================================
// Lighting — Optimized (fewer shadow-casting lights)
// ============================================================
function addLighting(T) {
  const { width: W, depth: D, height: H } = T.room;
  const L = T.lighting;

  // Ambient + Hemisphere
  scene.add(new THREE.AmbientLight(L.ambientColor, L.ambientIntensity));
  scene.add(new THREE.HemisphereLight(0xffffff, L.hemiGround, L.hemiIntensity));

  // Only 2 overhead spots (perf: shadow only on the main one)
  const overheadPositions = [
    [0, H - 0.2, -D * 0.25],
    [0, H - 0.2, D * 0.2],
  ];

  overheadPositions.forEach(([x, y, z], idx) => {
    const spot = new THREE.SpotLight(L.overheadColor, L.overheadIntensity, H * 5, Math.PI / 3, 0.7, 1);
    spot.position.set(x, y, z);
    spot.target.position.set(x, 0, z);
    // Only first overhead casts shadows (perf)
    if (idx === 0) {
      spot.castShadow = true;
      spot.shadow.mapSize.set(512, 512);
      spot.shadow.bias = -0.002;
    }
    scene.add(spot);
    scene.add(spot.target);

    // Track fixture visual
    const fGeo = new THREE.BoxGeometry(1.5, 0.04, 0.12);
    const fMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.5, roughness: 0.3 });
    const fixture = new THREE.Mesh(fGeo, fMat);
    fixture.position.set(x, H - 0.03, z);
    scene.add(fixture);

    // Downlight cylinders
    [-0.4, 0, 0.4].forEach(xo => {
      const dl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.05, 0.06, 6),
        new THREE.MeshStandardMaterial({ color: 0xc0c0c0, emissive: L.overheadColor, emissiveIntensity: 0.3 })
      );
      dl.position.set(x + xo, H - 0.07, z);
      scene.add(dl);
    });
  });

  // Dark Luxury extra: colored accent point lights
  if (selectedTemplateKey === 'dark-luxury') {
    const accentPositions = [
      [-W / 2 + 1, 1, -D / 3],
      [W / 2 - 1, 1, D / 3],
    ];
    accentPositions.forEach(([x, y, z]) => {
      const pl = new THREE.PointLight(0x7c5cfc, 0.3, 8, 2);
      pl.position.set(x, y, z);
      scene.add(pl);
    });
  }

  // Kids Colorful extra: warm colored point lights
  if (selectedTemplateKey === 'kids-colorful') {
    const kidColors = [0xff6b6b, 0x66cc66, 0x6699ff];
    kidColors.forEach((col, i) => {
      const pl = new THREE.PointLight(col, 0.2, 10, 2);
      pl.position.set((i - 1) * 5, 2, 0);
      scene.add(pl);
    });
  }
}

// ============================================================
// Artworks on Walls
// ============================================================
function placeArtworks(T) {
  const allArtworks = getAllArtworks();
  const { width: W, depth: D, height: H } = T.room;
  artworkMeshes = [];

  const positions = [];

  // Left wall
  const leftCount = Math.ceil(allArtworks.length / 3);
  for (let i = 0; i < leftCount && i < allArtworks.length; i++) {
    const sp = (D - 4) / leftCount;
    positions.push({
      x: -W / 2 + 0.1, y: 1.5,
      z: -D / 2 + 2 + i * sp + sp / 2,
      rotY: Math.PI / 2, artwork: allArtworks[i]
    });
  }

  // Right wall
  const rightCount = Math.ceil(allArtworks.length / 3);
  for (let i = 0; i < rightCount && leftCount + i < allArtworks.length; i++) {
    const sp = (D - 4) / rightCount;
    positions.push({
      x: W / 2 - 0.1, y: 1.5,
      z: -D / 2 + 2 + i * sp + sp / 2,
      rotY: -Math.PI / 2, artwork: allArtworks[leftCount + i]
    });
  }

  // Back wall
  const bStart = leftCount + rightCount;
  const bCount = allArtworks.length - bStart;
  for (let i = 0; i < bCount; i++) {
    const sp = (W - 4) / Math.max(bCount, 1);
    positions.push({
      x: -W / 2 + 2 + i * sp + sp / 2, y: 1.5,
      z: -D / 2 + 0.1, rotY: 0,
      artwork: allArtworks[bStart + i]
    });
  }

  positions.forEach(p => createArtworkFrame(p.x, p.y, p.z, p.rotY, p.artwork, T));
}

function createArtworkFrame(x, y, z, rotY, artData, T) {
  const C = T.colors;
  const group = new THREE.Group();

  const fW = 1.6, fH = 1.2, fD = 0.035;

  // Frame
  const fMat = new THREE.MeshStandardMaterial({ color: C.frame, metalness: 0.25, roughness: 0.5 });
  group.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(fW + 0.06, fH + 0.06, fD), fMat), { castShadow: true }));

  // Mat
  group.add(Object.assign(
    new THREE.Mesh(
      new THREE.BoxGeometry(fW, fH, fD + 0.003),
      new THREE.MeshStandardMaterial({ color: C.frameMat, roughness: 0.9 })
    ),
    { position: new THREE.Vector3(0, 0, 0.003) }
  ));

  // Canvas texture
  const cvs = document.createElement('canvas');
  cvs.width = 512; cvs.height = 384;
  const ctx = cvs.getContext('2d');
  const col = artData.color || '#7c5cfc';
  const grad = ctx.createLinearGradient(0, 0, 512, 384);
  grad.addColorStop(0, col);
  grad.addColorStop(1, shiftColor(col, 40));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 384);

  ctx.globalAlpha = 0.1;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 512, Math.random() * 384, 15 + Math.random() * 40, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 6;
  ctx.fillText(artData.title, 256, 185);
  ctx.font = '14px sans-serif';
  ctx.fillText(artData.artistName, 256, 215);

  const tex = new THREE.CanvasTexture(cvs);
  tex.minFilter = THREE.LinearFilter;

  const artMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(fW - 0.18, fH - 0.18),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 })
  );
  artMesh.position.z = fD / 2 + 0.008;
  group.add(artMesh);

  // Name plate
  group.add(Object.assign(
    new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.12, 0.015),
      new THREE.MeshStandardMaterial({ color: C.namePlate, metalness: 0.15, roughness: 0.5 })
    ),
    { position: new THREE.Vector3(0, -(fH / 2 + 0.16), 0.015) }
  ));

  group.position.set(x, y, z);
  group.rotation.y = rotY;

  // Per-artwork SpotLight (NO shadow for perf — shadows only on overhead)
  const spotDir = new THREE.Vector3(0, 1.2, 0.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
  const spot = new THREE.SpotLight(T.lighting.artSpotColor, T.lighting.artSpotIntensity, 5, Math.PI / 7, 0.6, 1.5);
  spot.position.set(x + spotDir.x, y + spotDir.y, z + spotDir.z);
  spot.target.position.set(x, y, z);
  scene.add(spot);
  scene.add(spot.target);

  group.userData = { artworkData: artData, isArtwork: true };
  artMesh.userData = { artworkData: artData, isArtwork: true };
  artworkMeshes.push(artMesh);
  scene.add(group);
}

// ============================================================
// Pedestals with 3D Sculptures
// ============================================================
function placePedestals(T) {
  const { width: W, depth: D, height: H } = T.room;
  const C = T.colors;
  const count = T.pedestalCount || 3;

  const positions = [];
  if (count >= 1) positions.push({ x: -3, z: D * 0.08 });
  if (count >= 2) positions.push({ x: 3, z: -D * 0.06 });
  if (count >= 3) positions.push({ x: 0, z: D * 0.3 });
  if (count >= 4) positions.push({ x: -2, z: -D * 0.28 });

  const allArt = getAllArtworks();

  positions.forEach((pos, i) => {
    const pH = 0.9, pW = 0.45;

    // Pedestal body
    const pedMat = new THREE.MeshStandardMaterial({ color: C.pedestal, roughness: 0.3, metalness: 0.05 });
    const ped = new THREE.Mesh(new THREE.BoxGeometry(pW, pH, pW), pedMat);
    ped.position.set(pos.x, pH / 2, pos.z);
    ped.castShadow = true;
    ped.receiveShadow = true;
    scene.add(ped);

    // Top plate
    const topMat = new THREE.MeshStandardMaterial({ color: C.pedestalTop, roughness: 0.2, metalness: 0.08 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(pW + 0.06, 0.03, pW + 0.06), topMat);
    top.position.set(pos.x, pH + 0.015, pos.z);
    top.receiveShadow = true;
    scene.add(top);

    // Sculpture
    const artData = allArt[i % allArt.length];
    const sculpture = createSculpture(artData, i);
    sculpture.position.set(pos.x, pH + 0.03, pos.z);
    sculpture.userData = { artworkData: artData, isArtwork: true };
    artworkMeshes.push(sculpture);
    scene.add(sculpture);

    // Pedestal spotlight (shadow only on first one for perf)
    const pedSpot = new THREE.SpotLight(T.lighting.pedSpotColor, T.lighting.pedSpotIntensity, 7, Math.PI / 8, 0.5, 1);
    pedSpot.position.set(pos.x, H - 0.15, pos.z);
    pedSpot.target.position.set(pos.x, pH, pos.z);
    if (i === 0) {
      pedSpot.castShadow = true;
      pedSpot.shadow.mapSize.set(256, 256);
    }
    scene.add(pedSpot);
    scene.add(pedSpot.target);

    addCollider(pos.x - 0.55, pos.x + 0.55, pos.z - 0.55, pos.z + 0.55);
  });
}

function createSculpture(artData, index) {
  const col = artData.color || '#7c5cfc';
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(col), roughness: 0.35, metalness: 0.12 });
  const mat2 = mat.clone();
  mat2.color = new THREE.Color(shiftColor(col, 35));

  const g = new THREE.Group();
  const type = index % 4;

  if (type === 0) {
    // Sphere cluster
    const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), mat);
    s1.position.y = 0.16; s1.castShadow = true;
    const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), mat2);
    s2.position.set(0.13, 0.32, 0.04); s2.castShadow = true;
    const s3 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), mat2);
    s3.position.set(-0.08, 0.38, -0.04); s3.castShadow = true;
    g.add(s1, s2, s3);
  } else if (type === 1) {
    // Column + sphere on top
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.4, 8), mat);
    c.position.y = 0.2; c.castShadow = true;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), mat2);
    b.position.y = 0.48; b.castShadow = true;
    g.add(c, b);
  } else if (type === 2) {
    // Torus
    const tor = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.05, 10, 20), mat);
    tor.position.y = 0.18; tor.rotation.x = Math.PI / 4; tor.castShadow = true;
    g.add(tor);
  } else {
    // Stacked cubes
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), mat);
    c1.position.y = 0.09; c1.rotation.y = Math.PI / 6; c1.castShadow = true;
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), mat2);
    c2.position.y = 0.24; c2.rotation.y = Math.PI / 3; c2.castShadow = true;
    g.add(c1, c2);
  }
  g.userData = { artworkData: artData, isArtwork: true };
  return g;
}

// ============================================================
// Collision
// ============================================================
function addCollider(minX, maxX, minZ, maxZ) {
  colliders.push({ minX, maxX, minZ, maxZ });
}

function checkCollision(x, z) {
  for (const b of colliders) {
    if (x + PLAYER_RADIUS > b.minX && x - PLAYER_RADIUS < b.maxX &&
        z + PLAYER_RADIUS > b.minZ && z - PLAYER_RADIUS < b.maxZ) {
      return true;
    }
  }
  return false;
}

// ============================================================
// Input
// ============================================================
function setupInputs(container) {
  const overlay = document.getElementById('gallery3d-overlay');
  const hud = document.getElementById('gallery3d-hud');

  if (overlay) {
    overlay.addEventListener('click', e => {
      if (e.target.closest('.template-card') || e.target.closest('.template-cards')) return;
      container.requestPointerLock?.();
    });
  }

  const lockChange = () => {
    isLocked = document.pointerLockElement === container;
    if (overlay) overlay.classList.toggle('hidden', isLocked);
    if (hud) hud.style.display = isLocked ? 'flex' : 'none';
  };
  document.addEventListener('pointerlockchange', lockChange);

  document.addEventListener('mousemove', e => {
    if (!isLocked) return;
    yaw -= e.movementX * MOUSE_SENSITIVITY;
    pitch -= e.movementY * MOUSE_SENSITIVITY;
    pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch));
  });

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  const raycaster = new THREE.Raycaster();
  raycaster.far = 5;

  container.addEventListener('click', () => {
    if (!isLocked) return;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObjects(artworkMeshes, true);
    if (hits.length > 0) {
      let ad = hits[0].object.userData.artworkData;
      if (!ad) {
        let p = hits[0].object.parent;
        while (p && !p.userData?.artworkData) p = p.parent;
        if (p) ad = p.userData.artworkData;
      }
      if (ad) showArtworkPopup(ad);
    }
  });
}

function onKeyDown(e) {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp':    moveForward = true; break;
    case 'KeyS': case 'ArrowDown':  moveBackward = true; break;
    case 'KeyA': case 'ArrowLeft':  moveLeft = true; break;
    case 'KeyD': case 'ArrowRight': moveRight = true; break;
  }
}
function onKeyUp(e) {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp':    moveForward = false; break;
    case 'KeyS': case 'ArrowDown':  moveBackward = false; break;
    case 'KeyA': case 'ArrowLeft':  moveLeft = false; break;
    case 'KeyD': case 'ArrowRight': moveRight = false; break;
  }
}

function showArtworkPopup(artwork) {
  document.exitPointerLock();
  const popup = document.getElementById('artwork-popup');
  document.getElementById('popup-image').style.cssText =
    `background-image:url(${generatePlaceholderImage(artwork.color, artwork.title)});background-size:cover;background-position:center;`;
  document.getElementById('popup-title').textContent = artwork.title;
  document.getElementById('popup-artist').textContent = `👧 ${artwork.artistName}`;
  document.getElementById('popup-desc').textContent = artwork.description;
  popup.classList.add('show');
  document.getElementById('popup-close').onclick = () => popup.classList.remove('show');
}

// ============================================================
// Animation Loop
// ============================================================
function animate() {
  animationId = requestAnimationFrame(animate);
  if (!currentTemplate) return;

  const delta = Math.min(clock.getDelta(), 0.05); // Cap delta to prevent jumps

  if (isLocked) {
    const dir = new THREE.Vector3();
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

    if (moveForward) dir.add(fwd);
    if (moveBackward) dir.sub(fwd);
    if (moveLeft) dir.sub(right);
    if (moveRight) dir.add(right);

    dir.normalize().multiplyScalar(currentTemplate.moveSpeed * delta);
    velocity.x += dir.x;
    velocity.z += dir.z;
    velocity.x *= DAMPING;
    velocity.z *= DAMPING;

    // Axis-separated collision (sliding)
    const nx = camera.position.x + velocity.x;
    if (!checkCollision(nx, camera.position.z)) camera.position.x = nx;
    else velocity.x = 0;

    const nz = camera.position.z + velocity.z;
    if (!checkCollision(camera.position.x, nz)) camera.position.z = nz;
    else velocity.z = 0;

    camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
  }

  renderer.render(scene, camera);
}

// ============================================================
// Helpers
// ============================================================
function addWall(w, h, x, y, z, rY, mat) {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  wall.position.set(x, y, z);
  wall.rotation.y = rY;
  wall.receiveShadow = true;
  scene.add(wall);
}

function addBox(w, h, d, x, y, z, mat, shadow = false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  if (shadow) { mesh.castShadow = true; mesh.receiveShadow = true; }
  scene.add(mesh);
}

function shiftColor(hex, amt) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255, r + amt)},${Math.min(255, g + amt / 2)},${Math.min(255, b + amt / 3)})`;
}

// ============================================================
// Cleanup
// ============================================================
function cleanup() {
  if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('keyup', onKeyUp);
  if (resizeHandler) { window.removeEventListener('resize', resizeHandler); resizeHandler = null; }

  if (renderer) renderer.dispose();
  if (scene) {
    scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
      }
    });
  }

  moveForward = moveBackward = moveLeft = moveRight = false;
  isLocked = false;
  velocity = { x: 0, z: 0 };
  yaw = pitch = 0;
  artworkMeshes = [];
  colliders = [];
  currentTemplate = null;
}
