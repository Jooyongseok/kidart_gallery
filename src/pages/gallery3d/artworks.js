// ============================================================
// Gallery3D — Artwork Placement & Popup (Premium Quality)
// - Real Gemini-generated images on walls
// - Featured (main) artworks displayed large on wide walls
// ============================================================
import { getAllArtworks, generatePlaceholderImage } from '../../data/sample-data.js';
import { s, addCollider } from './state.js';

// Artwork ID → real image path mapping
const artworkImages = {
  'a1-1': 'public/artworks/rainbow_land.png',
  'a1-2': 'public/artworks/ocean_friends.png',
  'a1-3': 'public/artworks/spring_garden.png',
  'a1-4': 'public/artworks/starry_night.png',
  'a2-1': 'public/artworks/robot_kingdom.png',
  'a2-2': 'public/artworks/dino_adventure.png',
  'a2-3': 'public/artworks/space_explore.png',
  'a3-1': 'public/artworks/cat_family.png',
  'a3-2': 'public/artworks/magic_forest.png',
  'a3-3': 'public/artworks/rainbow_cake.png',
  'a3-4': 'public/artworks/flower_field.png',
  'a3-5': 'public/artworks/winter_kingdom.png',
  'a4-1': 'public/artworks/superhero.png',
  'a4-2': 'public/artworks/pirate_ship.png',
  'a4-3': 'public/artworks/dragon_knight.png',
  'a5-1': 'public/artworks/cloud_village.png',
  'a5-2': 'public/artworks/dream_park.png',
  'a5-3': 'public/artworks/moon_and_stars.png',
  'a5-4': 'public/artworks/mermaid_sea.png',
  'a6-1': 'public/artworks/swirl_abstract.png',
  'a6-2': 'public/artworks/night_city.png',
  'a6-3': 'public/artworks/music_colors.png',
  'a7-1': 'public/artworks/sunwoo_dream_tree.png',
  'a7-2': 'public/artworks/sunwoo_galaxy_whale.png',
  'a7-3': 'public/artworks/sunwoo_candy_house.png',
  'a7-4': 'public/artworks/sunwoo_train_clouds.png',
  'a7-5': 'public/artworks/sunwoo_dino_school.png',
  'a7-6': 'public/artworks/sunwoo_aurora.png',
};

// Featured artworks displayed large on the back wall
const featuredIds = ['a7-2', 'a7-1', 'a1-1'];

const textureLoader = new THREE.TextureLoader();

// Slideshow state
let slideshowPlanes = []; // { mesh, artworks[], currentIndex }
let slideshowTimer = null;
const SLIDESHOW_INTERVAL = 6000; // 6 seconds per slide
const FADE_DURATION = 800;

// ─── Place all artworks on walls ────────────────────────────
export function placeArtworks(T) {
  const allArtworks = getAllArtworks();
  const { width: W, depth: D } = T.room;
  s.artworkMeshes = [];
  slideshowPlanes = [];

  // Separate featured vs regular
  const featured = allArtworks.filter(a => featuredIds.includes(a.id));
  const regular = allArtworks.filter(a => !featuredIds.includes(a.id));

  // Build slideshow pool: all artworks with real images
  const slideshowPool = allArtworks.filter(a => artworkImages[a.id]);

  // === BACK WALL (wide) — featured artworks with slideshow ===
  const backWallWidth = W - 4;
  if (featured.length > 0) {
    const sp = backWallWidth / featured.length;
    featured.forEach((art, i) => {
      const x = -W / 2 + 2 + i * sp + sp / 2;
      const plane = createArtworkFrame(x, 1.8, -D / 2 + 0.1, 0, art, T, true);
      if (plane) {
        // Each featured frame cycles through a portion of the pool
        const poolSlice = slideshowPool.filter((_, idx) => idx % featured.length === i);
        slideshowPlanes.push({ mesh: plane, artworks: poolSlice, currentIndex: 0 });
      }
    });
    startSlideshow();
  }

  // === FRONT WALL (opposite back) — some regular artworks ===
  const frontCount = Math.min(Math.floor(regular.length / 3), Math.floor(backWallWidth / 2.2));
  const frontArts = regular.splice(0, frontCount);
  if (frontArts.length > 0) {
    const sp = backWallWidth / frontArts.length;
    frontArts.forEach((art, i) => {
      const x = -W / 2 + 2 + i * sp + sp / 2;
      createArtworkFrame(x, 1.5, D / 2 - 0.1, Math.PI, art, T, false);
    });
  }

  // === LEFT WALL ===
  const leftCount = Math.ceil(regular.length / 2);
  const leftArts = regular.splice(0, leftCount);
  if (leftArts.length > 0) {
    const sp = (D - 4) / leftArts.length;
    leftArts.forEach((art, i) => {
      createArtworkFrame(-W / 2 + 0.1, 1.5, -D / 2 + 2 + i * sp + sp / 2, Math.PI / 2, art, T, false);
    });
  }

  // === RIGHT WALL ===
  if (regular.length > 0) {
    const sp = (D - 4) / regular.length;
    regular.forEach((art, i) => {
      createArtworkFrame(W / 2 - 0.1, 1.5, -D / 2 + 2 + i * sp + sp / 2, -Math.PI / 2, art, T, false);
    });
  }
}

