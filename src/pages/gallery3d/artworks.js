// ============================================================
// Gallery3D — Artwork Placement & Popup (Premium Quality)
// - NO per-artwork SpotLight (wall lights handle illumination)
// - Higher-poly sculptures, beveled frames, polished pedestals
// ============================================================
import { getAllArtworks, generatePlaceholderImage } from '../../data/sample-data.js';
import { s, addCollider } from './state.js';

// ─── Place all artworks on walls ────────────────────────────
export function placeArtworks(T) {
  const allArtworks = getAllArtworks();
  const { width: W, depth: D } = T.room;
  s.artworkMeshes = [];

  const positions = [];

  const leftCount = Math.ceil(allArtworks.length / 3);
  for (let i = 0; i < leftCount && i < allArtworks.length; i++) {
    const sp = (D - 4) / leftCount;
    positions.push({ x: -W / 2 + 0.1, y: 1.5, z: -D / 2 + 2 + i * sp + sp / 2, rotY: Math.PI / 2, artwork: allArtworks[i] });
  }

  const rightCount = Math.ceil(allArtworks.length / 3);
  for (let i = 0; i < rightCount && leftCount + i < allArtworks.length; i++) {
    const sp = (D - 4) / rightCount;
    positions.push({ x: W / 2 - 0.1, y: 1.5, z: -D / 2 + 2 + i * sp + sp / 2, rotY: -Math.PI / 2, artwork: allArtworks[leftCount + i] });
  }

  const bStart = leftCount + rightCount;
  const bCount = allArtworks.length - bStart;
  for (let i = 0; i < bCount; i++) {
    const sp = (W - 4) / Math.max(bCount, 1);
    positions.push({ x: -W / 2 + 2 + i * sp + sp / 2, y: 1.5, z: -D / 2 + 0.1, rotY: 0, artwork: allArtworks[bStart + i] });
  }

  positions.forEach(p => createArtworkFrame(p.x, p.y, p.z, p.rotY, p.artwork, T));
}

// ─── Premium artwork frame ───────────────────────────────────
export function createArtworkFrame(x, y, z, rotY, artData, T) {
  const C = T.colors;
  const group = new THREE.Group();
  const fW = 1.6, fH = 1.2, fD = 0.04;

  // Outer frame (4 beveled strips for molding effect)
  const frameMat = new THREE.MeshStandardMaterial({ color: C.frame, metalness: 0.4, roughness: 0.35 });
  const bevel = 0.045;
  // Top/bottom strips
  const hStrip = new THREE.Mesh(new THREE.BoxGeometry(fW + 0.08, bevel, fD + 0.01), frameMat);
  const hStrip2 = hStrip.clone();
  hStrip.position.set(0, fH / 2 + bevel / 2, 0);
  hStrip2.position.set(0, -fH / 2 - bevel / 2, 0);
  // Left/right strips
  const vStrip = new THREE.Mesh(new THREE.BoxGeometry(bevel, fH + bevel * 2, fD + 0.01), frameMat);
  const vStrip2 = vStrip.clone();
  vStrip.position.set(-fW / 2 - bevel / 2, 0, 0);
  vStrip2.position.set(fW / 2 + bevel / 2, 0, 0);
  group.add(hStrip, hStrip2, vStrip, vStrip2);

  // Inner frame border (thin gold/dark accent)
  const innerMat = new THREE.MeshStandardMaterial({ color: C.frame, metalness: 0.6, roughness: 0.2 });
  const ib = 0.02;
  const iTop = new THREE.Mesh(new THREE.BoxGeometry(fW, ib, fD * 0.6), innerMat);
  const iBot = iTop.clone();
  const iLft = new THREE.Mesh(new THREE.BoxGeometry(ib, fH, fD * 0.6), innerMat);
  const iRgt = iLft.clone();
  iTop.position.set(0, fH / 2 - ib / 2, 0.005);
  iBot.position.set(0, -fH / 2 + ib / 2, 0.005);
  iLft.position.set(-fW / 2 + ib / 2, 0, 0.005);
  iRgt.position.set(fW / 2 - ib / 2, 0, 0.005);
  group.add(iTop, iBot, iLft, iRgt);

  // Mat (recessed white/cream area)
  const matMesh = new THREE.Mesh(
    new THREE.BoxGeometry(fW - 0.04, fH - 0.04, fD * 0.5),
    new THREE.MeshStandardMaterial({ color: C.frameMat, roughness: 0.95 })
  );
  matMesh.position.set(0, 0, -0.005);
  group.add(matMesh);

  // Canvas texture (artwork image)
  const cvs = document.createElement('canvas');
  cvs.width = 256; cvs.height = 192;
  const ctx = cvs.getContext('2d');
  const col = artData.color || '#7c5cfc';
  const grad = ctx.createLinearGradient(0, 0, 256, 192);
  grad.addColorStop(0, col);
  grad.addColorStop(0.5, shiftColor(col, 25));
  grad.addColorStop(1, shiftColor(col, 50));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 192);
  // Abstract brush strokes
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 192, 8 + Math.random() * 30, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 ? '#fff' : '#000';
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  ctx.fillText(artData.title, 128, 90);
  ctx.font = '11px sans-serif';
  ctx.shadowBlur = 2;
  ctx.fillText(artData.artistName, 128, 110);

  const tex = new THREE.CanvasTexture(cvs);
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  const artMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(fW - 0.2, fH - 0.2),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, metalness: 0.02 })
  );
  artMesh.position.z = fD / 2 + 0.003;
  group.add(artMesh);

  // Name plate (polished metal)
  const plateMat = new THREE.MeshStandardMaterial({ color: C.namePlate, metalness: 0.3, roughness: 0.35 });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.012), plateMat);
  plate.position.set(0, -(fH / 2 + 0.14), 0.012);
  group.add(plate);

  group.position.set(x, y, z);
  group.rotation.y = rotY;

  // NO per-artwork SpotLight — wall lights from scene.js handle this

  group.userData = { artworkData: artData, isArtwork: true };
  artMesh.userData = { artworkData: artData, isArtwork: true };
  s.artworkMeshes.push(artMesh);
  s.scene.add(group);
}

