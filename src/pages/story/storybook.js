// ============================================================
// Storybook Viewer — 동화 뷰어 (페이지 넘김 + TTS + DB 로드)
// ============================================================
import { navigateTo, getCurrentRoute } from '../../router.js';
import { StoriesAPI } from '../../services/api.js';
import { showToast } from '../../components/navbar.js';

let ttsUtterance = null;
let cleanupFn = null;

export async function renderStorybook(param) {
  const content = document.getElementById('page-content');

  // Try to load from DB via story ID (from route param or sessionStorage)
  let data = null;
  const storyId = param || null;

  if (storyId) {
    content.innerHTML = '<div class="sns-loading"><div class="spinner"></div> 동화를 불러오는 중...</div>';
    try {
      const story = await StoriesAPI.view(storyId);
      data = {
        title: story.title,
        pages: story.pages,
        illustrations: story.page_images || [],
        story_id: story.id,
      };
    } catch (err) {
      // Fallback to sessionStorage
      const raw = sessionStorage.getItem('kidart_storybook');
      if (raw) data = JSON.parse(raw);
    }
  } else {
    const raw = sessionStorage.getItem('kidart_storybook');
    if (raw) data = JSON.parse(raw);
  }

  if (!data) {
    content.innerHTML = `
      <div class="storybook-empty">
        <h2>동화가 없습니다</h2>
        <p>AI 스튜디오에서 먼저 동화를 생성하세요.</p>
        <button class="btn btn--primary" id="sb-go-studio">AI 스튜디오로 이동</button>
      </div>
    `;
    document.getElementById('sb-go-studio')?.addEventListener('click', () => navigateTo('/ai-studio'));
    return () => {};
  }

  const pages = data.pages || [];
  const illustrations = data.illustrations || [];
  const title = data.title || '나의 동화';
  const currentStoryId = data.story_id;
  let currentPage = 0;
  let ttsRate = 0.9;
  let autoAdvance = false;

  function render() {
    const total = pages.length;
    const text = pages[currentPage];
    const img = illustrations[currentPage];
    const isFirst = currentPage === 0;
    const isLast = currentPage === total - 1;

    content.innerHTML = `
      <div class="storybook">
        <div class="storybook__header">
          <button class="btn btn--secondary btn--sm" id="sb-back-studio">← AI 스튜디오</button>
          <h2 class="storybook__title">${title}</h2>
          <div class="storybook__header-actions">
            <span class="storybook__counter">${currentPage + 1} / ${total}</span>
            ${currentStoryId ? `<button class="btn btn--ghost btn--sm" id="sb-share" title="공유">🔗</button>` : ''}
            <button class="btn btn--ghost btn--sm" id="sb-video" title="영상으로 보기">🎬</button>
            <button class="btn btn--ghost btn--sm" id="sb-print" title="PDF 저장">🖨️</button>
          </div>
        </div>

        <div class="storybook__stage">
          <button class="storybook__arrow storybook__arrow--left ${isFirst ? 'disabled' : ''}" id="sb-prev">‹</button>

          <div class="storybook__book" id="sb-book">
            <div class="storybook__spread">
              ${img ? `
                <div class="storybook__illust">
                  <img src="${img}" alt="삽화" onerror="this.parentElement.innerHTML='<div class=storybook__illust-placeholder>🎨</div>'" />
                </div>
              ` : `
                <div class="storybook__illust">
                  <div class="storybook__illust-placeholder">
                    <span style="font-size:3rem;">🎨</span>
                    <span style="font-size:0.8rem; margin-top:8px; color:var(--color-text-dim);">삽화 없음</span>
                  </div>
                </div>
              `}
              <div class="storybook__text">
                <p id="sb-text-content">${text}</p>
              </div>
            </div>
          </div>

          <button class="storybook__arrow storybook__arrow--right ${isLast ? 'disabled' : ''}" id="sb-next">›</button>
        </div>

        <div class="storybook__controls">
          <button class="btn btn--secondary btn--sm" id="sb-tts-play">🔊 읽어주기</button>
          <button class="btn btn--secondary btn--sm" id="sb-tts-stop" style="display:none;">⏹ 멈추기</button>
          <button class="btn btn--ghost btn--sm ${autoAdvance ? 'btn--active' : ''}" id="sb-auto" title="자동 넘김">
            ${autoAdvance ? '⏸ 자동' : '▶ 자동'}
          </button>
          <label class="storybook__speed" style="display:flex;align-items:center;gap:4px;font-size:0.8rem;color:var(--text-secondary);">
            속도
            <input type="range" id="sb-speed" min="0.5" max="1.5" step="0.1" value="${ttsRate}" style="width:60px;">
          </label>

          <div class="storybook__dots">
            ${pages.map((_, i) => `
              <span class="storybook__dot ${i === currentPage ? 'active' : ''}" data-page="${i}"></span>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    bindEvents();
  }

  function goToPage(idx) {
    if (idx < 0 || idx >= pages.length) return;
    stopTTS();
    const book = document.getElementById('sb-book');
    const direction = idx > currentPage ? 'flip-forward' : 'flip-backward';
    if (book) {
      book.classList.add(direction);
      setTimeout(() => {
        currentPage = idx;
        render();
        if (autoAdvance) startTTS();
      }, 300);
    } else {
      currentPage = idx;
      render();
      if (autoAdvance) startTTS();
    }
  }

  function startTTS() {
    if (!('speechSynthesis' in window)) return;
    stopTTS();
    ttsUtterance = new SpeechSynthesisUtterance(pages[currentPage]);
    ttsUtterance.lang = 'ko-KR';
    ttsUtterance.rate = ttsRate;
    ttsUtterance.onend = () => {
      const stopBtn = document.getElementById('sb-tts-stop');
      const playBtn = document.getElementById('sb-tts-play');
      if (stopBtn) stopBtn.style.display = 'none';
      if (playBtn) playBtn.style.display = '';
      // Auto-advance
      if (autoAdvance && currentPage < pages.length - 1) {
        setTimeout(() => goToPage(currentPage + 1), 500);
      }
    };
    window.speechSynthesis.speak(ttsUtterance);
    const stopBtn = document.getElementById('sb-tts-stop');
    const playBtn = document.getElementById('sb-tts-play');
    if (stopBtn) stopBtn.style.display = '';
    if (playBtn) playBtn.style.display = 'none';
  }

  function stopTTS() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    ttsUtterance = null;
  }

  let touchStartX = 0;
  function onTouchStart(e) { touchStartX = e.touches[0].clientX; }
  function onTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      goToPage(dx < 0 ? currentPage + 1 : currentPage - 1);
    }
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowRight') goToPage(currentPage + 1);
    else if (e.key === 'ArrowLeft') goToPage(currentPage - 1);
  }

  function bindEvents() {
    document.getElementById('sb-back-studio')?.addEventListener('click', () => navigateTo('/ai-studio'));
    document.getElementById('sb-prev')?.addEventListener('click', () => goToPage(currentPage - 1));
    document.getElementById('sb-next')?.addEventListener('click', () => goToPage(currentPage + 1));
    document.getElementById('sb-tts-play')?.addEventListener('click', startTTS);
    document.getElementById('sb-tts-stop')?.addEventListener('click', stopTTS);

    document.getElementById('sb-auto')?.addEventListener('click', () => {
      autoAdvance = !autoAdvance;
      if (autoAdvance) startTTS();
      else stopTTS();
      render();
    });

    document.getElementById('sb-speed')?.addEventListener('input', (e) => {
      ttsRate = parseFloat(e.target.value);
    });

    document.getElementById('sb-share')?.addEventListener('click', () => {
      if (currentStoryId) {
        const url = `${location.origin}${location.pathname}#/storybook/${currentStoryId}`;
        navigator.clipboard.writeText(url).then(() => showToast('링크가 복사되었습니다!', 'success'));
      }
    });

    document.getElementById('sb-print')?.addEventListener('click', () => window.print());

    document.getElementById('sb-video')?.addEventListener('click', () => startKenBurnsVideo(pages, illustrations, title));

    document.querySelectorAll('.storybook__dot').forEach(dot => {
      dot.addEventListener('click', () => goToPage(Number(dot.dataset.page)));
    });

    const stage = document.querySelector('.storybook__stage');
    if (stage) {
      stage.addEventListener('touchstart', onTouchStart, { passive: true });
      stage.addEventListener('touchend', onTouchEnd, { passive: true });
    }
  }

  document.addEventListener('keydown', onKeyDown);
  render();

  cleanupFn = () => {
    stopTTS();
    document.removeEventListener('keydown', onKeyDown);
  };

  return cleanupFn;
}