// ─── Premium artwork frame ───────────────────────────────────
export function createArtworkFrame(x, y, z, rotY, artData, T, isFeatured) {
  const C = T.colors;
  const group = new THREE.Group();
  const scale = isFeatured ? 1.8 : 1.0;
  const fW = 1.6 * scale, fH = 1.2 * scale, fD = 0.04;

  // Outer frame (4 beveled strips)
  const frameMat = new THREE.MeshStandardMaterial({ color: C.frame, metalness: 0.4, roughness: 0.35 });
  const bevel = 0.045 * scale;
  const hStrip = new THREE.Mesh(new THREE.BoxGeometry(fW + 0.08 * scale, bevel, fD + 0.01), frameMat);
  const hStrip2 = hStrip.clone();
  hStrip.position.set(0, fH / 2 + bevel / 2, 0);
  hStrip2.position.set(0, -fH / 2 - bevel / 2, 0);
  const vStrip = new THREE.Mesh(new THREE.BoxGeometry(bevel, fH + bevel * 2, fD + 0.01), frameMat);
  const vStrip2 = vStrip.clone();
  vStrip.position.set(-fW / 2 - bevel / 2, 0, 0);
  vStrip2.position.set(fW / 2 + bevel / 2, 0, 0);
  group.add(hStrip, hStrip2, vStrip, vStrip2);

  // Inner frame border
  const innerMat = new THREE.MeshStandardMaterial({ color: C.frame, metalness: 0.6, roughness: 0.2 });
  const ib = 0.02 * scale;
  const iTop = new THREE.Mesh(new THREE.BoxGeometry(fW, ib, fD * 0.6), innerMat);
  const iBot = iTop.clone();
  const iLft = new THREE.Mesh(new THREE.BoxGeometry(ib, fH, fD * 0.6), innerMat);
  const iRgt = iLft.clone();
  iTop.position.set(0, fH / 2 - ib / 2, 0.005);
  iBot.position.set(0, -fH / 2 + ib / 2, 0.005);
  iLft.position.set(-fW / 2 + ib / 2, 0, 0.005);
  iRgt.position.set(fW / 2 - ib / 2, 0, 0.005);
  group.add(iTop, iBot, iLft, iRgt);

  // Mat (recessed area)
  const matMesh = new THREE.Mesh(
    new THREE.BoxGeometry(fW - 0.04, fH - 0.04, fD * 0.5),
    new THREE.MeshStandardMaterial({ color: C.frameMat, roughness: 0.95 })
  );
  matMesh.position.set(0, 0, -0.005);
  group.add(matMesh);

  // Canvas/image for the artwork
  const artPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(fW - 0.2, fH - 0.2),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.02 })
  );
  artPlane.position.z = fD / 2 + 0.003;
  group.add(artPlane);

  // Load real image or fallback to canvas
  const imgPath = artworkImages[artData.id];
  if (imgPath) {
    textureLoader.load(imgPath, (tex) => {
      tex.minFilter = THREE.LinearFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      artPlane.material.map = tex;
      artPlane.material.needsUpdate = true;
    }, undefined, () => {
      // Fallback to canvas on error
      artPlane.material.map = makeCanvasTexture(artData);
      artPlane.material.needsUpdate = true;
    });
  } else {
    artPlane.material.map = makeCanvasTexture(artData);
    artPlane.material.needsUpdate = true;
  }

  // Name plate
  const plateMat = new THREE.MeshStandardMaterial({ color: C.namePlate, metalness: 0.3, roughness: 0.35 });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.7 * scale, 0.1, 0.012), plateMat);
  plate.position.set(0, -(fH / 2 + 0.14), 0.012);
  group.add(plate);

  // Featured artworks get a subtle glow frame
  if (isFeatured) {
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.08 });
    const glowFrame = new THREE.Mesh(new THREE.PlaneGeometry(fW + 0.3, fH + 0.3), glowMat);
    glowFrame.position.z = -0.02;
    group.add(glowFrame);
  }

  group.position.set(x, y, z);
  group.rotation.y = rotY;

  group.userData = { artworkData: artData, isArtwork: true };
  artPlane.userData = { artworkData: artData, isArtwork: true };
  s.artworkMeshes.push(artPlane);
  s.scene.add(group);

  return artPlane;
}

