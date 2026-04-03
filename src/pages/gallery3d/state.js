// ============================================================
// Gallery3D — Shared State & Collision Helpers
// ============================================================

export const DAMPING = 0.88;
export const PLAYER_RADIUS = 0.4;
export const EYE_HEIGHT = 1.65;
export const MOUSE_SENSITIVITY = 0.002;

// Single mutable state object — all modules import this
export const s = {
  // Three.js core
  scene: null,
  camera: null,
  renderer: null,
  clock: null,

  // Movement input
  moveForward: false,
  moveBackward: false,
  moveLeft: false,
  moveRight: false,

  // Camera state
  isLocked: false,
  velocity: { x: 0, z: 0 },
  yaw: 0,
  pitch: 0,

  // Loop & scene objects
  animationId: null,
  artworkMeshes: [],
  colliders: [],
  currentTemplate: null,
  selectedTemplateKey: 'modern-white',
  scaleMultiplier: 1.0,
  resizeHandler: null,
};

// ─── Collision helpers (used by scene.js, artworks.js, player.js) ───

export function addCollider(minX, maxX, minZ, maxZ) {
  s.colliders.push({ minX, maxX, minZ, maxZ });
}

export function checkCollision(x, z) {
  for (const b of s.colliders) {
    if (x + PLAYER_RADIUS > b.minX && x - PLAYER_RADIUS < b.maxX &&
        z + PLAYER_RADIUS > b.minZ && z - PLAYER_RADIUS < b.maxZ) {
      return true;
    }
  }
  return false;
}
