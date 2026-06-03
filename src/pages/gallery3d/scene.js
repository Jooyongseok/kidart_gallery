// ============================================================
// Gallery3D — Room Construction, Lighting & Floor Textures
// Premium quality: textured floors, smooth pillars, wall lights
// ============================================================
import { s, addCollider } from './state.js';
import { placeArtworks, placePedestals } from './artworks.js';

// ─── Build entire gallery from template ─────────────────────
export function buildGallery(T) {
  buildRoom(T);
  addLighting(T);
  placeArtworks(T);
  if (T.hasPedestals) placePedestals(T);
}

// ─── Room geometry ──────────────────────────────────────────
function buildRoom(T) {
  const { width: W, depth: D, height: H } = T.room;
  const C = T.colors;

  // Floor with procedural texture + realistic reflections
  const floorTex = createFloorTexture(T.floorType || 'marble', C.floor);
  const isMarble = (T.floorType || 'marble').includes('marble');
  const floorMat = isMarble
    ? new THREE.MeshPhysicalMaterial({
        map: floorTex, roughness: 0.25, metalness: 0.05,
        reflectivity: 0.6, clearcoat: 0.3, clearcoatRoughness: 0.2,
      })
    : new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7, metalness: 0.03 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  s.scene.add(floor);

  // Ceiling with subtle texture
  const ceilTex = createCeilingTexture(C.ceiling);
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 0.92 })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  s.scene.add(ceil);

  // Walls with subtle grain + bump effect
  const wallTex = createWallTexture(C.wall);
  const wallBumpTex = createWallTexture(C.wall); // reuse as bump map for subtle depth
  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTex, roughness: 0.55, metalness: 0.02,
    bumpMap: wallBumpTex, bumpScale: 0.005,
  });
  addWall(W, H, 0, H / 2, -D / 2, 0, wallMat);
  addWall(W, H, 0, H / 2, D / 2, Math.PI, wallMat);
  addWall(D, H, -W / 2, H / 2, 0, Math.PI / 2, wallMat);
  addWall(D, H, W / 2, H / 2, 0, -Math.PI / 2, wallMat);

  // Wall colliders
  addCollider(-W / 2 - 1, W / 2 + 1, -D / 2 - 1, -D / 2 + 0.15);
  addCollider(-W / 2 - 1, W / 2 + 1, D / 2 - 0.15, D / 2 + 1);
  addCollider(-W / 2 - 1, -W / 2 + 0.15, -D / 2, D / 2);
  addCollider(W / 2 - 0.15, W / 2 + 1, -D / 2, D / 2);

  // Baseboards (thicker, slight metalness)
  const skirtMat = new THREE.MeshStandardMaterial({ color: C.wallAccent, roughness: 0.4, metalness: 0.05 });
  const sk = 0.14;
  addBox(W, sk, 0.05, 0, sk / 2, -D / 2 + 0.025, skirtMat);
  addBox(W, sk, 0.05, 0, sk / 2, D / 2 - 0.025, skirtMat);
  addBox(0.05, sk, D, -W / 2 + 0.025, sk / 2, 0, skirtMat);
  addBox(0.05, sk, D, W / 2 - 0.025, sk / 2, 0, skirtMat);

  // Crown molding (double-layer for depth)
  const crownMat = new THREE.MeshStandardMaterial({ color: C.wallAccent, roughness: 0.35, metalness: 0.08 });
  addBox(W, 0.07, 0.04, 0, H - 0.035, -D / 2 + 0.02, crownMat);
  addBox(W, 0.07, 0.04, 0, H - 0.035, D / 2 - 0.02, crownMat);
  addBox(0.04, 0.07, D, -W / 2 + 0.02, H - 0.035, 0, crownMat);
  addBox(0.04, 0.07, D, W / 2 - 0.02, H - 0.035, 0, crownMat);
  // Secondary thin crown strip
  const crown2 = new THREE.MeshStandardMaterial({ color: C.wallAccent, roughness: 0.3, metalness: 0.12 });
  addBox(W + 0.02, 0.025, 0.025, 0, H - 0.08, -D / 2 + 0.012, crown2);
  addBox(W + 0.02, 0.025, 0.025, 0, H - 0.08, D / 2 - 0.012, crown2);

  // Partition
  if (T.hasPartition) {
    const pMat = new THREE.MeshStandardMaterial({ color: C.partition, roughness: 0.55 });
    const pW = 6, pH = H * 0.65, pD = 0.18;
    const pZ = -D * 0.15;
    addBox(pW, pH, pD, 0, pH / 2, pZ, pMat);
    const capMat = new THREE.MeshStandardMaterial({ color: C.pillar, roughness: 0.35, metalness: 0.1 });
    addBox(pW + 0.08, 0.04, pD + 0.04, 0, pH + 0.02, pZ, capMat);
    addCollider(-pW / 2 - 0.25, pW / 2 + 0.25, pZ - pD / 2 - 0.25, pZ + pD / 2 + 0.25);
  }

  // Pillars (smooth, 24 segments, decorative rings)
  if (T.hasPillars) {
    const pilGeo = new THREE.CylinderGeometry(0.14, 0.18, H - 0.2, 24);
    const pilMat = new THREE.MeshStandardMaterial({ color: C.pillar, metalness: 0.15, roughness: 0.35 });
    const baseGeo = new THREE.CylinderGeometry(0.3, 0.32, 0.1, 24);
    const capGeo = new THREE.CylinderGeometry(0.3, 0.14, 0.1, 24);
    const ringGeo = new THREE.TorusGeometry(0.17, 0.015, 8, 24);

    [[-W / 2 + 0.3, -D / 3], [W / 2 - 0.3, -D / 3],
     [-W / 2 + 0.3, D / 3],  [W / 2 - 0.3, D / 3]].forEach(([x, z]) => {
      const pil = new THREE.Mesh(pilGeo, pilMat);
      pil.position.set(x, H / 2, z); pil.castShadow = true;
      s.scene.add(pil);
      const base = new THREE.Mesh(baseGeo, pilMat);
      base.position.set(x, 0.05, z);
      s.scene.add(base);
      const cap = new THREE.Mesh(capGeo, pilMat);
      cap.position.set(x, H - 0.05, z);
      s.scene.add(cap);
      // Decorative ring at 1/3 height
      const ring = new THREE.Mesh(ringGeo, pilMat);
      ring.position.set(x, H * 0.33, z);
      ring.rotation.x = Math.PI / 2;
      s.scene.add(ring);
      addCollider(x - 0.35, x + 0.35, z - 0.35, z + 0.35);
    });
  }

  // Bench (wood seat + metal legs)
  if (T.hasBench) {
    const seatMat = new THREE.MeshStandardMaterial({ color: C.bench, roughness: 0.7, metalness: 0.0 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.5 });
    const bZ = D * 0.15;
    addBox(1.8, 0.08, 0.5, 0, 0.45, bZ, seatMat, true);
    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.42, 8);
    [[-0.75, -0.2], [-0.75, 0.2], [0.75, -0.2], [0.75, 0.2]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, 0.21, bZ + lz);
      s.scene.add(leg);
    });
    // Cross bar between legs
    addBox(1.5, 0.02, 0.02, 0, 0.12, bZ, legMat);
    addCollider(-1.1, 1.1, bZ - 0.45, bZ + 0.45);
  }

  buildTemplateDecorations(T, W, D, H, C);
}

