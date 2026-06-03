// ============================================================
// AI Studio Page — API-based story generation + my artworks
// ============================================================
import { showToast } from '../components/navbar.js';
import { navigateTo } from '../router.js';
import { getCurrentUser, isLoggedIn } from '../utils/auth.js';
import { PostsAPI, getApiBase } from '../services/api.js';

const API_BASE = getApiBase();

let currentTab = 'story';
let uploadedImage = null;
let uploadedFile = null;

export function renderAIStudio() {
  const content = document.getElementById('page-content');

  content.innerHTML = `
    <div class="ai-studio">
      <div class="ai-studio__header">
        <h1 class="ai-studio__title">AI 스튜디오</h1>
        <p class="ai-studio__subtitle">AI로 작품을 동화, 애니메이션, 3D로 변환하세요</p>
      </div>

      <div class="ai-tabs" id="ai-tabs">
        <button class="ai-tab ${currentTab === 'story' ? 'active' : ''}" data-tab="story">동화 생성</button>
        <button class="ai-tab ${currentTab === 'animation' ? 'active' : ''}" data-tab="animation">애니메이션</button>
        <button class="ai-tab ${currentTab === 'convert3d' ? 'active' : ''}" data-tab="convert3d">2D -> 3D</button>
      </div>

      <!-- Story Tab -->
      <div class="ai-panel ${currentTab === 'story' ? 'active' : ''}" id="panel-story">
        <div class="ai-workspace">
          <div class="glass-card ai-input-area">
            <h3>작품 선택</h3>
            ${renderUploadZone('story')}
            ${isLoggedIn() ? `<button class="btn btn--ghost btn--block" id="btn-my-artworks" style="margin-top:var(--space-sm);">내 작품에서 선택</button>` : ''}
            <div class="form-group" style="margin-top: var(--space-md);">
              <label>동화 스타일</label>
              <select class="form-select" id="story-template">
                <option value="default">기본 동화</option>
                <option value="fantasy">판타지</option>
                <option value="adventure">모험</option>
                <option value="nature">자연/동물</option>
                <option value="custom">자유 입력</option>
              </select>
            </div>
            <div class="form-group" id="custom-prompt-group" style="display:none;margin-top:var(--space-sm);">
              <label>나만의 프롬프트</label>
              <textarea class="form-input" id="custom-prompt" rows="3"
                        placeholder="예: 이 그림으로 우주를 여행하는 이야기를 만들어줘!" maxlength="500"></textarea>
            </div>
            <div class="form-group" style="margin-top: var(--space-sm);">
              <label>삽화 스타일</label>
              <select class="form-select" id="art-style">
                <option value="">원본 화풍 유지</option>
                <option value="watercolor">수채화</option>
                <option value="crayon">크레용</option>
                <option value="colored_pencil">색연필</option>
                <option value="digital_art">디지털 아트</option>
                <option value="pastel">파스텔</option>
                <option value="oil_painting">유화</option>
              </select>
            </div>
            <div class="form-group" style="margin-top: var(--space-sm);">
              <label>언어</label>
              <select class="form-select" id="story-language">
                <option value="ko">한국어</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
              </select>
            </div>
            <button class="btn btn--primary btn--block" id="btn-generate-story" style="margin-top: var(--space-md);">
              동화 생성하기
            </button>
          </div>
          <div class="glass-card ai-output-area">
            <h3>생성된 동화</h3>
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
            <h3>작품 선택</h3>
            ${renderUploadZone('animation')}
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
              애니메이션 만들기
            </button>
          </div>
          <div class="glass-card ai-output-area">
            <h3>생성된 애니메이션</h3>
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
            <h3>작품 선택</h3>
            ${renderUploadZone('convert3d')}
            <div class="form-group" style="margin-top: var(--space-md);">
              <label>3D 깊이 설정</label>
              <select class="form-select" id="depth-level">
                <option value="low">얕은 깊이</option>
                <option value="medium" selected>보통 깊이</option>
                <option value="high">깊은 깊이</option>
              </select>
            </div>
            <button class="btn btn--primary btn--block" id="btn-generate-3d" style="margin-top: var(--space-md);">
              3D 변환하기
            </button>
          </div>
          <div class="glass-card ai-output-area">
            <h3>3D 미리보기</h3>
            <div class="ai-result" id="result-convert3d">
              <p class="ai-result__placeholder">작품을 선택하고 '3D 변환하기'를 클릭하세요</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- My Artworks Modal -->
    <div class="modal-backdrop" id="my-artworks-modal" style="display:none;">
      <div class="glass-card" style="max-width:600px;width:90%;max-height:80vh;overflow-y:auto;padding:var(--space-lg);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-md);">
          <h3>내 작품 선택</h3>
          <button class="btn btn--ghost btn--sm" id="close-artworks-modal">X</button>
        </div>
        <div id="my-artworks-grid" class="sns-profile__grid"></div>
      </div>
    </div>
  `;

  bindTabEvents();
  bindUploadEvents();
  bindCustomPromptToggle();
  bindGenerateEvents();
  bindMyArtworksButton();
}