// ─── Slideshow system for featured wall ──────────────────────
function startSlideshow() {
  if (slideshowTimer) clearInterval(slideshowTimer);
  if (slideshowPlanes.length === 0) return;

  slideshowTimer = setInterval(() => {
    slideshowPlanes.forEach(slot => {
      if (slot.artworks.length < 2) return;
      slot.currentIndex = (slot.currentIndex + 1) % slot.artworks.length;
      const nextArt = slot.artworks[slot.currentIndex];
      const imgPath = artworkImages[nextArt.id];
      if (!imgPath) return;

      // Fade out -> swap texture -> fade in
      const mat = slot.mesh.material;
      mat.transparent = true;
      const fadeOut = () => {
        mat.opacity -= 0.05;
        if (mat.opacity <= 0) {
          textureLoader.load(imgPath, (tex) => {
            tex.minFilter = THREE.LinearFilter;
            tex.colorSpace = THREE.SRGBColorSpace;
            mat.map = tex;
            mat.needsUpdate = true;
            slot.mesh.userData.artworkData = nextArt;
            fadeIn();
          });
        } else {
          requestAnimationFrame(fadeOut);
        }
      };
      const fadeIn = () => {
        mat.opacity += 0.05;
        if (mat.opacity >= 1) {
          mat.opacity = 1;
          return;
        }
        requestAnimationFrame(fadeIn);
      };
      fadeOut();
    });
  }, SLIDESHOW_INTERVAL);
}

export function stopSlideshow() {
  if (slideshowTimer) { clearInterval(slideshowTimer); slideshowTimer = null; }
}

function makeCanvasTexture(artData) {
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
  return tex;
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

    const pedMat = new THREE.MeshStandardMaterial({ color: C.pedestal, roughness: 0.15, metalness: 0.08 });
    const ped = new THREE.Mesh(new THREE.BoxGeometry(pW, pH, pW), pedMat);
    ped.position.set(pos.x, pH / 2, pos.z);
    ped.castShadow = true; ped.receiveShadow = true;
    s.scene.add(ped);

    const trimMat = new THREE.MeshStandardMaterial({ color: C.pedestal, roughness: 0.25, metalness: 0.15 });
    const baseTrim = new THREE.Mesh(new THREE.BoxGeometry(pW + 0.08, 0.06, pW + 0.08), trimMat);
    baseTrim.position.set(pos.x, 0.03, pos.z);
    s.scene.add(baseTrim);

    const topMat = new THREE.MeshStandardMaterial({ color: C.pedestalTop, roughness: 0.1, metalness: 0.12 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(pW + 0.1, 0.035, pW + 0.1), topMat);
    top.position.set(pos.x, pH + 0.018, pos.z);
    top.receiveShadow = true;
    s.scene.add(top);

    const artData = allArt[i % allArt.length];
    const sculpture = createSculpture(artData, i);
    sculpture.position.set(pos.x, pH + 0.04, pos.z);
    sculpture.userData = { artworkData: artData, isArtwork: true };
    s.artworkMeshes.push(sculpture);
    s.scene.add(sculpture);

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
    const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 32), mat);
    s1.position.y = 0.16; s1.castShadow = true;
    const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 24), mat2);
    s2.position.set(0.14, 0.34, 0.04); s2.castShadow = true;
    const s3 = new THREE.Mesh(new THREE.SphereGeometry(0.065, 20, 20), mat2);
    s3.position.set(-0.09, 0.4, -0.04); s3.castShadow = true;
    g.add(s1, s2, s3);
  } else if (type === 1) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.095, 0.4, 16), mat);
    c.position.y = 0.2; c.castShadow = true;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 24), mat2);
    b.position.y = 0.48; b.castShadow = true;
    g.add(c, b);
  } else if (type === 2) {
    const tor = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.045, 16, 32), mat);
    tor.position.y = 0.18; tor.rotation.x = Math.PI / 4; tor.castShadow = true;
    g.add(tor);
  } else if (type === 3) {
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), mat);
    c1.position.y = 0.09; c1.rotation.y = Math.PI / 6; c1.castShadow = true;
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.13), mat2);
    c2.position.y = 0.25; c2.rotation.y = Math.PI / 3; c2.castShadow = true;
    g.add(c1, c2);
  } else if (type === 4) {
    const dodec = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), mat);
    dodec.position.y = 0.2; dodec.rotation.set(0.3, 0.5, 0); dodec.castShadow = true;
    g.add(dodec);
  } else {
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
  const imgPath = artworkImages[artwork.id];
  const imgSrc = imgPath || generatePlaceholderImage(artwork.color, artwork.title);
  document.getElementById('popup-image').style.cssText =
    `background-image:url(${imgSrc});background-size:cover;background-position:center;`;
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