// ─── Per-template decorative elements ────────────────────────
function buildTemplateDecorations(T, W, D, H, C) {
  const key = s.selectedTemplateKey;

  if (key === 'dark-luxury') {
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xc9a96e, metalness: 0.7, roughness: 0.2 });
    addBox(W - 2, 0.01, 0.05, 0, 0.006, 0, accentMat);
    addBox(0.05, 0.01, D - 2, 0, 0.006, 0, accentMat);
    const glowMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.25 });
    for (let i = 0; i < 4; i++) {
      const zPos = -D / 2 + 3 + i * (D - 6) / 3;
      addBox(0.6, 0.02, 0.01, -W / 2 + 0.06, H * 0.75, zPos, glowMat);
      addBox(0.6, 0.02, 0.01, W / 2 - 0.06, H * 0.75, zPos, glowMat);
    }
  }

  if (key === 'kids-colorful') {
    const circleColors = [0xff6b6b, 0xffa500, 0xffd700, 0x66cc66, 0x6699ff, 0xcc66ff];
    const circleGeo = new THREE.CircleGeometry(0.8, 16);
    circleColors.forEach((col, i) => {
      const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, transparent: true, opacity: 0.12 });
      const circle = new THREE.Mesh(circleGeo, mat);
      circle.rotation.x = -Math.PI / 2;
      circle.position.set((i % 3 - 1) * 4 + (Math.random() - 0.5) * 2, 0.007, (Math.floor(i / 3) - 0.5) * 6);
      s.scene.add(circle);
    });
    const starMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.12, side: THREE.DoubleSide });
    for (let i = 0; i < 5; i++) {
      const starMesh = new THREE.Mesh(createStarShape(0.3), starMat);
      starMesh.rotation.x = Math.PI / 2;
      starMesh.position.set((Math.random() - 0.5) * (W - 4), H - 0.01, (Math.random() - 0.5) * (D - 4));
      s.scene.add(starMesh);
    }
  }

  if (key === 'louvre') {
    const colGeo = new THREE.CylinderGeometry(0.22, 0.28, H, 20);
    const colMat = new THREE.MeshStandardMaterial({ color: 0xd8cdb0, metalness: 0.1, roughness: 0.3 });
    const colBaseGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.12, 20);
    const colCapGeo = new THREE.CylinderGeometry(0.38, 0.22, 0.15, 20);
    for (let i = 0; i < 5; i++) {
      const zPos = -D / 2 + 5 + i * (D - 10) / 4;
      [[-W / 2 + 2.5, zPos], [W / 2 - 2.5, zPos]].forEach(([cx, cz]) => {
        const col = new THREE.Mesh(colGeo, colMat);
        col.position.set(cx, H / 2, cz); col.castShadow = true;
        s.scene.add(col);
        const base = new THREE.Mesh(colBaseGeo, colMat);
        base.position.set(cx, 0.06, cz);
        s.scene.add(base);
        const cap = new THREE.Mesh(colCapGeo, colMat);
        cap.position.set(cx, H - 0.075, cz);
        s.scene.add(cap);
        addCollider(cx - 0.45, cx + 0.45, cz - 0.45, cz + 0.45);
      });
    }
    const diamondMat = new THREE.MeshStandardMaterial({ color: 0xc9a96e, metalness: 0.3, roughness: 0.3 });
    const diamond = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), diamondMat);
    diamond.rotation.x = -Math.PI / 2;
    diamond.rotation.z = Math.PI / 4;
    diamond.position.y = 0.006;
    s.scene.add(diamond);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0xe8e0cc, roughness: 0.45 });
    for (let i = 0; i < 4; i++) {
      const zPos = -D / 2 + 6 + i * (D - 12) / 3;
      addBox(W - 3, 0.15, 0.3, 0, H - 0.08, zPos, beamMat);
    }
  }

  if (key === 'tate-modern') {
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.65, roughness: 0.35 });
    for (let i = 0; i < 5; i++) {
      const xPos = -W / 2 + 4 + i * (W - 8) / 4;
      addBox(0.15, 0.3, D - 2, xPos, H - 0.15, 0, steelMat);
    }
    for (let i = 0; i < 6; i++) {
      const zPos = -D / 2 + 4 + i * (D - 8) / 5;
      addBox(W - 2, 0.12, 0.12, 0, H - 0.4, zPos, steelMat);
    }
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xccaa00, roughness: 0.9 });
    addBox(W - 6, 0.005, 0.06, 0, 0.003, -D * 0.3, yellowMat);
    addBox(W - 6, 0.005, 0.06, 0, 0.003, D * 0.3, yellowMat);
  }

  if (key === 'guggenheim') {
    const rampMat = new THREE.MeshStandardMaterial({ color: 0xf0ece8, roughness: 0.45 });
    const rampRadius = Math.min(W, D) / 2 - 2;
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 1.5;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.8), rampMat);
      seg.position.set(Math.cos(angle) * rampRadius, 0.3 + (i / 24) * 2.5, Math.sin(angle) * rampRadius);
      seg.rotation.y = -angle;
      s.scene.add(seg);
    }
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.15, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3, 0.08, 8, 32), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = H - 0.1;
    s.scene.add(ring);
  }

  if (key === 'outdoor') {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.8 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d8a4e, roughness: 0.65 });
    const treePositions = [
      [-W / 2 + 1.5, -D * 0.3], [W / 2 - 1.5, -D * 0.3],
      [-W / 2 + 1.5, D * 0.2], [W / 2 - 1.5, D * 0.2],
      [-W / 2 + 1.5, D * 0.4], [W / 2 - 1.5, -D * 0.1],
    ];
    treePositions.forEach(([tx, tz]) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 2.5, 10), trunkMat);
      trunk.position.set(tx, 1.25, tz); trunk.castShadow = true;
      s.scene.add(trunk);
      const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 12), leafMat);
      canopy.position.set(tx, 3.2, tz); canopy.castShadow = true;
      s.scene.add(canopy);
      addCollider(tx - 0.5, tx + 0.5, tz - 0.5, tz + 0.5);
    });
    const sunMat = new THREE.MeshStandardMaterial({ color: 0xfff8c0, emissive: 0xffdd44, emissiveIntensity: 0.5 });
    const sun = new THREE.Mesh(new THREE.CircleGeometry(1.5, 24), sunMat);
    sun.rotation.x = Math.PI / 2;
    sun.position.set(W * 0.2, H - 0.02, -D * 0.2);
    s.scene.add(sun);
  }

  // ── Space Museum ──
  if (key === 'space') {
    // Stars on ceiling
    const starMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8 });
    for (let i = 0; i < 80; i++) {
      const star = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.04, 6, 6), starMat);
      star.position.set(
        (Math.random() - 0.5) * (W - 2),
        H - 0.1 - Math.random() * 1.5,
        (Math.random() - 0.5) * (D - 2),
      );
      s.scene.add(star);
    }
    // Glowing ring fixtures
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x4488ff, emissiveIntensity: 0.3, side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.04, 8, 32), ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, H - 0.5, -D / 2 + 5 + i * (D - 10) / 2);
      s.scene.add(ring);
    }
    // Floating asteroids
    const asteroidMat = new THREE.MeshStandardMaterial({ color: 0x3a3a5a, roughness: 0.8 });
    for (let i = 0; i < 6; i++) {
      const asteroid = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.3, 0), asteroidMat);
      asteroid.position.set(
        (Math.random() - 0.5) * (W - 6),
        1.5 + Math.random() * 3,
        (Math.random() - 0.5) * (D - 6),
      );
      asteroid.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      s.scene.add(asteroid);
    }
  }

  // ── Underwater Gallery ──
  if (key === 'underwater') {
    // Bubble particles
    const bubbleMat = new THREE.MeshStandardMaterial({ color: 0x80d0ff, transparent: true, opacity: 0.2, roughness: 0.1, metalness: 0.3 });
    for (let i = 0; i < 40; i++) {
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.12, 8, 8), bubbleMat);
      bubble.position.set(
        (Math.random() - 0.5) * (W - 4),
        Math.random() * H,
        (Math.random() - 0.5) * (D - 4),
      );
      s.scene.add(bubble);
    }
    // Coral pillars
    const coralColors = [0xff6060, 0xff8040, 0xff60a0, 0xd060ff];
    coralColors.forEach((col, i) => {
      const coralMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 });
      const coral = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 1.5 + Math.random(), 8), coralMat);
      const cx = (i % 2 === 0 ? -1 : 1) * (W / 2 - 1.5);
      const cz = -D / 2 + 4 + i * (D - 8) / 3;
      coral.position.set(cx, 0.75, cz);
      s.scene.add(coral);
      addCollider(cx - 0.5, cx + 0.5, cz - 0.5, cz + 0.5);
    });
    // Caustic light effect on floor
    const causticMat = new THREE.MeshStandardMaterial({ color: 0x30a0c0, emissive: 0x30a0c0, emissiveIntensity: 0.08, transparent: true, opacity: 0.15 });
    for (let i = 0; i < 8; i++) {
      const caustic = new THREE.Mesh(new THREE.CircleGeometry(1 + Math.random(), 12), causticMat);
      caustic.rotation.x = -Math.PI / 2;
      caustic.position.set((Math.random() - 0.5) * (W - 4), 0.007, (Math.random() - 0.5) * (D - 4));
      s.scene.add(caustic);
    }
  }

  // ── Forest Gallery ──
  if (key === 'forest') {
    // Tree trunk pillars
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3820, roughness: 0.85 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x3a8a3a, roughness: 0.7 });
    const treePositions = [
      [-W / 2 + 1.2, -D * 0.3], [W / 2 - 1.2, -D * 0.3],
      [-W / 2 + 1.2, 0], [W / 2 - 1.2, 0],
      [-W / 2 + 1.2, D * 0.3], [W / 2 - 1.2, D * 0.3],
    ];
    treePositions.forEach(([tx, tz]) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, H, 10), trunkMat);
      trunk.position.set(tx, H / 2, tz); trunk.castShadow = true;
      s.scene.add(trunk);
      const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 10), leafMat);
      canopy.position.set(tx, H + 0.5, tz); canopy.castShadow = true;
      s.scene.add(canopy);
      addCollider(tx - 0.5, tx + 0.5, tz - 0.5, tz + 0.5);
    });
    // Leaf particles on floor
    const leafParticleMat = new THREE.MeshStandardMaterial({ color: 0x6aaa4a, side: THREE.DoubleSide, roughness: 0.9 });
    for (let i = 0; i < 20; i++) {
      const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.06, 5), leafParticleMat);
      leaf.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      leaf.rotation.z = Math.random() * Math.PI;
      leaf.position.set((Math.random() - 0.5) * (W - 4), 0.01, (Math.random() - 0.5) * (D - 4));
      s.scene.add(leaf);
    }
    // Fireflies (glowing dots)
    const fireflyMat = new THREE.MeshStandardMaterial({ color: 0xffff80, emissive: 0xffff60, emissiveIntensity: 0.6 });
    for (let i = 0; i < 12; i++) {
      const firefly = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), fireflyMat);
      firefly.position.set(
        (Math.random() - 0.5) * (W - 4),
        1 + Math.random() * 2,
        (Math.random() - 0.5) * (D - 4),
      );
      s.scene.add(firefly);
    }
  }
}