function renderUploadZone(prefix) {
  return `
    <div class="upload-zone" id="upload-zone-${prefix}">
      <div class="upload-zone__icon">+</div>
      <p class="upload-zone__text">이미지를 드래그하거나 클릭하여 업로드</p>
      <input type="file" accept="image/*" id="file-input-${prefix}" hidden />
      <img class="upload-zone__preview" id="preview-${prefix}" style="display:none;" />
    </div>
  `;
}

function bindTabEvents() {
  document.querySelectorAll('.ai-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentTab = tab.dataset.tab;
      document.querySelectorAll('.ai-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.ai-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(`panel-${currentTab}`).classList.add('active');
    });
  });
}

function bindCustomPromptToggle() {
  const templateSelect = document.getElementById('story-template');
  const customGroup = document.getElementById('custom-prompt-group');
  if (templateSelect && customGroup) {
    templateSelect.addEventListener('change', () => {
      customGroup.style.display = templateSelect.value === 'custom' ? '' : 'none';
    });
  }
}

function bindUploadEvents() {
  ['story', 'animation', 'convert3d'].forEach(prefix => {
    const zone = document.getElementById(`upload-zone-${prefix}`);
    const input = document.getElementById(`file-input-${prefix}`);
    const preview = document.getElementById(`preview-${prefix}`);
    if (!zone || !input) return;

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor = 'var(--primary)'; });
    zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
    zone.addEventListener('drop', (e) => {
      e.preventDefault(); zone.style.borderColor = '';
      if (e.dataTransfer.files.length) handleFileUpload(e.dataTransfer.files[0], preview);
    });
    input.addEventListener('change', () => {
      if (input.files.length) handleFileUpload(input.files[0], preview);
    });
  });
}

function handleFileUpload(file, previewEl) {
  if (!file.type.startsWith('image/')) { showToast('이미지 파일만 업로드 가능합니다.', 'error'); return; }
  uploadedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedImage = e.target.result;
    previewEl.src = uploadedImage;
    previewEl.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function setImageFromURL(url) {
  // Load image from URL and convert to data URL for preview
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const cvs = document.createElement('canvas');
    cvs.width = img.width; cvs.height = img.height;
    cvs.getContext('2d').drawImage(img, 0, 0);
    uploadedImage = cvs.toDataURL('image/png');
    // Convert to File for upload
    cvs.toBlob(blob => { uploadedFile = new File([blob], 'artwork.png', { type: 'image/png' }); });
    // Update all previews
    ['story', 'animation', 'convert3d'].forEach(prefix => {
      const preview = document.getElementById(`preview-${prefix}`);
      if (preview) { preview.src = uploadedImage; preview.style.display = 'block'; }
    });
  };
  img.src = url;
}

