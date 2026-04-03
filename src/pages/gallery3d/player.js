// ============================================================
// Gallery3D — Player Input, Movement & Animation Loop
// ============================================================
import { s, DAMPING, MOUSE_SENSITIVITY, EYE_HEIGHT, checkCollision } from './state.js';
import { showArtworkPopup } from './artworks.js';

// ─── Setup all input handlers ───────────────────────────────
export function setupInputs(container) {
  const overlay = document.getElementById('gallery3d-overlay');
  const hud = document.getElementById('gallery3d-hud');
  const canvas = document.getElementById('gallery3d-canvas');

  if (overlay && canvas) {
    overlay.addEventListener('click', e => {
      if (e.target.closest('.template-card') || e.target.closest('.template-cards')) return;
      canvas.requestPointerLock?.();
    });
  }

  const lockChange = () => {
    s.isLocked = document.pointerLockElement === canvas;
    if (overlay) overlay.classList.toggle('hidden', s.isLocked);
    if (hud) hud.style.display = s.isLocked ? 'flex' : 'none';
  };
  document.addEventListener('pointerlockchange', lockChange);

  document.addEventListener('mousemove', e => {
    if (!s.isLocked) return;
    s.yaw -= e.movementX * MOUSE_SENSITIVITY;
    s.pitch -= e.movementY * MOUSE_SENSITIVITY;
    s.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, s.pitch));
  });

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // Raycaster for artwork clicks
  const raycaster = new THREE.Raycaster();
  raycaster.far = 5;
  canvas.addEventListener('click', () => {
    if (!s.isLocked) return;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), s.camera);
    const hits = raycaster.intersectObjects(s.artworkMeshes, true);
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
    case 'KeyW': case 'ArrowUp':    s.moveForward = true; break;
    case 'KeyS': case 'ArrowDown':  s.moveBackward = true; break;
    case 'KeyA': case 'ArrowLeft':  s.moveLeft = true; break;
    case 'KeyD': case 'ArrowRight': s.moveRight = true; break;
  }
}

function onKeyUp(e) {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp':    s.moveForward = false; break;
    case 'KeyS': case 'ArrowDown':  s.moveBackward = false; break;
    case 'KeyA': case 'ArrowLeft':  s.moveLeft = false; break;
    case 'KeyD': case 'ArrowRight': s.moveRight = false; break;
  }
}

// ─── Reusable objects (avoid GC pressure in render loop) ────
const _dir = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

// ─── Animation loop ─────────────────────────────────────────
export function animate() {
  s.animationId = requestAnimationFrame(animate);
  if (!s.currentTemplate) return;

  const delta = Math.min(s.clock.getDelta(), 0.05);

  if (s.isLocked) {
    _dir.set(0, 0, 0);
    _fwd.set(-Math.sin(s.yaw), 0, -Math.cos(s.yaw));
    _right.set(Math.cos(s.yaw), 0, -Math.sin(s.yaw));

    if (s.moveForward)  _dir.add(_fwd);
    if (s.moveBackward) _dir.sub(_fwd);
    if (s.moveLeft)     _dir.sub(_right);
    if (s.moveRight)    _dir.add(_right);

    _dir.normalize().multiplyScalar(s.currentTemplate.moveSpeed * delta);
    s.velocity.x += _dir.x;
    s.velocity.z += _dir.z;
    s.velocity.x *= DAMPING;
    s.velocity.z *= DAMPING;

    const nx = s.camera.position.x + s.velocity.x;
    if (!checkCollision(nx, s.camera.position.z)) s.camera.position.x = nx;
    else s.velocity.x = 0;

    const nz = s.camera.position.z + s.velocity.z;
    if (!checkCollision(s.camera.position.x, nz)) s.camera.position.z = nz;
    else s.velocity.z = 0;

    _euler.set(s.pitch, s.yaw, 0);
    s.camera.quaternion.setFromEuler(_euler);
  }

  s.renderer.render(s.scene, s.camera);
}

// ─── Cleanup input listeners ────────────────────────────────
export function removeInputListeners() {
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('keyup', onKeyUp);
}