// ─── Lighting (wall-based, max ~12 lights) ──────────────────
function addLighting(T) {
  const { width: W, depth: D, height: H } = T.room;
  const L = T.lighting;

  // Global ambient
  s.scene.add(new THREE.AmbientLight(L.ambientColor, L.ambientIntensity));
  s.scene.add(new THREE.HemisphereLight(0xffffff, L.hemiGround, L.hemiIntensity));

  // 2 overhead spots (main illumination + shadow on first)
  [[0, H - 0.2, -D * 0.25], [0, H - 0.2, D * 0.2]].forEach(([x, y, z], idx) => {
    const spot = new THREE.SpotLight(L.overheadColor, L.overheadIntensity, H * 5, Math.PI / 3, 0.7, 1);
    spot.position.set(x, y, z);
    spot.target.position.set(x, 0, z);
    if (idx === 0) {
      spot.castShadow = true;
      spot.shadow.mapSize.set(512, 512);
      spot.shadow.bias = -0.002;
    }
    s.scene.add(spot);
    s.scene.add(spot.target);

    // Track fixture visual
    const fixture = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.04, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.5, roughness: 0.3 })
    );
    fixture.position.set(x, H - 0.03, z);
    s.scene.add(fixture);
  });

  // 6 wall-wash spotlights (replace per-artwork lights — much cheaper)
  const wsc = L.wallSpotColor || L.overheadColor;
  const wsi = L.wallSpotIntensity || L.overheadIntensity * 0.8;
  const wallSpots = [
    { pos: [-W / 2 + 0.8, H - 0.4, -D * 0.25], tar: [-W / 2, H * 0.4, -D * 0.25] },
    { pos: [-W / 2 + 0.8, H - 0.4, D * 0.15],  tar: [-W / 2, H * 0.4, D * 0.15] },
    { pos: [W / 2 - 0.8, H - 0.4, -D * 0.25],  tar: [W / 2, H * 0.4, -D * 0.25] },
    { pos: [W / 2 - 0.8, H - 0.4, D * 0.15],   tar: [W / 2, H * 0.4, D * 0.15] },
    { pos: [-W * 0.2, H - 0.4, -D / 2 + 0.8],  tar: [-W * 0.2, H * 0.4, -D / 2] },
    { pos: [W * 0.2, H - 0.4, -D / 2 + 0.8],   tar: [W * 0.2, H * 0.4, -D / 2] },
  ];
  wallSpots.forEach(({ pos, tar }) => {
    const wl = new THREE.SpotLight(wsc, wsi, H * 4, Math.PI / 4, 0.8, 1.2);
    wl.position.set(...pos);
    wl.target.position.set(...tar);
    s.scene.add(wl);
    s.scene.add(wl.target);
  });

  // Template-specific accent lights
  if (s.selectedTemplateKey === 'dark-luxury') {
    [[-W / 2 + 1, 1.2, -D / 3], [W / 2 - 1, 1.2, D / 3]].forEach(([x, y, z]) => {
      const pl = new THREE.PointLight(0x7c5cfc, 0.25, 10, 2);
      pl.position.set(x, y, z); s.scene.add(pl);
    });
  }
  if (s.selectedTemplateKey === 'kids-colorful') {
    [0xff6b6b, 0x66cc66, 0x6699ff].forEach((col, i) => {
      const pl = new THREE.PointLight(col, 0.12, 10, 2);
      pl.position.set((i - 1) * 5, 2, 0); s.scene.add(pl);
    });
  }
  if (s.selectedTemplateKey === 'louvre') {
    [[-W / 2 + 2.5, 0.5, 0], [W / 2 - 2.5, 0.5, 0]].forEach(([x, y, z]) => {
      const pl = new THREE.PointLight(0xffd080, 0.35, 12, 2);
      pl.position.set(x, y, z); s.scene.add(pl);
    });
  }
  if (s.selectedTemplateKey === 'tate-modern') {
    for (let i = 0; i < 3; i++) {
      const pl = new THREE.PointLight(0xc8d8ff, 0.25, 20, 2);
      pl.position.set(0, H - 1, -D / 3 + i * D / 3); s.scene.add(pl);
    }
  }
  if (s.selectedTemplateKey === 'outdoor') {
    const sun = new THREE.SpotLight(0xfff8d0, 2.0, 60, Math.PI / 4, 0.3, 0.5);
    sun.position.set(W * 0.3, H - 0.5, -D * 0.3);
    sun.target.position.set(0, 0, 0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(512, 512);
    s.scene.add(sun);
    s.scene.add(sun.target);
  }
}

