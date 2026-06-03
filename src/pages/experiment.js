// ============================================================
// Experiment Lab — Provider A/B 비교 실험 대시보드
// 모든 이미지 생성 provider를 실험하고 비교하는 전용 페이지
// ============================================================
import { CharacterAPI } from '../services/api.js';
import { navigateTo } from '../router.js';
import { showToast } from '../components/navbar.js';

const API_BASE = window.__KIDART_API_URL__ || 'http://localhost:8200';

function getHeaders() {
  const headers = {};
  const token = localStorage.getItem('kidart_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function renderExperimentLab() {
  const content = document.getElementById('page-content');

  content.innerHTML = `
    <div class="experiment-page">
      <div class="experiment-header">
        <div>
          <h1 class="character-title">Experiment Lab</h1>
          <p class="character-subtitle">AI 이미지 생성 Provider를 실험하고 비교하세요</p>
        </div>
      </div>

      <!-- Provider 상태 -->
      <div class="experiment-section">
        <h2>Provider 상태</h2>
        <div class="provider-grid" id="provider-grid">
          <div class="character-loading">Provider 목록 로딩 중...</div>
        </div>
      </div>

      <!-- 실험 설정 -->
      <div class="experiment-section">
        <h2>실험 설정</h2>
        <div class="experiment-config">
          <div class="config-row">
            <div class="form-group" style="flex:1;">
              <label>캐릭터 참조</label>
              <select id="exp-character" class="input-field">
                <option value="">참조 없이 (텍스트만)</option>
              </select>
            </div>
            <div class="form-group" style="flex:0 0 auto;">
              <label>또는 이미지 직접 업로드</label>
              <input type="file" id="exp-image" accept="image/*" class="input-field" />
            </div>
          </div>
          <div class="form-group">
            <label>장면 설명 (Scene Prompt)</label>
            <textarea id="exp-scene" class="input-field" rows="3"
              placeholder="A cheerful scene in a sunny meadow with flowers, cute storybook illustration">A cheerful scene in a sunny meadow with flowers, cute storybook illustration, children's drawing style</textarea>
          </div>
          <div class="form-group">
            <label>시드 (Seed)</label>
            <input type="number" id="exp-seed" class="input-field" value="42" min="0" max="99999" style="width:120px;" />
          </div>
        </div>
      </div>

      <!-- 단일 생성 -->
      <div class="experiment-section">
        <h2>단일 Provider 테스트</h2>
        <div class="single-test-row">
          <select id="single-provider" class="input-field" style="width:auto;"></select>
          <button class="btn-primary" id="btn-single-test">생성</button>
        </div>
        <div id="single-result" class="single-result"></div>
      </div>

      <!-- A/B 비교 -->
      <div class="experiment-section">
        <h2>Provider 비교 (A/B Test)</h2>
        <div class="compare-select-row" id="compare-checkboxes"></div>
        <button class="btn-primary" id="btn-compare" style="margin-top:12px;">선택한 Provider 비교 생성</button>
        <div id="compare-results" class="compare-results"></div>
      </div>

      <!-- 배경 제거 비교 -->
      <div class="experiment-section">
        <h2>배경 제거 비교 (rembg vs BiRefNet)</h2>
        <div class="extract-test-row">
          <input type="file" id="extract-image" accept="image/*" class="input-field" />
          <button class="btn-primary" id="btn-extract-test">비교</button>
        </div>
        <div id="extract-results" class="compare-results"></div>
      </div>
    </div>
  `;

  await loadProviders();
  await loadCharacters();
  bindEvents();
}

async function loadProviders() {
  const grid = document.getElementById('provider-grid');
  const singleSelect = document.getElementById('single-provider');
  const checkboxes = document.getElementById('compare-checkboxes');

  try {
    const resp = await fetch(`${API_BASE}/api/providers`);
    const data = await resp.json();
    const providers = data.providers;
    const defaultProvider = data.default;

    grid.innerHTML = Object.entries(providers).map(([key, p]) => `
      <div class="provider-card ${p.available ? '' : 'unavailable'}">
        <div class="provider-card-header">
          <span class="provider-name">${p.name}</span>
          <span class="provider-status ${p.available ? 'active' : 'inactive'}">
            ${p.available ? 'Active' : 'No API Key'}
          </span>
        </div>
        <div class="provider-meta">
          <span>일관성: ${'★'.repeat(Math.floor(p.consistency))}${'☆'.repeat(5 - Math.floor(p.consistency))}</span>
          <span>참조이미지: ${p.ref_image ? 'Yes' : 'No'}</span>
          <span>비용: ${p.cost}</span>
        </div>
        <p class="provider-desc">${p.description}</p>
        ${key === defaultProvider ? '<span class="provider-default">Default</span>' : ''}
      </div>
    `).join('');

    // 단일 테스트 드롭다운
    singleSelect.innerHTML = Object.entries(providers)
      .filter(([, p]) => p.available)
      .map(([key, p]) => `<option value="${key}" ${key === defaultProvider ? 'selected' : ''}>${p.name}</option>`)
      .join('');

    // 비교 체크박스
    checkboxes.innerHTML = Object.entries(providers).map(([key, p]) => `
      <label class="compare-checkbox ${p.available ? '' : 'unavailable'}">
        <input type="checkbox" value="${key}" ${p.available ? 'checked' : 'disabled'} />
        <span>${p.name}</span>
        <small>${p.cost}</small>
      </label>
    `).join('');

  } catch (err) {
    grid.innerHTML = `<div class="character-error">Provider 로딩 실패: ${err.message}</div>`;
  }
}

async function loadCharacters() {
  const select = document.getElementById('exp-character');
  try {
    const data = await CharacterAPI.list();
    const chars = data.characters || [];
    chars.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name} (${(c.style_tags || []).join(', ')})`;
      select.appendChild(opt);
    });
  } catch {
    // not logged in or no characters
  }
}

function getExperimentParams() {
  return {
    characterId: document.getElementById('exp-character')?.value || '',
    scene: document.getElementById('exp-scene')?.value || '',
    seed: parseInt(document.getElementById('exp-seed')?.value || '42'),
    imageFile: document.getElementById('exp-image')?.files?.[0] || null,
  };
}

function bindEvents() {
  // 단일 테스트
  document.getElementById('btn-single-test')?.addEventListener('click', async () => {
    const provider = document.getElementById('single-provider').value;
    const params = getExperimentParams();
    const resultDiv = document.getElementById('single-result');
    resultDiv.innerHTML = '<div class="character-loading">생성 중... (10~60초)</div>';

    try {
      const formData = new FormData();
      if (params.characterId) formData.append('character_id', params.characterId);
      if (params.imageFile) formData.append('image', params.imageFile);
      formData.append('scene', params.scene);
      formData.append('provider', provider);
      formData.append('seed', params.seed);

      const resp = await fetch(`${API_BASE}/api/experiment/single`, {
        method: 'POST', headers: getHeaders(), body: formData,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'Failed');

      const r = data.result;
      resultDiv.innerHTML = `
        <div class="single-result-card">
          <img src="${r.image_url}" alt="Generated" class="experiment-image" crossorigin="anonymous" />
          <div class="result-meta">
            <strong>${data.provider}</strong>
            <details><summary>프롬프트</summary><p class="character-prompt">${r.prompt || ''}</p></details>
          </div>
        </div>
      `;
    } catch (err) {
      resultDiv.innerHTML = `<div class="character-error">${err.message}</div>`;
    }
  });

  // 비교 테스트
  document.getElementById('btn-compare')?.addEventListener('click', async () => {
    const checked = [...document.querySelectorAll('#compare-checkboxes input:checked')].map(cb => cb.value);
    if (checked.length === 0) { showToast('Provider를 선택하세요', 'error'); return; }

    const params = getExperimentParams();
    const resultsDiv = document.getElementById('compare-results');
    resultsDiv.innerHTML = `<div class="character-loading">${checked.length}개 provider로 생성 중... (최대 2~3분)</div>`;

    try {
      const formData = new FormData();
      if (params.characterId) formData.append('character_id', params.characterId);
      if (params.imageFile) formData.append('image', params.imageFile);
      formData.append('scene', params.scene);
      formData.append('providers', checked.join(','));

      const resp = await fetch(`${API_BASE}/api/experiment/compare`, {
        method: 'POST', headers: getHeaders(), body: formData,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'Failed');

      const comparison = data.comparison || {};
      resultsDiv.innerHTML = Object.entries(comparison).map(([provider, r]) => `
        <div class="compare-item">
          <h4>${provider}</h4>
          ${r.image_url
            ? `<img src="${r.image_url}" alt="${provider}" class="compare-image" crossorigin="anonymous"
                onerror="this.parentElement.innerHTML='<div class=compare-error>이미지 로드 실패</div>'" />`
            : `<div class="compare-error">${r.error || '생성 실패'}</div>`
          }
          <div class="compare-item-meta">
            <small>${r.provider || provider}</small>
          </div>
        </div>
      `).join('');
    } catch (err) {
      resultsDiv.innerHTML = `<div class="character-error">${err.message}</div>`;
    }
  });

  // 배경 제거 비교
  document.getElementById('btn-extract-test')?.addEventListener('click', async () => {
    const file = document.getElementById('extract-image')?.files?.[0];
    if (!file) { showToast('이미지를 선택하세요', 'error'); return; }

    const resultsDiv = document.getElementById('extract-results');
    resultsDiv.innerHTML = '<div class="character-loading">rembg + BiRefNet 비교 중...</div>';

    try {
      const results = await Promise.allSettled([
        extractWith(file, 'rembg'),
        extractWith(file, 'birefnet'),
      ]);

      resultsDiv.innerHTML = `
        <div class="compare-item">
          <h4>Original</h4>
          <img src="${URL.createObjectURL(file)}" class="compare-image" />
        </div>
        ${results.map((r, i) => {
          const method = i === 0 ? 'rembg' : 'BiRefNet';
          if (r.status === 'fulfilled') {
            return `<div class="compare-item">
              <h4>${method}</h4>
              <div class="compare-item-meta"><small>${r.value.method} | ${r.value.width}x${r.value.height}</small></div>
              <div class="compare-item-meta"><small>Data size: ${r.value.full_b64_length} bytes</small></div>
            </div>`;
          }
          return `<div class="compare-item"><h4>${method}</h4><div class="compare-error">${r.reason?.message || 'Failed'}</div></div>`;
        }).join('')}
      `;
    } catch (err) {
      resultsDiv.innerHTML = `<div class="character-error">${err.message}</div>`;
    }
  });
}

async function extractWith(file, method) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('method', method);
  const resp = await fetch(`${API_BASE}/api/experiment/extract`, {
    method: 'POST', headers: getHeaders(), body: formData,
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.detail || 'Failed');
  return data;
}