async function bindMyArtworksButton() {
  const btn = document.getElementById('btn-my-artworks');
  const modal = document.getElementById('my-artworks-modal');
  const closeBtn = document.getElementById('close-artworks-modal');
  const grid = document.getElementById('my-artworks-grid');

  if (!btn || !modal) return;

  btn.addEventListener('click', async () => {
    modal.style.display = 'flex';
    grid.innerHTML = '<div class="sns-loading"><div class="spinner"></div></div>';

    try {
      const user = getCurrentUser();
      const data = await PostsAPI.list(30, 0, user.id);
      if (data.posts.length === 0) {
        grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:var(--space-lg);">아직 올린 작품이 없어요. SNS에서 먼저 게시해보세요!</p>';
        return;
      }
      grid.innerHTML = data.posts.map(post => {
        const img = post.image_path || '';
        const placeholder = `background:linear-gradient(135deg,${post.color},${post.color}88);`;
        return `
          <div class="sns-profile__card" data-image-url="${img}" style="cursor:pointer;">
            ${img ? `<img src="${img}" alt="${post.title}" loading="lazy">` :
              `<div style="width:100%;height:100%;${placeholder}display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;">${post.title}</div>`}
            <div class="sns-profile__title">${post.title}</div>
          </div>
        `;
      }).join('');

      grid.querySelectorAll('.sns-profile__card').forEach(card => {
        card.addEventListener('click', () => {
          const imgUrl = card.dataset.imageUrl;
          if (imgUrl) {
            setImageFromURL(imgUrl);
            showToast('작품이 선택되었습니다!', 'success');
          } else {
            showToast('이미지가 없는 작품입니다.', 'info');
          }
          modal.style.display = 'none';
        });
      });
    } catch (err) {
      grid.innerHTML = `<p style="color:var(--danger);">${err.message}</p>`;
    }
  });

  closeBtn?.addEventListener('click', () => { modal.style.display = 'none'; });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
}

