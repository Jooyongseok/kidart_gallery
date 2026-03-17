// ============================================================
// AI Studio Page
// ============================================================
import { getAIService } from '../services/ai/index.js';
import { artists, generatePlaceholderImage } from '../data/sample-data.js';
import { showToast } from '../components/navbar.js';

let currentTab = 'story';
let uploadedImage = null;

export function renderAIStudio() {
  const content = document.getElementById('page-content');
  const aiService = getAIService();
  const providerInfo = aiService.getInfo();

  content.innerHTML = `
    <div class="ai-studio">
      <div class="ai-studio__header">
        <h1 class="ai-studio__title">🤖 AI 스튜디오</h1>
        <p class="ai-studio__subtitle">
          AI로 작품을 동화, 애니메이션, 3D로 변환하세요
          <span style="display:block; font-size:0.8rem; color:var(--color-text-dim); margin-top:4px;">
            현재 AI: ${providerInfo.name}
          </span>
        </p>
      </div>

      <div class="ai-tabs" id="ai-tabs">
        <button class="ai-tab ${currentTab === 'story' ? 'active' : ''}" data-tab="story">📖 동화 생성</button>
        <button class="ai-tab ${currentTab === 'animation' ? 'active' : ''}" data-tab="animation">🎬 애니메이션</button>
        <button class="ai-tab ${currentTab === 'convert3d' ? 'active' : ''}" data-tab="convert3d">🧊 2D → 3D</button>
      </div>

      <!-- Story Tab -->
      <div class="ai-panel ${currentTab === 'story' ? 'active' : ''}" id="panel-story">
        <div class="ai-workspace">
          <div class="glass-card ai-input-area">
            <h3>📤 작품 선택</h3>
            ${renderUploadZone('story')}
            ${renderArtworkSelector('story')}
            <button class="btn btn--primary btn--block" id="btn-generate-story" style="margin-top: var(--space-md);">
              ✨ 동화 생성하기
            </button>
          </div>
          <div class="glass-card ai-output-area">
            <h3>📖 생성된 동화</h3>
            <div class="ai-result" id="result-story">
              <p class="ai-result__placeholder">작품을 선택하고 '동화 생성하기'를 클릭하세요</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Animation Tab -->
      <div class="ai-panel ${currentTab === 'animation' ? 'active' : ''}" id="panel-animation">
        <div class="ai-workspace">
          <div class="glass-card ai-input-area">
            <h3>📤 작품 선택</h3>
            ${renderUploadZone('animation')}
            ${renderArtworkSelector('animation')}
            <div class="form-group" style="margin-top: var(--space-md);">
              <label>애니메이션 스타일</label>
              <select class="form-select" id="anim-style">
                <option value="bounce">통통 튀는 모션</option>
                <option value="float">둥실둥실 떠다니기</option>
                <option value="sparkle">반짝반짝 빛나기</option>
                <option value="dance">춤추는 캐릭터</option>
              </select>
            </div>
            <button class="btn btn--primary btn--block" id="btn-generate-animation" style="margin-top: var(--space-md);">
              🎬 애니메이션 만들기
            </button>
          </div>
          <div class="glass-card ai-output-area">
            <h3>🎬 생성된 애니메이션</h3>
            <div class="ai-result" id="result-animation">
              <p class="ai-result__placeholder">작품을 선택하고 '애니메이션 만들기'를 클릭하세요</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 3D Convert Tab -->
      <div class="ai-panel ${currentTab === 'convert3d' ? 'active' : ''}" id="panel-convert3d">
        <div class="ai-workspace">
          <div class="glass-card ai-input-area">
            <h3>📤 작품 선택</h3>
            ${renderUploadZone('convert3d')}
            ${renderArtworkSelector('convert3d')}
            <div class="form-group" style="margin-top: var(--space-md);">
              <label>3D 깊이 설정</label>
              <select class="form-select" id="depth-level">
                <option value="low">얕은 깊이 (1단계)</option>
                <option value="medium" selected>보통 깊이 (2단계)</option>
                <option value="high">깊은 깊이 (3단계)</option>
              </select>
            </div>
            <button class="btn btn--primary btn--block" id="btn-generate-3d" style="margin-top: var(--space-md);">
              🧊 3D 변환하기
            </button>
          </div>
          <div class="glass-card ai-output-area">
            <h3>🧊 3D 미리보기</h3>
            <div class="ai-result" id="result-convert3d">
              <p class="ai-result__placeholder">작품을 선택하고 '3D 변환하기'를 클릭하세요</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  bindTabEvents();
  bindUploadEvents();
  bindGenerateEvents();
}

function renderUploadZone(prefix) {
  return `
    <div class="upload-zone" id="upload-zone-${prefix}">
      <div class="upload-zone__icon">📁</div>
      <p class="upload-zone__text">이미지를 드래그하거나 클릭하여 업로드</p>
      <input type="file" accept="image/*" id="file-input-${prefix}" hidden />
      <img class="upload-zone__preview" id="preview-${prefix}" style="display:none;" />
    </div>
  `;
}

function renderArtworkSelector(prefix) {
  const allArtworks = artists.flatMap(a =>
    a.artworks.map(art => ({ ...art, artistName: a.name }))
  );

  return `
    <div class="form-group" style="margin-top: var(--space-md);">
      <label>또는 기존 작품 선택</label>
      <select class="form-select" id="select-artwork-${prefix}">
        <option value="">-- 작품을 선택하세요 --</option>
        ${allArtworks.map(art => `
          <option value="${art.id}" data-color="${art.color}" data-title="${art.title}">
            ${art.artistName} - ${art.title}
          </option>
        `).join('')}
      </select>
    </div>
  `;
}

function bindTabEvents() {
  document.querySelectorAll('.ai-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentTab = tab.dataset.tab;

      // Update active tab
      document.querySelectorAll('.ai-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Show active panel
      document.querySelectorAll('.ai-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(`panel-${currentTab}`).classList.add('active');
    });
  });
}

function bindUploadEvents() {
  ['story', 'animation', 'convert3d'].forEach(prefix => {
    const zone = document.getElementById(`upload-zone-${prefix}`);
    const input = document.getElementById(`file-input-${prefix}`);
    const preview = document.getElementById(`preview-${prefix}`);

    if (!zone || !input) return;

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.style.borderColor = 'var(--color-primary)';
    });

    zone.addEventListener('dragleave', () => {
      zone.style.borderColor = '';
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.style.borderColor = '';
      if (e.dataTransfer.files.length) {
        handleFileUpload(e.dataTransfer.files[0], preview);
      }
    });

    input.addEventListener('change', () => {
      if (input.files.length) {
        handleFileUpload(input.files[0], preview);
      }
    });
  });
}

function handleFileUpload(file, previewEl) {
  if (!file.type.startsWith('image/')) {
    showToast('이미지 파일만 업로드 가능합니다.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedImage = e.target.result;
    previewEl.src = uploadedImage;
    previewEl.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function getSelectedImage(prefix) {
  // Check if file uploaded
  if (uploadedImage) return uploadedImage;

  // Check if artwork selected
  const select = document.getElementById(`select-artwork-${prefix}`);
  if (select && select.value) {
    const option = select.selectedOptions[0];
    const color = option.dataset.color;
    const title = option.dataset.title;
    return generatePlaceholderImage(color, title);
  }

  return null;
}

function bindGenerateEvents() {
  // Story generation
  const storyBtn = document.getElementById('btn-generate-story');
  if (storyBtn) {
    storyBtn.addEventListener('click', async () => {
      const image = getSelectedImage('story');
      if (!image) {
        showToast('먼저 작품을 선택하거나 이미지를 업로드해주세요.', 'error');
        return;
      }

      const resultEl = document.getElementById('result-story');
      resultEl.innerHTML = `
        <div class="loading-state">
          <div class="spinner"></div>
          <p>AI가 동화를 만들고 있어요... ✨</p>
        </div>
      `;

      try {
        const aiService = getAIService();
        const result = await aiService.generateStory(image);

        resultEl.innerHTML = `
          <div class="ai-result__content">
            <h4 style="font-size: 1.2rem; color: var(--color-accent); margin-bottom: var(--space-md);">
              📖 ${result.title}
            </h4>
            <div class="ai-result__story">${result.story}</div>
          </div>
        `;
        showToast('동화가 생성되었습니다!', 'success');
      } catch (err) {
        resultEl.innerHTML = `<p style="color: var(--color-danger);">오류 발생: ${err.message}</p>`;
        showToast('동화 생성에 실패했습니다.', 'error');
      }
    });
  }

  // Animation generation
  const animBtn = document.getElementById('btn-generate-animation');
  if (animBtn) {
    animBtn.addEventListener('click', async () => {
      const image = getSelectedImage('animation');
      if (!image) {
        showToast('먼저 작품을 선택하거나 이미지를 업로드해주세요.', 'error');
        return;
      }

      const resultEl = document.getElementById('result-animation');
      resultEl.innerHTML = `
        <div class="loading-state">
          <div class="spinner"></div>
          <p>애니메이션을 만들고 있어요... 🎬</p>
        </div>
      `;

      try {
        const style = document.getElementById('anim-style')?.value || 'bounce';
        const aiService = getAIService();
        const result = await aiService.generateAnimation(image, { style });

        // Animate through frames
        let frameIndex = 0;
        resultEl.innerHTML = `
          <div class="ai-result__content" style="text-align: center;">
            <img class="ai-result__image" id="anim-frame" src="${result.frames[0]}" alt="Animation frame" />
            <p style="margin-top: var(--space-sm); font-size: 0.82rem; color: var(--color-text-muted);">
              프레임: <span id="frame-counter">1</span> / ${result.frames.length}
            </p>
            <div style="margin-top: var(--space-md); display: flex; gap: var(--space-sm); justify-content: center;">
              <button class="btn btn--secondary btn--sm" id="anim-play">▶️ 재생</button>
              <button class="btn btn--secondary btn--sm" id="anim-stop">⏹️ 정지</button>
            </div>
          </div>
        `;

        let playInterval = null;
        document.getElementById('anim-play').addEventListener('click', () => {
          if (playInterval) return;
          playInterval = setInterval(() => {
            frameIndex = (frameIndex + 1) % result.frames.length;
            const frameEl = document.getElementById('anim-frame');
            const counterEl = document.getElementById('frame-counter');
            if (frameEl) frameEl.src = result.frames[frameIndex];
            if (counterEl) counterEl.textContent = frameIndex + 1;
          }, 200);
        });

        document.getElementById('anim-stop').addEventListener('click', () => {
          if (playInterval) {
            clearInterval(playInterval);
            playInterval = null;
          }
        });

        showToast('애니메이션이 생성되었습니다!', 'success');
      } catch (err) {
        resultEl.innerHTML = `<p style="color: var(--color-danger);">오류 발생: ${err.message}</p>`;
        showToast('애니메이션 생성에 실패했습니다.', 'error');
      }
    });
  }

  // 3D conversion
  const convertBtn = document.getElementById('btn-generate-3d');
  if (convertBtn) {
    convertBtn.addEventListener('click', async () => {
      const image = getSelectedImage('convert3d');
      if (!image) {
        showToast('먼저 작품을 선택하거나 이미지를 업로드해주세요.', 'error');
        return;
      }

      const resultEl = document.getElementById('result-convert3d');
      resultEl.innerHTML = `
        <div class="loading-state">
          <div class="spinner"></div>
          <p>2D를 3D로 변환하고 있어요... 🧊</p>
        </div>
      `;

      try {
        const depth = document.getElementById('depth-level')?.value || 'medium';
        const aiService = getAIService();
        const result = await aiService.convert2Dto3D(image, { depth });

        // Render 3D preview with CSS 3D transforms
        resultEl.innerHTML = `
          <div class="ai-result__content" style="text-align: center;">
            <div id="preview-3d-container" style="
              perspective: 800px;
              width: 100%;
              height: 250px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: var(--space-md);
            ">
              <div id="preview-3d-box" style="
                width: 200px;
                height: 150px;
                position: relative;
                transform-style: preserve-3d;
                transition: transform 0.1s;
              ">
                <!-- Front face -->
                <div style="
                  position: absolute; inset: 0;
                  background-image: url(${image});
                  background-size: cover;
                  background-position: center;
                  transform: translateZ(${depth === 'low' ? '15' : depth === 'high' ? '40' : '25'}px);
                  border-radius: 4px;
                  box-shadow: 0 0 20px rgba(124,92,252,0.3);
                "></div>
                <!-- Back face -->
                <div style="
                  position: absolute; inset: 0;
                  background: var(--color-surface-solid);
                  transform: translateZ(-${depth === 'low' ? '15' : depth === 'high' ? '40' : '25'}px) rotateY(180deg);
                  border-radius: 4px;
                "></div>
                <!-- Side faces -->
                <div style="
                  position: absolute; top: 0; left: 0;
                  width: ${depth === 'low' ? '30' : depth === 'high' ? '80' : '50'}px;
                  height: 150px;
                  background: var(--gradient-card);
                  transform: rotateY(-90deg) translateZ(0px);
                  transform-origin: left center;
                  border-radius: 4px;
                "></div>
              </div>
            </div>

            <h4 style="color: var(--color-primary-light); margin-bottom: var(--space-sm);">
              3D 변환 완료! 🎉
            </h4>

            <div style="
              background: rgba(255,255,255,0.04);
              border-radius: var(--radius-sm);
              padding: var(--space-md);
              text-align: left;
              font-size: 0.85rem;
              color: var(--color-text-muted);
            ">
              <p><strong>형식:</strong> ${result.modelData.format}</p>
              <p><strong>정점수:</strong> ${result.modelData.vertices.toLocaleString()}</p>
              <p><strong>면 수:</strong> ${result.modelData.faces.toLocaleString()}</p>
              <p><strong>크기:</strong> ${result.meshInfo.width} × ${result.meshInfo.height} × ${result.meshInfo.depth}</p>
              <p style="margin-top: var(--space-sm); font-style: italic; color: var(--color-text-dim);">
                ${result.meshInfo.note}
              </p>
            </div>

            <p style="margin-top: var(--space-md); font-size: 0.82rem; color: var(--color-text-dim);">
              마우스를 위에 올려 3D 회전을 해보세요
            </p>
          </div>
        `;

        // Interactive 3D rotation
        const box = document.getElementById('preview-3d-box');
        const container3d = document.getElementById('preview-3d-container');
        if (box && container3d) {
          container3d.addEventListener('mousemove', (e) => {
            const rect = container3d.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width - 0.5) * 40;
            const y = ((e.clientY - rect.top) / rect.height - 0.5) * -30;
            box.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
          });

          container3d.addEventListener('mouseleave', () => {
            box.style.transform = 'rotateY(0deg) rotateX(0deg)';
          });
        }

        showToast('3D 변환이 완료되었습니다!', 'success');
      } catch (err) {
        resultEl.innerHTML = `<p style="color: var(--color-danger);">오류 발생: ${err.message}</p>`;
        showToast('3D 변환에 실패했습니다.', 'error');
      }
    });
  }
}
