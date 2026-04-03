// ============================================================
// Gallery3D — Player Input, Movement & Animation Loop
// ============================================================
import { s, DAMPING, MOUSE_SENSITIVITY, EYE_HEIGHT, checkCollision } from './state.js';
import { showArtworkPopup } from './artworks.js';

let _hoveredMesh = null;
const _hoverVec = new THREE.Vector2(0, 0);
const _hoverRay = new THREE.Raycaster();
export const isMobile = 'ontouchstart' in window && window.innerWidth < 1024;

// ─── Setup all input handlers ───────────────────────────────
export function setupInputs(container) {
  const overlay = document.getElementById('gallery3d-overlay');
  const hud = document.getElementById('gallery3d-hud');
  const canvas = document.getElementById('gallery3d-canvas');
  const fadeOverlay = document.getElementById('gallery3d-fade');

  if (isMobile) {
    setupMobileControls(container, overlay, hud, canvas, fadeOverlay);
    return;
  }

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
    if (s.isLocked && fadeOverlay) {
      fadeOverlay.style.opacity = '0';
      setTimeout(() => fadeOverlay.style.display = 'none', 500);
    }
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

  // Raycaster for artwork clicks + hover
  _hoverRay.far = 5;
  canvas.addEventListener('click', () => {
    if (!s.isLocked) return;
    _hoverRay.setFromCamera(_hoverVec, s.camera);
    const hits = _hoverRay.intersectObjects(s.artworkMeshes, true);
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

// ─── Mobile touch controls ──────────────────────────────────
function setupMobileControls(container, overlay, hud, canvas, fadeOverlay) {
  const joystickEl = document.getElementById('mobile-joystick');
  const lookArea = document.getElementById('mobile-look-area');
  if (!joystickEl || !lookArea) return;

  // Tap overlay to enter
  if (overlay) {
    overlay.addEventListener('click', e => {
      if (e.target.closest('.template-card') || e.target.closest('.template-cards')) return;
      s.isLocked = true;
      overlay.classList.add('hidden');
      if (hud) hud.style.display = 'flex';
      joystickEl.style.display = 'flex';
      lookArea.style.display = 'block';
      if (fadeOverlay) {
        fadeOverlay.style.opacity = '0';
        setTimeout(() => fadeOverlay.style.display = 'none', 500);
      }
    });
  }

  // Joystick touch
  let joyCenter = null;
  const knob = joystickEl.querySelector('.joystick-knob');

  joystickEl.addEventListener('touchstart', e => {
    e.preventDefault();
    const r = joystickEl.getBoundingClientRect();
    joyCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, { passive: false });

  joystickEl.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!joyCenter) return;
    const t = e.touches[0];
    const dx = t.clientX - joyCenter.x;
    const dy = t.clientY - joyCenter.y;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 40);
    const angle = Math.atan2(dy, dx);
    const nx = Math.cos(angle) * dist;
    const ny = Math.sin(angle) * dist;
    if (knob) knob.style.transform = `translate(${nx}px, ${ny}px)`;

    s.moveForward = dy < -10;
    s.moveBackward = dy > 10;
    s.moveLeft = dx < -10;
    s.moveRight = dx > 10;
  }, { passive: false });

  joystickEl.addEventListener('touchend', () => {
    joyCenter = null;
    if (knob) knob.style.transform = '';
    s.moveForward = s.moveBackward = s.moveLeft = s.moveRight = false;
  });

  // Look area touch (camera rotation)
  let lastTouch = null;
  lookArea.addEventListener('touchstart', e => {
    lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });

  lookArea.addEventListener('touchmove', e => {
    if (!lastTouch) return;
    const t = e.touches[0];
    const dx = t.clientX - lastTouch.x;
    const dy = t.clientY - lastTouch.y;
    s.yaw -= dx * MOUSE_SENSITIVITY * 1.5;
    s.pitch -= dy * MOUSE_SENSITIVITY * 1.5;
    s.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, s.pitch));
    lastTouch = { x: t.clientX, y: t.clientY };
  }, { passive: true });

  lookArea.addEventListener('touchend', () => { lastTouch = null; });
}

function onKeyDown(e) {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp':    s.moveForward = true; break;
    case 'KeyS': case 'ArrowDown':  s.moveBackward = true; break;
    case 'KeyA': case 'ArrowLeft':  s.moveLeft = true; break;
    case 'KeyD': case 'ArrowRight': s.moveRight = true; break;
    case 'KeyM': toggleMinimap(); break;
  }
}

function toggleMinimap() {
  const el = document.getElementById('gallery3d-minimap');
  if (!el) return;
  const visible = el.style.display !== 'none';
  el.style.display = visible ? 'none' : 'block';
}

function drawMinimap() {
  const ctx = s.minimapCtx;
  const T = s.currentTemplate;
  if (!ctx || !T) return;

  const W = T.room.width, D = T.room.depth;
  const cw = 150, ch = 150;
  const sx = cw / W, sz = ch / D;

  ctx.clearRect(0, 0, cw, ch);

  // Room outline
  ctx.strokeStyle = 'rgba(124,92,252,0.5)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(2, 2, cw - 4, ch - 4);

  // Colliders
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  for (const c of s.colliders) {
    const cx = (c.minX + W / 2) * sx;
    const cz = (c.minZ + D / 2) * sz;
    const bw = (c.maxX - c.minX) * sx;
    const bh = (c.maxZ - c.minZ) * sz;
    ctx.fillRect(cx, cz, bw, bh);
  }

  // Player position
  const px = (s.camera.position.x + W / 2) * sx;
  const pz = (s.camera.position.z + D / 2) * sz;
  ctx.fillStyle = '#7c5cfc';
  ctx.beginPath();
  ctx.arc(px, pz, 4, 0, Math.PI * 2);
  ctx.fill();

  // Direction indicator
  ctx.strokeStyle = '#f472b6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px, pz);
  ctx.lineTo(px - Math.sin(s.yaw) * 10, pz - Math.cos(s.yaw) * 10);
  ctx.stroke();
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

  // Hover highlight (check every 3 frames)
  s._frameCount = (s._frameCount || 0) + 1;
  if (s.isLocked && s._frameCount % 3 === 0) {
    _hoverRay.setFromCamera(_hoverVec, s.camera);
    const hits = _hoverRay.intersectObjects(s.artworkMeshes, true);
    const newHover = hits.length > 0 ? hits[0].object : null;
    if (newHover !== _hoveredMesh) {
      if (_hoveredMesh && _hoveredMesh.material) {
        _hoveredMesh.material.emissiveIntensity = 0;
      }
      if (newHover && newHover.material) {
        newHover.material.emissive = newHover.material.emissive || new THREE.Color(0x7c5cfc);
        newHover.material.emissiveIntensity = 0.3;
      }
      _hoveredMesh = newHover;
    }
  }

  // Update minimap
  if (s.minimapCtx && s._frameCount % 5 === 0) {
    drawMinimap();
  }

  s.renderer.render(s.scene, s.camera);
}

// ─── Cleanup input listeners ────────────────────────────────
export function removeInputListeners() {
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('keyup', onKeyUp);
}
