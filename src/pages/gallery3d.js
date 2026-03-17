// ============================================================
// 3D Gallery Page — Three.js Immersive Exhibition
// ============================================================
import { getAllArtworks, generatePlaceholderImage } from '../data/sample-data.js';
import { isLoggedIn } from '../utils/auth.js';
import { navigateTo } from '../router.js';

let scene, camera, renderer, clock;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let isLocked = false;
let velocity = { x: 0, z: 0 };
let yaw = 0, pitch = 0;
let animationId = null;
let artworkMeshes = [];

const MOVE_SPEED = 8;
const DAMPING = 0.85;
const ROOM_WIDTH = 40;
const ROOM_DEPTH = 50;
const ROOM_HEIGHT = 8;

export function renderGallery3D() {
  if (!isLoggedIn()) {
    navigateTo('/login');
    return;
  }

  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="gallery3d-page" id="gallery3d-container">
      <canvas class="gallery3d-canvas" id="gallery3d-canvas"></canvas>

      <div class="gallery3d-overlay" id="gallery3d-overlay">
        <h2>🏛️ 3D 갤러리 입장</h2>
        <p>클릭하여 갤러리에 입장하세요</p>
        <p style="margin-top: 12px; font-size: 0.85rem;">
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

  // Wait for Three.js to load from CDN
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

  // Return cleanup function
  return () => {
    cleanup();
  };
}

function initScene() {
  const container = document.getElementById('gallery3d-container');
  const canvas = document.getElementById('gallery3d-canvas');
  if (!canvas || !container) return;

  // Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  scene.fog = new THREE.Fog(0x1a1a2e, 15, 55);

  // Camera
  camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 2, ROOM_DEPTH / 2 - 3);

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  clock = new THREE.Clock();

  // Build environment
  buildRoom();
  addLighting();
  placeArtworks();

  // Input
  setupInputs(container);

  // Resize
  const resizeHandler = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  };
  window.addEventListener('resize', resizeHandler);

  // Start animation loop
  animate();
}

function buildRoom() {
  const textureLoader = new THREE.TextureLoader();

  // Floor
  const floorGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x1e1e30,
    roughness: 0.8,
    metalness: 0.1
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Floor grid lines
  const gridHelper = new THREE.GridHelper(ROOM_WIDTH, 40, 0x2a2a4a, 0x2a2a4a);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);

  // Ceiling
  const ceilGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x16162a, roughness: 0.9 });
  const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM_HEIGHT;
  scene.add(ceiling);

  // Walls
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x22223b,
    roughness: 0.7,
    metalness: 0.05
  });

  // Back wall
  addWall(ROOM_WIDTH, ROOM_HEIGHT, 0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2, 0, wallMaterial);
  // Front wall
  addWall(ROOM_WIDTH, ROOM_HEIGHT, 0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2, Math.PI, wallMaterial);
  // Left wall
  addWall(ROOM_DEPTH, ROOM_HEIGHT, -ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0, Math.PI / 2, wallMaterial);
  // Right wall
  addWall(ROOM_DEPTH, ROOM_HEIGHT, ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0, -Math.PI / 2, wallMaterial);

  // Center partition walls for more exhibition space
  const partWallMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a45,
    roughness: 0.7
  });

  // Two central partition walls
  addWall(12, ROOM_HEIGHT * 0.7, -5, (ROOM_HEIGHT * 0.7) / 2, -8, 0, partWallMat);
  addWall(12, ROOM_HEIGHT * 0.7, 5, (ROOM_HEIGHT * 0.7) / 2, 8, 0, partWallMat);

  // Decorative arches / pillars
  const pillarGeo = new THREE.CylinderGeometry(0.25, 0.3, ROOM_HEIGHT, 8);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x3d3d5c, metalness: 0.3, roughness: 0.5 });
  const pillarPositions = [
    [-ROOM_WIDTH/2 + 0.3, 0], [ROOM_WIDTH/2 - 0.3, 0],
    [-ROOM_WIDTH/2 + 0.3, -ROOM_DEPTH/3], [ROOM_WIDTH/2 - 0.3, -ROOM_DEPTH/3],
    [-ROOM_WIDTH/2 + 0.3, ROOM_DEPTH/3], [ROOM_WIDTH/2 - 0.3, ROOM_DEPTH/3],
  ];
  pillarPositions.forEach(([x, z]) => {
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(x, ROOM_HEIGHT / 2, z);
    pillar.castShadow = true;
    scene.add(pillar);
  });

  // Bench in center
  const benchGeo = new THREE.BoxGeometry(3, 0.4, 1);
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x4a3f6b, roughness: 0.6 });
  const bench = new THREE.Mesh(benchGeo, benchMat);
  bench.position.set(0, 0.2, 0);
  bench.castShadow = true;
  scene.add(bench);
  const benchLeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.8), benchMat);
  benchLeg1.position.set(-1.2, 0.2, 0);
  scene.add(benchLeg1);
  const benchLeg2 = benchLeg1.clone();
  benchLeg2.position.set(1.2, 0.2, 0);
  scene.add(benchLeg2);
}