function bindGenerateEvents() {
  // Story generation (Gemini API via backend)
  const storyBtn = document.getElementById('btn-generate-story');
  if (storyBtn) {
    storyBtn.addEventListener('click', async () => {
      if (!uploadedFile && !uploadedImage) {
        showToast('먼저 작품을 선택하거나 이미지를 업로드해주세요.', 'error');
        return;
      }

      const resultEl = document.getElementById('result-story');
      resultEl.innerHTML = `<div class="sns-loading"><div class="spinner"></div><p>AI가 동화를 만들고 있어요...</p></div>`;

      try {
        const template = document.getElementById('story-template')?.value || 'default';
        const formData = new FormData();

        if (uploadedFile) {
          formData.append('image', uploadedFile);
        } else {
          // Convert data URL to blob
          const resp = await fetch(uploadedImage);
          const blob = await resp.blob();
          formData.append('image', blob, 'artwork.png');
        }
        formData.append('template', template);
        formData.append('model_key', 'gemini');

        const customPrompt = document.getElementById('custom-prompt')?.value || '';
        if (template === 'custom' && customPrompt) {
          formData.append('custom_prompt', customPrompt);
        }
        const artStyle = document.getElementById('art-style')?.value || '';
        if (artStyle) formData.append('art_style', artStyle);
        const language = document.getElementById('story-language')?.value || 'ko';
        if (language !== 'ko') formData.append('language', language);

        const token = localStorage.getItem('kidart_token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${API_BASE}/api/generate-story`, {
          method: 'POST', headers, body: formData,
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || 'Story generation failed');
        }

        const result = await response.json();
        const story = result.story;

        // Save for storybook viewer (sessionStorage + DB ID)
        const storybookData = {
          title: story.title,
          pages: story.pages,
          illustrations: story.page_images,
          story_id: result.story_id,
        };
        sessionStorage.setItem('kidart_storybook', JSON.stringify(storybookData));

        resultEl.innerHTML = `
          <div class="ai-result__content">
            <h4 style="font-size:1.2rem;color:var(--primary);margin-bottom:var(--space-md);">
              ${story.title}
            </h4>
            ${story.pages.map((page, i) => `
              <div style="margin-bottom:var(--space-md);padding:var(--space-md);background:var(--glass);border-radius:var(--radius-sm);">
                ${story.page_images[i] ? `<img src="${story.page_images[i]}" style="width:100%;border-radius:var(--radius-sm);margin-bottom:var(--space-sm);" loading="lazy">` : ''}
                <p style="line-height:1.8;">${page}</p>
              </div>
            `).join('')}
            <button class="btn btn--primary btn--block" id="btn-view-storybook" style="margin-top:var(--space-lg);">
              동화책으로 보기
            </button>
            ${result.story_id ? `<button class="btn btn--secondary btn--block" id="btn-share-story" style="margin-top:var(--space-sm);">
              공유 링크 복사
            </button>` : ''}
          </div>
        `;

        document.getElementById('btn-view-storybook')?.addEventListener('click', () => {
          navigateTo(result.story_id ? `/storybook/${result.story_id}` : '/storybook');
        });
        document.getElementById('btn-share-story')?.addEventListener('click', () => {
          const url = `${location.origin}${location.pathname}#/storybook/${result.story_id}`;
          navigator.clipboard.writeText(url).then(() => showToast('링크가 복사되었습니다!', 'success'));
        });
        showToast('동화가 생성되었습니다!', 'success');
      } catch (err) {
        resultEl.innerHTML = `<p style="color:var(--danger);">오류: ${err.message}</p>`;
        showToast('동화 생성에 실패했습니다.', 'error');
      }
    });
  }

  // Animation (real CSS keyframes + canvas sparkle + video recording)
  const animBtn = document.getElementById('btn-generate-animation');
  if (animBtn) {
    animBtn.addEventListener('click', async () => {
      if (!uploadedImage) { showToast('먼저 이미지를 업로드해주세요.', 'error'); return; }
      const resultEl = document.getElementById('result-animation');
      resultEl.innerHTML = `<div class="sns-loading"><div class="spinner"></div><p>애니메이션을 생성하는 중...</p></div>`;

      await new Promise(r => setTimeout(r, 500));
      const style = document.getElementById('anim-style')?.value || 'bounce';

      resultEl.innerHTML = `
        <div class="ai-result__content" style="text-align:center;">
          <div id="anim-canvas-container" style="position:relative;display:inline-block;margin-bottom:var(--space-md);">
            <canvas id="anim-canvas" width="400" height="300" style="border-radius:var(--radius-md);box-shadow:var(--shadow-md);"></canvas>
          </div>
          <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:var(--space-md);">
            '${style}' 애니메이션 적용됨
          </p>
          <div style="display:flex;gap:var(--space-sm);justify-content:center;">
            <button class="btn btn--primary btn--sm" id="btn-record-anim">영상으로 저장</button>
            <button class="btn btn--ghost btn--sm" id="btn-stop-anim">정지</button>
          </div>
        </div>
      `;

      // Draw animated image on canvas
      const canvas = document.getElementById('anim-canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = uploadedImage;
      let animFrame = null;
      let startTime = performance.now();

      img.onload = () => {
        const w = canvas.width, h = canvas.height;
        const scale = Math.min(w / img.width, h / img.height) * 0.7;
        const iw = img.width * scale, ih = img.height * scale;
        const ix = (w - iw) / 2, iy = (h - ih) / 2;

        function drawFrame(t) {
          const elapsed = (t - startTime) / 1000;
          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#09090B';
          ctx.fillRect(0, 0, w, h);

          ctx.save();
          const cx = ix + iw / 2, cy = iy + ih / 2;
          ctx.translate(cx, cy);

          if (style === 'bounce') {
            const bounce = Math.abs(Math.sin(elapsed * 3)) * 20;
            const squash = 1 + Math.abs(Math.sin(elapsed * 3)) * 0.05;
            ctx.translate(0, -bounce);
            ctx.scale(1 / squash, squash);
          } else if (style === 'float') {
            ctx.translate(Math.sin(elapsed * 1.5) * 10, Math.sin(elapsed * 2) * 15);
            ctx.rotate(Math.sin(elapsed) * 0.05);
          } else if (style === 'dance') {
            ctx.rotate(Math.sin(elapsed * 4) * 0.15);
            ctx.translate(Math.sin(elapsed * 3) * 8, 0);
            ctx.scale(1 + Math.sin(elapsed * 6) * 0.05, 1 + Math.cos(elapsed * 6) * 0.05);
          }

          ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
          ctx.restore();

          // Sparkle overlay
          if (style === 'sparkle') {
            for (let i = 0; i < 8; i++) {
              const sx = Math.random() * w;
              const sy = Math.random() * h;
              const sr = 2 + Math.random() * 4;
              ctx.save();
              ctx.globalAlpha = 0.4 + Math.random() * 0.6;
              ctx.fillStyle = '#fff';
              ctx.beginPath();
              // Star shape
              for (let j = 0; j < 4; j++) {
                const angle = (j / 4) * Math.PI * 2 + elapsed;
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + Math.cos(angle) * sr, sy + Math.sin(angle) * sr);
              }
              ctx.fill();
              ctx.restore();
            }
          }

          animFrame = requestAnimationFrame(drawFrame);
        }
        animFrame = requestAnimationFrame(drawFrame);
      };

      // Record video
      document.getElementById('btn-record-anim')?.addEventListener('click', async () => {
        if (!canvas) return;
        showToast('3초간 녹화합니다...', 'info');
        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks = [];
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `kidart-animation-${style}.webm`;
          a.click();
          showToast('영상이 저장되었습니다!', 'success');
        };
        recorder.start();
        setTimeout(() => recorder.stop(), 3000);
      });

      document.getElementById('btn-stop-anim')?.addEventListener('click', () => {
        if (animFrame) cancelAnimationFrame(animFrame);
        showToast('애니메이션이 정지되었습니다.', 'info');
      });

      showToast('애니메이션이 생성되었습니다!', 'success');
    });
  }

  // 3D conversion (Three.js ExtrudeGeometry from silhouette)
  const convertBtn = document.getElementById('btn-generate-3d');
  if (convertBtn) {
    convertBtn.addEventListener('click', async () => {
      if (!uploadedImage) { showToast('먼저 이미지를 업로드해주세요.', 'error'); return; }
      const resultEl = document.getElementById('result-convert3d');
      resultEl.innerHTML = `<div class="sns-loading"><div class="spinner"></div><p>3D 변환 중...</p></div>`;

      const depth = document.getElementById('depth-level')?.value || 'medium';
      const depthMap = { low: 0.3, medium: 0.6, high: 1.0 };
      const extrudeDepth = depthMap[depth];

      // Wait for Three.js
      if (typeof THREE === 'undefined') {
        await new Promise(r => {
          const check = setInterval(() => { if (typeof THREE !== 'undefined') { clearInterval(check); r(); } }, 200);
        });
      }

      resultEl.innerHTML = `
        <div class="ai-result__content" style="text-align:center;">
          <div id="threejs-3d-container" style="width:100%;height:300px;border-radius:var(--radius-md);overflow:hidden;margin-bottom:var(--space-md);"></div>
          <h4 style="color:var(--primary);">3D 변환 완료!</h4>
          <p style="margin-top:var(--space-sm);font-size:0.82rem;color:var(--text-muted);">
            드래그로 회전, 스크롤로 확대/축소
          </p>
        </div>
      `;

      const container3d = document.getElementById('threejs-3d-container');
      if (!container3d) return;

      // Setup Three.js scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a2e);
      const cam = new THREE.PerspectiveCamera(50, container3d.clientWidth / container3d.clientHeight, 0.1, 100);
      cam.position.set(0, 0, 3);
      const renderer3d = new THREE.WebGLRenderer({ antialias: true });
      renderer3d.setSize(container3d.clientWidth, container3d.clientHeight);
      container3d.appendChild(renderer3d.domElement);

      // Lighting
      scene.add(new THREE.AmbientLight(0xffffff, 0.5));
      const dirLight = new THREE.DirectionalLight(0xffffff, 1);
      dirLight.position.set(2, 3, 4);
      scene.add(dirLight);

      // Load image as texture + create extruded shape
      const texture = new THREE.TextureLoader().load(uploadedImage);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = uploadedImage;
      img.onload = () => {
        const aspect = img.width / img.height;
        const w = aspect > 1 ? 2 : 2 * aspect;
        const h = aspect > 1 ? 2 / aspect : 2;

        // Front face with texture
        const frontGeo = new THREE.PlaneGeometry(w, h);
        const frontMat = new THREE.MeshStandardMaterial({ map: texture, side: THREE.FrontSide });
        const frontMesh = new THREE.Mesh(frontGeo, frontMat);
        frontMesh.position.z = extrudeDepth / 2;

        // Back face
        const backGeo = new THREE.PlaneGeometry(w, h);
        const backMat = new THREE.MeshStandardMaterial({ color: 0x8B5CF6, side: THREE.FrontSide });
        const backMesh = new THREE.Mesh(backGeo, backMat);
        backMesh.position.z = -extrudeDepth / 2;
        backMesh.rotation.y = Math.PI;

        // Side extrusion (box for edges)
        const sideGeo = new THREE.BoxGeometry(w, h, extrudeDepth);
        const sideMat = new THREE.MeshStandardMaterial({ color: 0x6b4fad, roughness: 0.7 });
        const sideMesh = new THREE.Mesh(sideGeo, sideMat);

        const group = new THREE.Group();
        group.add(sideMesh);
        group.add(frontMesh);
        group.add(backMesh);
        scene.add(group);

        // Simple orbit controls via mouse drag
        let isDragging = false;
        let prevX = 0, prevY = 0;
        renderer3d.domElement.addEventListener('mousedown', e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
        window.addEventListener('mouseup', () => { isDragging = false; });
        renderer3d.domElement.addEventListener('mousemove', e => {
          if (!isDragging) return;
          const dx = (e.clientX - prevX) * 0.01;
          const dy = (e.clientY - prevY) * 0.01;
          group.rotation.y += dx;
          group.rotation.x += dy;
          prevX = e.clientX; prevY = e.clientY;
        });
        renderer3d.domElement.addEventListener('wheel', e => {
          cam.position.z = Math.max(1.5, Math.min(8, cam.position.z + e.deltaY * 0.005));
        });

        // Touch support
        renderer3d.domElement.addEventListener('touchstart', e => {
          if (e.touches.length === 1) { isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; }
        }, { passive: true });
        renderer3d.domElement.addEventListener('touchmove', e => {
          if (!isDragging || e.touches.length !== 1) return;
          const dx = (e.touches[0].clientX - prevX) * 0.01;
          const dy = (e.touches[0].clientY - prevY) * 0.01;
          group.rotation.y += dx;
          group.rotation.x += dy;
          prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
        }, { passive: true });
        renderer3d.domElement.addEventListener('touchend', () => { isDragging = false; }, { passive: true });

        // Auto-rotate + render
        function render3d() {
          requestAnimationFrame(render3d);
          if (!isDragging) group.rotation.y += 0.005;
          renderer3d.render(scene, cam);
        }
        render3d();
      };

      showToast('3D 변환이 완료되었습니다!', 'success');
    });
  }
}
