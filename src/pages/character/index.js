// ============================================================
// Character Gallery — 추출된 캐릭터 관리 페이지
// ============================================================
import { CharacterAPI } from '../../services/api.js';
import { navigateTo } from '../../router.js';

export function renderCharacterGallery() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="character-page">
      <div class="character-header">
        <div>
          <h1 class="character-title">내 캐릭터</h1>
          <p class="character-subtitle">그림에서 추출한 캐릭터들을 관리하세요</p>
        </div>
        <button class="btn-primary" id="btn-new-character">
          + 새 캐릭터 추출
        </button>
      </div>
      <div class="character-grid" id="character-grid">
        <div class="character-loading">캐릭터를 불러오는 중...</div>
      </div>
    </div>
  `;

  document.getElementById('btn-new-character').addEventListener('click', () => {
    navigateTo('/character-extract');
  });

  loadCharacters();
}

async function loadCharacters() {
  const grid = document.getElementById('character-grid');

  try {
    const data = await CharacterAPI.list();
    const characters = data.characters || [];

    if (characters.length === 0) {
      grid.innerHTML = `
        <div class="character-empty">
          <div class="character-empty-icon">🎨</div>
          <h3>아직 추출된 캐릭터가 없어요</h3>
          <p>그림을 업로드하면 AI가 캐릭터를 자동으로 추출합니다</p>
          <button class="btn-primary" onclick="window.location.hash='#/character-extract'">
            첫 캐릭터 추출하기
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = characters.map(char => `
      <div class="character-card" data-id="${char.id}">
        <div class="character-card-image">
          ${char.thumbnail_path
            ? `<img src="${getImageUrl(char.thumbnail_path)}" alt="${char.name}" />`
            : `<div class="character-card-placeholder">🎭</div>`
          }
        </div>
        <div class="character-card-info">
          <h3 class="character-card-name">${char.name}</h3>
          <div class="character-card-tags">
            ${(char.style_tags || []).slice(0, 3).map(t =>
              `<span class="character-tag">${t}</span>`
            ).join('')}
          </div>
          <div class="character-card-date">${formatDate(char.created_at)}</div>
        </div>
        <div class="character-card-actions">
          <button class="btn-sm btn-ghost" data-action="story" data-id="${char.id}" title="동화 생성">
            📖
          </button>
          <button class="btn-sm btn-ghost" data-action="compare" data-id="${char.id}" title="Provider 비교">
            🔬
          </button>
          <button class="btn-sm btn-ghost btn-danger" data-action="delete" data-id="${char.id}" title="삭제">
            🗑️
          </button>
        </div>
      </div>
    `).join('');

    // 이벤트 바인딩
    grid.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === 'story') navigateTo(`/ai-studio?character=${id}`);
        if (action === 'compare') showCompareModal(id);
        if (action === 'delete') deleteCharacter(id);
      });
    });

    grid.querySelectorAll('.character-card').forEach(card => {
      card.addEventListener('click', () => {
        showCharacterDetail(card.dataset.id);
      });
    });

  } catch (err) {
    grid.innerHTML = `
      <div class="character-error">
        <p>캐릭터를 불러올 수 없습니다</p>
        <p class="text-muted">${err.message}</p>
      </div>
    `;
  }
}

async function showCharacterDetail(id) {
  try {
    const char = await CharacterAPI.get(id);
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content character-detail-modal">
        <button class="modal-close">&times;</button>
        <div class="character-detail-grid">
          <div class="character-detail-image">
            ${char.extracted_image_path
              ? `<img src="${getImageUrl(char.extracted_image_path)}" alt="${char.name}" />`
              : `<div class="character-card-placeholder large">🎭</div>`
            }
          </div>
          <div class="character-detail-info">
            <h2>${char.name}</h2>
            <div class="character-detail-section">
              <h4>일관성 프롬프트</h4>
              <p class="character-prompt">${char.consistency_prompt}</p>
            </div>
            <div class="character-detail-section">
              <h4>분석 상세</h4>
              <pre class="character-analysis">${JSON.stringify(char.description, null, 2)}</pre>
            </div>
            <div class="character-detail-section">
              <h4>스타일 태그</h4>
              <div class="character-card-tags">
                ${(char.style_tags || []).map(t =>
                  `<span class="character-tag">${t}</span>`
                ).join('')}
              </div>
            </div>
            <div class="character-detail-actions">
              <button class="btn-primary" onclick="window.location.hash='#/ai-studio?character=${char.id}'">
                📖 이 캐릭터로 동화 생성
              </button>
              <button class="btn-secondary" id="btn-download-char">
                ⬇️ 캐릭터 다운로드 (PNG)
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    const dlBtn = modal.querySelector('#btn-download-char');
    if (dlBtn && char.extracted_image_path) {
      dlBtn.addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = getImageUrl(char.extracted_image_path);
        a.download = `${char.name}_character.png`;
        a.click();
      });
    }
  } catch (err) {
    alert(`캐릭터 조회 실패: ${err.message}`);
  }
}

async function deleteCharacter(id) {
  if (!confirm('이 캐릭터를 삭제하시겠습니까?')) return;
  try {
    await CharacterAPI.delete(id);
    loadCharacters();
  } catch (err) {
    alert(`삭제 실패: ${err.message}`);
  }
}

async function showCompareModal(id) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content compare-modal">
      <button class="modal-close">&times;</button>
      <h2>Provider 비교</h2>
      <div class="compare-form">
        <label>장면 설명 (영어)</label>
        <input type="text" id="compare-scene" value="A cheerful scene in a sunny meadow with flowers"
               class="input-field" />
        <button class="btn-primary" id="btn-run-compare">비교 생성 시작</button>
      </div>
      <div class="compare-results" id="compare-results"></div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  modal.querySelector('#btn-run-compare').addEventListener('click', async () => {
    const scene = modal.querySelector('#compare-scene').value;
    const resultsDiv = modal.querySelector('#compare-results');
    resultsDiv.innerHTML = '<div class="character-loading">생성 중... (1~2분 소요)</div>';

    try {
      const data = await CharacterAPI.compare(id, scene);
      const comparison = data.comparison || {};

      resultsDiv.innerHTML = Object.entries(comparison).map(([provider, result]) => `
        <div class="compare-item">
          <h4>${provider}</h4>
          ${result.image_url
            ? `<img src="${result.image_url}" alt="${provider}" class="compare-image" />`
            : `<div class="compare-error">${result.error || '생성 실패'}</div>`
          }
        </div>
      `).join('');
    } catch (err) {
      resultsDiv.innerHTML = `<div class="character-error">${err.message}</div>`;
    }
  });
}

function getImageUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = window.__KIDART_API_URL__ || 'http://localhost:8200';
  // uploads/ 경로를 서빙
  if (path.startsWith('uploads/')) return `${base}/${path}`;
  if (path.startsWith('/uploads/')) return `${base}${path}`;
  return `${base}/uploads/${path}`;
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}
