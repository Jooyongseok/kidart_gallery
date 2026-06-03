// ============================================================
// Artist Page — Album-style Portfolio with Lightbox
// ============================================================
import { artists, getArtistById, generatePlaceholderImage } from '../data/sample-data.js';
import { navigateTo } from '../router.js';

const artworkImages = {
  'a1-1': 'public/artworks/rainbow_land.png', 'a1-2': 'public/artworks/ocean_friends.png',
  'a1-3': 'public/artworks/spring_garden.png', 'a1-4': 'public/artworks/starry_night.png',
  'a2-1': 'public/artworks/robot_kingdom.png', 'a2-2': 'public/artworks/dino_adventure.png',
  'a2-3': 'public/artworks/space_explore.png', 'a3-1': 'public/artworks/cat_family.png',
  'a3-2': 'public/artworks/magic_forest.png', 'a3-3': 'public/artworks/rainbow_cake.png',
  'a3-4': 'public/artworks/flower_field.png', 'a3-5': 'public/artworks/winter_kingdom.png',
  'a4-1': 'public/artworks/superhero.png', 'a4-2': 'public/artworks/pirate_ship.png',
  'a4-3': 'public/artworks/dragon_knight.png', 'a5-1': 'public/artworks/cloud_village.png',
  'a5-2': 'public/artworks/dream_park.png', 'a5-3': 'public/artworks/moon_and_stars.png',
  'a5-4': 'public/artworks/mermaid_sea.png', 'a6-1': 'public/artworks/swirl_abstract.png',
  'a6-2': 'public/artworks/night_city.png', 'a6-3': 'public/artworks/music_colors.png',
  'a7-1': 'public/artworks/sunwoo_dream_tree.png', 'a7-2': 'public/artworks/sunwoo_galaxy_whale.png',
  'a7-3': 'public/artworks/sunwoo_candy_house.png', 'a7-4': 'public/artworks/sunwoo_train_clouds.png',
  'a7-5': 'public/artworks/sunwoo_dino_school.png', 'a7-6': 'public/artworks/sunwoo_aurora.png',
};

function getArtImage(art) {
  return artworkImages[art.id] || generatePlaceholderImage(art.color, art.title);
}

let lbIndex = 0;
let lbArts = [];
let keyHandler = null;

export function renderArtists(param) {
  if (param) renderDetail(param);
  else renderList();

  return () => {
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
  };
}

// ===== List View =====

function renderList() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="artist-page">
      <div class="sns-header">
        <h1 class="sns-header__title">작가 갤러리</h1>
        <p class="sns-header__sub">어린이 작가들의 작품 세계를 탐험해보세요</p>
      </div>
      <div class="artist-grid">
        ${artists.map((a, i) => {
          const hero = getArtImage(a.artworks[0]);
          return `
            <div class="artist-card glass-card reveal" data-id="${a.id}" style="animation-delay:${i * 0.08}s">
              <div class="artist-card__hero">
                <img src="${hero}" alt="${a.artworks[0].title}" loading="lazy">
                <div class="artist-card__badge">${a.emoji}</div>
              </div>
              <div class="artist-card__body">
                <h3>${a.name} <span class="artist-card__age">${a.age}세</span></h3>
                <p>${a.bio}</p>
                <span class="artist-card__count">${a.artworks.length} 작품</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  content.querySelectorAll('.artist-card').forEach(c =>
    c.addEventListener('click', () => navigateTo(`/artists/${c.dataset.id}`))
  );

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.1 });
  content.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

// ===== Detail View (Album) =====

function renderDetail(id) {
  const a = getArtistById(id);
  if (!a) { navigateTo('/artists'); return; }
  lbArts = a.artworks;

  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="artist-detail">
      <button class="btn btn--ghost" onclick="location.hash='/artists'" style="margin-bottom:var(--space-md);">
        ← 작가 목록
      </button>

      <div class="artist-detail__profile glass-card">
        <div class="artist-detail__avatar">${a.emoji}</div>
        <div class="artist-detail__info">
          <h2>${a.name}</h2>
          <p class="artist-detail__age">${a.age}세</p>
          <p class="artist-detail__bio">${a.bio}</p>
          <span class="artist-card__count">${a.artworks.length} 작품</span>
        </div>
      </div>

      <!-- Hero artwork -->
      ${a.artworks.length > 0 ? `
        <div class="album-hero" data-idx="0">
          <img src="${getArtImage(a.artworks[0])}" alt="${a.artworks[0].title}" loading="lazy">
          <div class="album-hero__info">
            <h3>${a.artworks[0].title}</h3>
            <p>${a.artworks[0].description}</p>
          </div>
        </div>
      ` : ''}

      <!-- Masonry grid -->
      <div class="album-grid">
        ${a.artworks.slice(1).map((art, i) => `
          <div class="album-item" data-idx="${i + 1}">
            <img src="${getArtImage(art)}" alt="${art.title}" loading="lazy">
            <div class="album-item__overlay">
              <span>${art.title}</span>
              <small>${art.description}</small>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Lightbox -->
    <div class="lightbox" id="lightbox" style="display:none;">
      <div class="lightbox__bg" id="lb-bg"></div>
      <button class="lightbox__x" id="lb-close">X</button>
      <button class="lightbox__arrow lightbox__arrow--l" id="lb-prev">&#8249;</button>
      <button class="lightbox__arrow lightbox__arrow--r" id="lb-next">&#8250;</button>
      <div class="lightbox__body">
        <img id="lb-img" src="" alt="">
        <div class="lightbox__meta">
          <h3 id="lb-title"></h3>
          <p id="lb-desc"></p>
          <p id="lb-date" style="font-size:0.75rem;color:var(--text-muted);"></p>
          <div style="margin-top:var(--space-md);display:flex;gap:var(--space-sm);">
            <button class="btn btn--primary btn--sm" id="lb-ai">AI 스튜디오</button>
            <button class="btn btn--ghost btn--sm" id="lb-gallery">3D 갤러리</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Click handlers
  content.querySelectorAll('[data-idx]').forEach(el =>
    el.addEventListener('click', () => openLB(parseInt(el.dataset.idx)))
  );
  document.getElementById('lb-close')?.addEventListener('click', closeLB);
  document.getElementById('lb-bg')?.addEventListener('click', closeLB);
  document.getElementById('lb-prev')?.addEventListener('click', () => navLB(-1));
  document.getElementById('lb-next')?.addEventListener('click', () => navLB(1));
  document.getElementById('lb-ai')?.addEventListener('click', () => { closeLB(); navigateTo('/ai-studio'); });
  document.getElementById('lb-gallery')?.addEventListener('click', () => { closeLB(); navigateTo('/gallery'); });

  keyHandler = (e) => {
    if (document.getElementById('lightbox')?.style.display === 'none') return;
    if (e.key === 'ArrowLeft') navLB(-1);
    else if (e.key === 'ArrowRight') navLB(1);
    else if (e.key === 'Escape') closeLB();
  };
  document.addEventListener('keydown', keyHandler);
}

function openLB(idx) {
  lbIndex = idx;
  updateLB();
  document.getElementById('lightbox').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeLB() {
  document.getElementById('lightbox').style.display = 'none';
  document.body.style.overflow = '';
}

function navLB(dir) {
  lbIndex = (lbIndex + dir + lbArts.length) % lbArts.length;
  updateLB();
}

function updateLB() {
  const art = lbArts[lbIndex];
  document.getElementById('lb-img').src = getArtImage(art);
  document.getElementById('lb-title').textContent = art.title;
  document.getElementById('lb-desc').textContent = art.description;
  document.getElementById('lb-date').textContent = art.date;
}