// ─── Premium pedestals with sculptures ──────────────────────
export function placePedestals(T) {
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
    const pH = 0.95, pW = 0.48;

    // Pedestal body (polished)
    const pedMat = new THREE.MeshStandardMaterial({ color: C.pedestal, roughness: 0.15, metalness: 0.08 });
    const ped = new THREE.Mesh(new THREE.BoxGeometry(pW, pH, pW), pedMat);
    ped.position.set(pos.x, pH / 2, pos.z);
    ped.castShadow = true; ped.receiveShadow = true;
    s.scene.add(ped);

    // Base trim
    const trimMat = new THREE.MeshStandardMaterial({ color: C.pedestal, roughness: 0.25, metalness: 0.15 });
    const baseTrim = new THREE.Mesh(new THREE.BoxGeometry(pW + 0.08, 0.06, pW + 0.08), trimMat);
    baseTrim.position.set(pos.x, 0.03, pos.z);
    s.scene.add(baseTrim);

    // Top plate (slight overhang, glossy)
    const topMat = new THREE.MeshStandardMaterial({ color: C.pedestalTop, roughness: 0.1, metalness: 0.12 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(pW + 0.1, 0.035, pW + 0.1), topMat);
    top.position.set(pos.x, pH + 0.018, pos.z);
    top.receiveShadow = true;
    s.scene.add(top);

    // Sculpture
    const artData = allArt[i % allArt.length];
    const sculpture = createSculpture(artData, i);
    sculpture.position.set(pos.x, pH + 0.04, pos.z);
    sculpture.userData = { artworkData: artData, isArtwork: true };
    s.artworkMeshes.push(sculpture);
    s.scene.add(sculpture);

    // NO per-pedestal SpotLight — overhead + wall lights handle this

    addCollider(pos.x - 0.55, pos.x + 0.55, pos.z - 0.55, pos.z + 0.55);
  });
}

// ─── High-quality sculptures (6 types) ──────────────────────
export function createSculpture(artData, index) {
  const col = artData.color || '#7c5cfc';
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(col), roughness: 0.2, metalness: 0.3 });
  const mat2 = mat.clone();
  mat2.color = new THREE.Color(shiftColor(col, 35));
  const g = new THREE.Group();
  const type = index % 6;

  if (type === 0) {
    // Sphere cluster (high-poly)
    const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 32), mat);
    s1.position.y = 0.16; s1.castShadow = true;
    const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 24), mat2);
    s2.position.set(0.14, 0.34, 0.04); s2.castShadow = true;
    const s3 = new THREE.Mesh(new THREE.SphereGeometry(0.065, 20, 20), mat2);
    s3.position.set(-0.09, 0.4, -0.04); s3.castShadow = true;
    g.add(s1, s2, s3);
  } else if (type === 1) {
    // Elegant column + sphere
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.095, 0.4, 16), mat);
    c.position.y = 0.2; c.castShadow = true;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 24), mat2);
    b.position.y = 0.48; b.castShadow = true;
    g.add(c, b);
  } else if (type === 2) {
    // Torus (high-poly)
    const tor = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.045, 16, 32), mat);
    tor.position.y = 0.18; tor.rotation.x = Math.PI / 4; tor.castShadow = true;
    g.add(tor);
  } else if (type === 3) {
    // Stacked cubes (rotated)
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), mat);
    c1.position.y = 0.09; c1.rotation.y = Math.PI / 6; c1.castShadow = true;
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.13), mat2);
    c2.position.y = 0.25; c2.rotation.y = Math.PI / 3; c2.castShadow = true;
    g.add(c1, c2);
  } else if (type === 4) {
    // Dodecahedron (modern art)
    const dodec = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), mat);
    dodec.position.y = 0.2; dodec.rotation.set(0.3, 0.5, 0); dodec.castShadow = true;
    g.add(dodec);
  } else {
    // Torus knot (organic)
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.1, 0.03, 64, 12), mat);
    knot.position.y = 0.22; knot.castShadow = true;
    g.add(knot);
  }
  g.userData = { artworkData: artData, isArtwork: true };
  return g;
}

// ─── Artwork popup ───────────────────────────────────────────
export function showArtworkPopup(artwork) {
  document.exitPointerLock();
  const popup = document.getElementById('artwork-popup');
  document.getElementById('popup-image').style.cssText =
    `background-image:url(${generatePlaceholderImage(artwork.color, artwork.title)});background-size:cover;background-position:center;`;
  document.getElementById('popup-title').textContent = artwork.title;
  document.getElementById('popup-artist').textContent = artwork.artistName;
  document.getElementById('popup-desc').textContent = artwork.description;
  popup.classList.add('show');
  document.getElementById('popup-close').onclick = () => popup.classList.remove('show');
}

// ─── Color utility ───────────────────────────────────────────
export function shiftColor(hex, amt) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255, r + amt)},${Math.min(255, g + amt / 2)},${Math.min(255, b + amt / 3)})`;
}