// ─── Procedural floor texture ───────────────────────────────
function createFloorTexture(type, baseColor) {
  const cvs = document.createElement('canvas');
  cvs.width = 256; cvs.height = 256;
  const ctx = cvs.getContext('2d');

  // Base fill from template color
  const r = (baseColor >> 16) & 0xff, g = (baseColor >> 8) & 0xff, b = baseColor & 0xff;
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, 256, 256);

  if (type === 'marble') {
    // Subtle marble veins
    ctx.globalAlpha = 0.04;
    for (let i = 0; i < 60; i++) {
      ctx.strokeStyle = i % 2 ? `rgb(${r - 20},${g - 20},${b - 15})` : `rgb(${r + 15},${g + 12},${b + 8})`;
      ctx.lineWidth = 0.5 + Math.random() * 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.random() * 256, Math.random() * 256);
      ctx.quadraticCurveTo(Math.random() * 256, Math.random() * 256, Math.random() * 256, Math.random() * 256);
      ctx.stroke();
    }
    // Tile grid
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = `rgb(${r - 30},${g - 30},${b - 25})`;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * 64); ctx.lineTo(256, i * 64); ctx.stroke();
    }
  } else if (type === 'darkMarble') {
    ctx.globalAlpha = 0.06;
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = i % 2 ? '#ffffff' : '#c9a96e';
      ctx.lineWidth = 0.5 + Math.random();
      ctx.beginPath();
      ctx.moveTo(Math.random() * 256, Math.random() * 256);
      ctx.quadraticCurveTo(Math.random() * 256, Math.random() * 256, Math.random() * 256, Math.random() * 256);
      ctx.stroke();
    }
  } else if (type === 'concrete') {
    // Rough noise
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < 800; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
  } else if (type === 'wood') {
    // Wood grain lines
    ctx.globalAlpha = 0.06;
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgb(${r - 15},${g - 20},${b - 18})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      const y = Math.random() * 256;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y + (Math.random() - 0.5) * 8); ctx.stroke();
    }
  } else if (type === 'grass') {
    // Green noise patches
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 500; i++) {
      const shade = 0x20 + Math.floor(Math.random() * 0x40);
      ctx.fillStyle = `rgb(${shade},${shade + 0x40},${shade - 0x10})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
    }
  }

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(cvs);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

// ─── Procedural wall texture ────────────────────────────────
function createWallTexture(baseColor) {
  const cvs = document.createElement('canvas');
  cvs.width = 128; cvs.height = 128;
  const ctx = cvs.getContext('2d');
  const r = (baseColor >> 16) & 0xff, g = (baseColor >> 8) & 0xff, b = baseColor & 0xff;
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, 128, 128);
  // Subtle vertical grain
  ctx.globalAlpha = 0.02;
  for (let i = 0; i < 30; i++) {
    ctx.strokeStyle = Math.random() > 0.5 ? '#fff' : '#000';
    ctx.lineWidth = 0.5;
    const x = Math.random() * 128;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (Math.random() - 0.5) * 4, 128); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(cvs);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

// ─── Procedural ceiling texture ─────────────────────────────
function createCeilingTexture(baseColor) {
  const cvs = document.createElement('canvas');
  cvs.width = 64; cvs.height = 64;
  const ctx = cvs.getContext('2d');
  const r = (baseColor >> 16) & 0xff, g = (baseColor >> 8) & 0xff, b = baseColor & 0xff;
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, 64, 64);
  ctx.globalAlpha = 0.015;
  for (let i = 0; i < 20; i++) {
    ctx.fillStyle = '#000';
    ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(cvs);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

// ─── Geometry helpers ───────────────────────────────────────
function addWall(w, h, x, y, z, rY, mat) {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  wall.position.set(x, y, z);
  wall.rotation.y = rY;
  wall.receiveShadow = true;
  s.scene.add(wall);
}

function addBox(w, h, d, x, y, z, mat, shadow = false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  if (shadow) { mesh.castShadow = true; mesh.receiveShadow = true; }
  s.scene.add(mesh);
}

function createStarShape(radius) {
  const shape = new THREE.Shape();
  const inner = radius * 0.4;
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? radius : inner;
    if (i === 0) shape.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
    else shape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}