function addWall(width, height, x, y, z, rotY, material) {
  const geo = new THREE.PlaneGeometry(width, height);
  const wall = new THREE.Mesh(geo, material);
  wall.position.set(x, y, z);
  wall.rotation.y = rotY;
  wall.receiveShadow = true;
  scene.add(wall);
  return wall;
}

function addLighting() {
  // Ambient
  const ambient = new THREE.AmbientLight(0x404060, 0.5);
  scene.add(ambient);

  // Main overhead lights
  const positions = [
    [0, ROOM_HEIGHT - 0.5, -ROOM_DEPTH / 3],
    [0, ROOM_HEIGHT - 0.5, 0],
    [0, ROOM_HEIGHT - 0.5, ROOM_DEPTH / 3],
  ];

  positions.forEach(([x, y, z]) => {
    const spotLight = new THREE.SpotLight(0xfff5e0, 1.5, 30, Math.PI / 4, 0.5, 1);
    spotLight.position.set(x, y, z);
    spotLight.target.position.set(x, 0, z);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.set(512, 512);
    scene.add(spotLight);
    scene.add(spotLight.target);

    // Light fixture visual
    const fixtureGeo = new THREE.CylinderGeometry(0.2, 0.4, 0.3, 8);
    const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x666680, emissive: 0x222240, emissiveIntensity: 0.5 });
    const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
    fixture.position.set(x, y + 0.15, z);
    scene.add(fixture);
  });

  // Spot lights on walls (for artwork highlighting)
  const wallSpots = [
    { pos: [-ROOM_WIDTH/2 + 2, ROOM_HEIGHT - 1, -15], target: [-ROOM_WIDTH/2 + 0.1, 2.5, -15] },
    { pos: [-ROOM_WIDTH/2 + 2, ROOM_HEIGHT - 1, -5], target: [-ROOM_WIDTH/2 + 0.1, 2.5, -5] },
    { pos: [-ROOM_WIDTH/2 + 2, ROOM_HEIGHT - 1, 5], target: [-ROOM_WIDTH/2 + 0.1, 2.5, 5] },
    { pos: [-ROOM_WIDTH/2 + 2, ROOM_HEIGHT - 1, 15], target: [-ROOM_WIDTH/2 + 0.1, 2.5, 15] },
    { pos: [ROOM_WIDTH/2 - 2, ROOM_HEIGHT - 1, -15], target: [ROOM_WIDTH/2 - 0.1, 2.5, -15] },
    { pos: [ROOM_WIDTH/2 - 2, ROOM_HEIGHT - 1, -5], target: [ROOM_WIDTH/2 - 0.1, 2.5, -5] },
    { pos: [ROOM_WIDTH/2 - 2, ROOM_HEIGHT - 1, 5], target: [ROOM_WIDTH/2 - 0.1, 2.5, 5] },
    { pos: [ROOM_WIDTH/2 - 2, ROOM_HEIGHT - 1, 15], target: [ROOM_WIDTH/2 - 0.1, 2.5, 15] },
  ];

  wallSpots.forEach(({ pos, target }) => {
    const spot = new THREE.SpotLight(0xfff0d0, 0.8, 15, Math.PI / 6, 0.6, 1.5);
    spot.position.set(...pos);
    spot.target.position.set(...target);
    scene.add(spot);
    scene.add(spot.target);
  });
}

