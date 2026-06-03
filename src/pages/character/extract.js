// ============================================================
// Character Extract — 이미지에서 캐릭터 추출 UI
// ============================================================
import { CharacterAPI } from '../../services/api.js';
import { navigateTo } from '../../router.js';

export function renderCharacterExtract() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="character-page">
      <div class="character-header">
        <div>
          <h1 class="character-title">캐릭터 추출</h1>
          <p class="character-subtitle">그림을 업로드하면 AI가 캐릭터를 인식하고 추출합니다</p>
        </div>
        <button class="btn-ghost" onclick="window.location.hash='#/characters'">
          ← 캐릭터 목록
        </button>
      </div>

      <div class="extract-container">
        <!-- 업로드 영역 -->
        <div class="extract-upload-zone" id="upload-zone">
          <div class="upload-icon">🖼️</div>
          <h3>그림을 여기에 드래그하거나 클릭하세요</h3>
          <p class="text-muted">JPG, PNG (최대 10MB)</p>
          <input type="file" id="file-input" accept="image/*" hidden />
        </div>

        <!-- 미리보기 + 결과 -->
        <div class="extract-preview" id="extract-preview" style="display:none;">
          <div class="extract-columns">
            <div class="extract-col">
              <h3>원본 이미지</h3>
              <img id="original-preview" class="extract-img" />
            </div>
            <div class="extract-col">
              <h3>추출된 캐릭터</h3>
              <div id="extracted-preview" class="extract-img-container">
                <div class="character-loading">추출 중...</div>
              </div>
            </div>
          </div>

          <div class="extract-form" id="extract-form" style="display:none;">
            <div class="form-group">
              <label>캐릭터 이름</label>
              <input type="text" id="char-name" class="input-field" placeholder="AI가 제안한 이름이 자동으로 입력됩니다" />
            </div>
            <div class="extract-analysis" id="extract-analysis"></div>
            <div class="extract-actions">
              <button class="btn-primary" id="btn-save-char">캐릭터 저장</button>
              <button class="btn-ghost" id="btn-retry">다시 시도</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  setupUpload();
}

function setupUpload() {
  const zone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');

  zone.addEventListener('click', () => fileInput.click());
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });
}

async function handleFile(file) {
  const zone = document.getElementById('upload-zone');
  const preview = document.getElementById('extract-preview');
  const originalImg = document.getElementById('original-preview');
  const extractedDiv = document.getElementById('extracted-preview');
  const form = document.getElementById('extract-form');

  // 원본 미리보기
  zone.style.display = 'none';
  preview.style.display = 'block';
  originalImg.src = URL.createObjectURL(file);
  extractedDiv.innerHTML = '<div class="character-loading">AI가 캐릭터를 추출하고 분석 중입니다...<br><small>30초~1분 소요</small></div>';
  form.style.display = 'none';

  try {
    const data = await CharacterAPI.extract(file);
    const char = data.character;

    // 추출 결과 표시
    if (char.extracted_image_path) {
      const base = window.__KIDART_API_URL__ || 'http://localhost:8200';
      let imgUrl = char.extracted_image_path;
      if (!imgUrl.startsWith('http')) {
        imgUrl = imgUrl.startsWith('/') ? `${base}${imgUrl}` : `${base}/${imgUrl}`;
      }
      extractedDiv.innerHTML = `<img src="${imgUrl}" class="extract-img checkerboard" />`;
    } else {
      extractedDiv.innerHTML = '<div class="character-loading">추출 이미지 없음 (원본 사용)</div>';
    }

    // 폼 표시
    form.style.display = 'block';
    document.getElementById('char-name').value = char.name || '';

    // 분석 결과
    const analysisDiv = document.getElementById('extract-analysis');
    const desc = char.description || {};
    analysisDiv.innerHTML = `
      <div class="analysis-card">
        <h4>AI 분석 결과</h4>
        ${desc.hair ? `<p><strong>머리:</strong> ${desc.hair.color || ''} ${desc.hair.style || ''}</p>` : ''}
        ${desc.clothing ? `<p><strong>옷:</strong> ${desc.clothing.top || ''}, ${desc.clothing.bottom || ''}</p>` : ''}
        ${desc.art_style ? `<p><strong>화풍:</strong> ${desc.art_style}</p>` : ''}
        ${desc.distinctive_features ? `<p><strong>특징:</strong> ${desc.distinctive_features.join(', ')}</p>` : ''}
        <details>
          <summary>일관성 프롬프트 보기</summary>
          <p class="character-prompt">${char.consistency_prompt || ''}</p>
        </details>
      </div>
    `;

    // 저장은 이미 완료 (extract API가 저장까지 함)
    document.getElementById('btn-save-char').textContent = '캐릭터 목록으로 이동';
    document.getElementById('btn-save-char').addEventListener('click', () => {
      navigateTo('/characters');
    });

    document.getElementById('btn-retry').addEventListener('click', () => {
      preview.style.display = 'none';
      zone.style.display = 'flex';
    });

  } catch (err) {
    extractedDiv.innerHTML = `
      <div class="character-error">
        <p>추출 실패</p>
        <p class="text-muted">${err.message}</p>
        <button class="btn-ghost" onclick="location.reload()">다시 시도</button>
      </div>
    `;
  }
}
