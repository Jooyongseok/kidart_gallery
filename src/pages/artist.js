// ============================================================
// Artist Portfolio Page
// ============================================================
import { artists, getArtistById, generatePlaceholderImage } from '../data/sample-data.js';
import { navigateTo } from '../router.js';

let currentView = 'list'; // 'list' or 'detail'
let selectedArtistId = null;

export function renderArtists(param) {
  if (param) {
    selectedArtistId = param;
    currentView = 'detail';
  } else {
    currentView = 'list';
    selectedArtistId = null;
  }

  const content = document.getElementById('page-content');

  if (currentView === 'detail' && selectedArtistId) {
    renderArtistDetail(content);
  } else {
    renderArtistList(content);
  }
}

function renderArtistList(content) {
  content.innerHTML = `
    <div class="artist-page">
      <div class="artist-page__header">
        <h1 class="artist-page__title">👨‍🎨 어린이 작가</h1>
        <p class="artist-page__subtitle">우리의 어린 예술가들을 만나보세요</p>
      </div>

      <div class="artists-grid" id="artists-grid">
        ${artists.map((artist, i) => `
          <div class="glass-card artist-card" data-artist-id="${artist.id}" style="animation: fadeInUp 0.4s ${i * 0.08}s ease forwards; opacity: 0;">
            <div class="artist-card__avatar">${artist.emoji}</div>
            <h3 class="artist-card__name">${artist.name}</h3>
            <p class="artist-card__age">${artist.age}세</p>
            <p class="artist-card__count">작품 ${artist.artworks.length}점</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Click events
  content.querySelectorAll('.artist-card').forEach(card => {
    card.addEventListener('click', () => {
      navigateTo(`/artists/${card.dataset.artistId}`);
    });
  });
}

function renderArtistDetail(content) {
  const artist = getArtistById(selectedArtistId);
  if (!artist) {
    navigateTo('/artists');
    return;
  }

  content.innerHTML = `
    <div class="artist-page artist-detail">
      <button class="btn btn--secondary artist-detail__back" id="back-to-artists">
        ← 작가 목록
      </button>

      <div class="glass-card artist-detail__profile">
        <div class="artist-detail__avatar">${artist.emoji}</div>
        <div>
          <h2 class="artist-detail__name">${artist.name}</h2>
          <p class="artist-detail__bio">${artist.age}세 · ${artist.bio}</p>
        </div>
      </div>

      <h3 style="font-size: 1.3rem; margin-bottom: var(--space-lg);">
        🖼️ 작품 갤러리 <span style="color: var(--color-text-muted); font-weight: 400; font-size: 0.9rem;">(${artist.artworks.length}점)</span>
      </h3>

      <div class="artworks-grid" id="artworks-grid">
        ${artist.artworks.map((art, i) => `
          <div class="glass-card artwork-card" data-artwork-id="${art.id}" style="animation: fadeInUp 0.4s ${i * 0.1}s ease forwards; opacity: 0;">
            <div class="artwork-card__image-wrap" style="overflow: hidden; border-radius: var(--radius-sm) var(--radius-sm) 0 0;">
              <img class="artwork-card__image" src="${generatePlaceholderImage(art.color, art.title)}" alt="${art.title}" loading="lazy" />
            </div>
            <div class="artwork-card__info">
              <h4 class="artwork-card__title">${art.title}</h4>
              <p class="artwork-card__date">${art.date}</p>
              <p style="font-size: 0.82rem; color: var(--color-text-muted); margin-top: 4px;">${art.description}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('back-to-artists').addEventListener('click', () => {
    navigateTo('/artists');
  });

  // Artwork click → modal
  content.querySelectorAll('.artwork-card').forEach(card => {
    card.addEventListener('click', () => {
      const artId = card.dataset.artworkId;
      const artwork = artist.artworks.find(a => a.id === artId);
      if (artwork) showArtworkModal(artwork, artist);
    });
  });
}

function showArtworkModal(artwork, artist) {
  // Create modal backdrop
  const existing = document.querySelector('.modal-backdrop');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop show';
  backdrop.innerHTML = `
    <div class="modal">
      <button class="modal__close" id="modal-close-btn">✕</button>
      <img src="${generatePlaceholderImage(artwork.color, artwork.title)}" alt="${artwork.title}"
           style="width:100%; border-radius: var(--radius-sm); margin-bottom: var(--space-md);" />
      <h2 style="font-size: 1.5rem; margin-bottom: var(--space-xs);">${artwork.title}</h2>
      <p style="color: var(--color-accent); margin-bottom: var(--space-md);">
        ${artist.emoji} ${artist.name} · ${artist.age}세
      </p>
      <p style="color: var(--color-text-muted); line-height: 1.7; margin-bottom: var(--space-lg);">
        ${artwork.description}
      </p>
      <p style="font-size: 0.82rem; color: var(--color-text-dim);">
        📅 ${artwork.date}
      </p>
      <div style="margin-top: var(--space-lg); display: flex; gap: var(--space-sm);">
        <button class="btn btn--primary btn--sm" id="modal-to-ai">🤖 AI 스튜디오로 보내기</button>
        <button class="btn btn--secondary btn--sm" id="modal-to-gallery">🏛️ 갤러리에서 보기</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  // Close modal
  const closeModal = () => backdrop.remove();
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  // Navigate to AI studio
  document.getElementById('modal-to-ai').addEventListener('click', () => {
    closeModal();
    navigateTo('/ai-studio');
  });

  // Navigate to gallery
  document.getElementById('modal-to-gallery').addEventListener('click', () => {
    closeModal();
    navigateTo('/gallery');
  });
}