function placeArtworks() {
  const allArtworks = getAllArtworks();
  artworkMeshes = [];

  // Distribute artworks along walls
  const positions = [];

  // Left wall artworks
  const leftCount = Math.ceil(allArtworks.length / 3);
  for (let i = 0; i < leftCount && i < allArtworks.length; i++) {
    const zSpacing = (ROOM_DEPTH - 8) / leftCount;
    positions.push({
      x: -ROOM_WIDTH / 2 + 0.15,
      y: 2.8,
      z: -ROOM_DEPTH / 2 + 4 + i * zSpacing,
      rotY: Math.PI / 2,
      artwork: allArtworks[i]
    });
  }

  // Right wall artworks
  const rightCount = Math.ceil(allArtworks.length / 3);
  for (let i = 0; i < rightCount && leftCount + i < allArtworks.length; i++) {
    const zSpacing = (ROOM_DEPTH - 8) / rightCount;
    positions.push({
      x: ROOM_WIDTH / 2 - 0.15,
      y: 2.8,
      z: -ROOM_DEPTH / 2 + 4 + i * zSpacing,
      rotY: -Math.PI / 2,
      artwork: allArtworks[leftCount + i]
    });
  }

  // Back wall
  const backStart = leftCount + rightCount;
  const backCount = allArtworks.length - backStart;
  for (let i = 0; i < backCount; i++) {
    const xSpacing = (ROOM_WIDTH - 8) / Math.max(backCount, 1);
    positions.push({
      x: -ROOM_WIDTH / 2 + 4 + i * xSpacing,
      y: 2.8,
      z: -ROOM_DEPTH / 2 + 0.15,
      rotY: 0,
      artwork: allArtworks[backStart + i]
    });
  }

  positions.forEach(({ x, y, z, rotY, artwork }) => {
    createArtworkFrame(x, y, z, rotY, artwork);
  });
}

function createArtworkFrame(x, y, z, rotY, artworkData) {
  const group = new THREE.Group();

  // Frame
  const frameWidth = 3;
  const frameHeight = 2.2;
  const frameDepth = 0.12;

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xc9a96e,
    metalness: 0.6,
    roughness: 0.3
  });

  // Outer frame
  const outerGeo = new THREE.BoxGeometry(frameWidth + 0.2, frameHeight + 0.2, frameDepth);
  const outerFrame = new THREE.Mesh(outerGeo, frameMat);
  outerFrame.castShadow = true;
  group.add(outerFrame);

  // Inner mat (white border)
  const matGeo = new THREE.BoxGeometry(frameWidth, frameHeight, frameDepth + 0.01);
  const matMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.9 });
  const mat = new THREE.Mesh(matGeo, matMat);
  mat.position.z = 0.01;
  group.add(mat);

  // Artwork canvas
  const canvasEl = document.createElement('canvas');
  canvasEl.width = 512;
  canvasEl.height = 384;
  const ctx = canvasEl.getContext('2d');

  // Draw artwork placeholder
  const grad = ctx.createLinearGradient(0, 0, 512, 384);
  const color = artworkData.color || '#7c5cfc';
  grad.addColorStop(0, color);
  grad.addColorStop(1, shiftColor(color, 50));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 384);

  // Add decorative elements
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.arc(
      Math.random() * 512,
      Math.random() * 384,
      20 + Math.random() * 60,
      0, Math.PI * 2
    );
    ctx.fillStyle = '#fff';
    ctx.fill();
  }

  // Title on canvas
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 10;
  ctx.fillText(artworkData.title, 256, 200);

  ctx.font = '18px sans-serif';
  ctx.fillText(artworkData.artistName, 256, 240);

  const texture = new THREE.CanvasTexture(canvasEl);
  texture.minFilter = THREE.LinearFilter;

  const artGeo = new THREE.PlaneGeometry(frameWidth - 0.4, frameHeight - 0.4);
  const artMat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.5,
    metalness: 0.05
  });
  const artMesh = new THREE.Mesh(artGeo, artMat);
  artMesh.position.z = frameDepth / 2 + 0.02;
  group.add(artMesh);

  // Name plate below frame
  const plateGeo = new THREE.BoxGeometry(1.8, 0.3, 0.05);
  const plateMat = new THREE.MeshStandardMaterial({ color: 0x2a2a40, metalness: 0.4, roughness: 0.5 });
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.position.y = -(frameHeight / 2 + 0.3);
  plate.position.z = 0.05;
  group.add(plate);

  group.position.set(x, y, z);
  group.rotation.y = rotY;

  // Store artwork data for interaction
  group.userData = { artworkData, isArtwork: true };
  artMesh.userData = { artworkData, isArtwork: true };

  artworkMeshes.push(artMesh);
  scene.add(group);
}