// ============================================================
// Ken Burns Video Generator
// ============================================================

async function startKenBurnsVideo(pages, illustrations, title) {
  const content = document.getElementById('page-content');

  // 유효한 삽화가 있는지 확인
  const validIllustrations = illustrations.filter(Boolean);
  if (validIllustrations.length === 0) {
    showToast('삽화가 없어 영상을 생성할 수 없습니다.', 'error');
    return;
  }

  // 영상 생성 UI
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width:700px;">
      <button class="modal-close" id="kb-close">&times;</button>
      <h2 style="margin-bottom:16px;">🎬 동화 영상 생성</h2>
      <canvas id="kb-canvas" width="1280" height="720"
        style="width:100%;border-radius:12px;background:#000;"></canvas>
      <div style="margin-top:16px;text-align:center;">
        <p id="kb-status" style="color:var(--text-secondary);margin-bottom:12px;">영상 준비 중...</p>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button class="btn-primary" id="kb-start" disabled>▶ 재생 시작</button>
          <button class="btn-secondary" id="kb-download" style="display:none;">⬇ 다운로드</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const canvas = overlay.querySelector('#kb-canvas');
  const ctx = canvas.getContext('2d');
  const statusEl = overlay.querySelector('#kb-status');
  const startBtn = overlay.querySelector('#kb-start');
  const downloadBtn = overlay.querySelector('#kb-download');
  const closeBtn = overlay.querySelector('#kb-close');

  let recorder = null;
  let recordedChunks = [];

  closeBtn.addEventListener('click', () => {
    if (recorder && recorder.state === 'recording') recorder.stop();
    overlay.remove();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      if (recorder && recorder.state === 'recording') recorder.stop();
      overlay.remove();
    }
  });

  // 이미지 사전 로딩
  statusEl.textContent = '이미지를 불러오는 중...';
  const loadedImages = [];
  for (let i = 0; i < pages.length; i++) {
    const src = illustrations[i];
    if (src) {
      try {
        const img = await loadImage(src);
        loadedImages.push({ img, text: pages[i], index: i });
      } catch {
        // 실패한 이미지는 건너뜀
      }
    }
  }

  if (loadedImages.length === 0) {
    statusEl.textContent = '이미지 로딩에 실패했습니다.';
    return;
  }

  statusEl.textContent = `${loadedImages.length}장의 이미지 준비 완료. 재생을 시작하세요.`;
  startBtn.disabled = false;

  startBtn.addEventListener('click', () => {
    startBtn.disabled = true;
    startBtn.textContent = '⏳ 생성 중...';
    playKenBurns(canvas, ctx, loadedImages, title, statusEl, downloadBtn, overlay);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function playKenBurns(canvas, ctx, images, title, statusEl, downloadBtn, overlay) {
  const W = canvas.width;
  const H = canvas.height;
  const DURATION_PER_PAGE = 5000;  // 5초/페이지
  const FADE_DURATION = 800;       // 페이지 전환 페이드

  // MediaRecorder 설정
  let recorder = null;
  let recordedChunks = [];

  try {
    const stream = canvas.captureStream(30);
    recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      downloadBtn.style.display = '';
      downloadBtn.addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = url;
        a.download = `storybook_video.webm`;
        a.click();
      });
      statusEl.textContent = '영상 생성 완료!';
    };
    recorder.start();
  } catch (e) {
    // MediaRecorder 미지원 시 재생만
  }

  // Ken Burns 효과 파라미터 (페이지별 다른 움직임)
  const effects = [
    { sx: 0, sy: 0, ex: 0.15, ey: 0.1 },       // 좌상→우하 줌인
    { sx: 0.2, sy: 0.1, ex: 0, ey: 0 },         // 우하→좌상 줌아웃
    { sx: 0.1, sy: 0, ex: 0, ey: 0.15 },        // 좌→우 팬
    { sx: 0, sy: 0.15, ex: 0.15, ey: 0 },       // 하→상 팬
    { sx: 0.05, sy: 0.05, ex: 0.2, ey: 0.15 },  // 중심→우하 줌
  ];

  const totalDuration = images.length * DURATION_PER_PAGE;
  const startTime = performance.now();

  function animate(now) {
    const elapsed = now - startTime;
    if (elapsed >= totalDuration) {
      // 끝
      if (recorder && recorder.state === 'recording') recorder.stop();
      return;
    }

    const pageIdx = Math.min(Math.floor(elapsed / DURATION_PER_PAGE), images.length - 1);
    const pageElapsed = elapsed - (pageIdx * DURATION_PER_PAGE);
    const t = Math.min(pageElapsed / DURATION_PER_PAGE, 1);

    const { img, text } = images[pageIdx];
    const effect = effects[pageIdx % effects.length];

    // 배경 검정
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Ken Burns: 줌 + 팬 보간
    const scale = 1 + (effect.ex - effect.sx) * t + effect.sx;
    const offsetX = (effect.sx + (effect.ex - effect.sx) * t) * W * 0.3;
    const offsetY = (effect.sy + (effect.ey - effect.sy) * t) * H * 0.3;

    ctx.save();
    // 이미지를 캔버스 크기에 맞추되 비율 유지
    const imgRatio = img.width / img.height;
    const canvasRatio = W / H;
    let dw, dh;
    if (imgRatio > canvasRatio) {
      dh = H * scale;
      dw = dh * imgRatio;
    } else {
      dw = W * scale;
      dh = dw / imgRatio;
    }
    const dx = (W - dw) / 2 - offsetX;
    const dy = (H - dh) / 2 - offsetY;

    // 페이드 인/아웃
    let alpha = 1;
    if (pageElapsed < FADE_DURATION) alpha = pageElapsed / FADE_DURATION;
    if (pageElapsed > DURATION_PER_PAGE - FADE_DURATION) {
      alpha = (DURATION_PER_PAGE - pageElapsed) / FADE_DURATION;
    }
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    ctx.drawImage(img, dx, dy, dw, dh);

    // 텍스트 오버레이 (하단)
    if (text) {
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha)) * 0.95;
      // 반투명 배경
      const gradient = ctx.createLinearGradient(0, H * 0.65, 0, H);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.3, 'rgba(0,0,0,0.7)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, H * 0.65, W, H * 0.35);

      // 텍스트
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      wrapText(ctx, text, W / 2, H * 0.82, W - 80, 36);
    }

    ctx.restore();

    // 페이지 인디케이터
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${pageIdx + 1} / ${images.length}`, W - 24, 36);
    ctx.globalAlpha = 1;

    statusEl.textContent = `페이지 ${pageIdx + 1}/${images.length} 렌더링 중...`;

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = text.split('');
  let line = '';
  let lines = [];

  for (const char of chars) {
    const testLine = line + char;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  // 최대 3줄
  if (lines.length > 3) lines = lines.slice(0, 3);
  lines[lines.length - 1] = lines[lines.length - 1];

  const totalHeight = lines.length * lineHeight;
  const startY = y - totalHeight / 2;

  lines.forEach((l, i) => {
    ctx.fillText(l, x, startY + i * lineHeight);
  });
}