function shiftColor(hex, amount) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.min(255, r + amount);
  g = Math.min(255, g + amount / 2);
  b = Math.min(255, b + amount / 3);
  return `rgb(${r},${g},${b})`;
}

function setupInputs(container) {
  // Overlay click to start
  const overlay = document.getElementById('gallery3d-overlay');
  const hud = document.getElementById('gallery3d-hud');

  if (overlay) {
    overlay.addEventListener('click', () => {
      container.requestPointerLock?.() ||
        container.mozRequestPointerLock?.() ||
        container.webkitRequestPointerLock?.();
    });
  }

  // Pointer lock
  const lockChange = () => {
    isLocked = document.pointerLockElement === container;
    if (overlay) overlay.classList.toggle('hidden', isLocked);
    if (hud) hud.style.display = isLocked ? 'flex' : 'none';
  };

  document.addEventListener('pointerlockchange', lockChange);
  document.addEventListener('mozpointerlockchange', lockChange);

  // Mouse movement
  document.addEventListener('mousemove', (e) => {
    if (!isLocked) return;
    yaw -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;
    pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch));
  });

  // Keyboard
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // Click on artwork
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  container.addEventListener('click', (e) => {
    if (!isLocked) return;
    mouse.x = 0; // Center of screen when pointer locked
    mouse.y = 0;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(artworkMeshes, false);

    if (intersects.length > 0 && intersects[0].distance < 6) {
      const artwork = intersects[0].object.userData.artworkData;
      if (artwork) showArtworkPopup(artwork);
    }
  });
}

function onKeyDown(e) {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp': moveForward = true; break;
    case 'KeyS': case 'ArrowDown': moveBackward = true; break;
    case 'KeyA': case 'ArrowLeft': moveLeft = true; break;
    case 'KeyD': case 'ArrowRight': moveRight = true; break;
  }
}

function onKeyUp(e) {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp': moveForward = false; break;
    case 'KeyS': case 'ArrowDown': moveBackward = false; break;
    case 'KeyA': case 'ArrowLeft': moveLeft = false; break;
    case 'KeyD': case 'ArrowRight': moveRight = false; break;
  }
}

function showArtworkPopup(artwork) {
  document.exitPointerLock();

  const popup = document.getElementById('artwork-popup');
  const imageEl = document.getElementById('popup-image');
  const titleEl = document.getElementById('popup-title');
  const artistEl = document.getElementById('popup-artist');
  const descEl = document.getElementById('popup-desc');

  // Generate placeholder image
  const img = generatePlaceholderImage(artwork.color, artwork.title);
  imageEl.style.backgroundImage = `url(${img})`;
  imageEl.style.backgroundSize = 'cover';
  imageEl.style.backgroundPosition = 'center';

  titleEl.textContent = artwork.title;
  artistEl.textContent = `👧 ${artwork.artistName}`;
  descEl.textContent = artwork.description;

  popup.classList.add('show');

  document.getElementById('popup-close').onclick = () => {
    popup.classList.remove('show');
  };
}

function animate() {
  animationId = requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (isLocked) {
    // Movement
    const direction = new THREE.Vector3();
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

    if (moveForward) direction.add(forward);
    if (moveBackward) direction.sub(forward);
    if (moveLeft) direction.sub(right);
    if (moveRight) direction.add(right);

    direction.normalize().multiplyScalar(MOVE_SPEED * delta);

    velocity.x += direction.x;
    velocity.z += direction.z;
    velocity.x *= DAMPING;
    velocity.z *= DAMPING;

    camera.position.x += velocity.x;
    camera.position.z += velocity.z;

    // Collision boundaries
    const margin = 1.5;
    camera.position.x = Math.max(-ROOM_WIDTH/2 + margin, Math.min(ROOM_WIDTH/2 - margin, camera.position.x));
    camera.position.z = Math.max(-ROOM_DEPTH/2 + margin, Math.min(ROOM_DEPTH/2 - margin, camera.position.z));

    // Camera rotation
    const euler = new THREE.Euler(pitch, yaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);
  }

  renderer.render(scene, camera);
}

function cleanup() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('keyup', onKeyUp);

  if (renderer) {
    renderer.dispose();
  }
  if (scene) {
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }

  moveForward = moveBackward = moveLeft = moveRight = false;
  isLocked = false;
  velocity = { x: 0, z: 0 };
  yaw = pitch = 0;
  artworkMeshes = [];
}
