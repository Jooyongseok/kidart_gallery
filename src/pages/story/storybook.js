// ============================================================
// Storybook Viewer — 동화 뷰어 (페이지 넘김 + TTS)
// ============================================================
import { navigateTo } from '../../router.js';

let ttsUtterance = null;
let cleanupFn = null;

export function renderStorybook() {
  const content = document.getElementById('page-content');
  const raw = sessionStorage.getItem('kidart_storybook');

  if (!raw) {
    content.innerHTML = `
      <div class="storybook-empty">
        <h2>📖 동화가 없습니다</h2>
        <p>AI 스튜디오에서 먼저 동화를 생성하세요.</p>
        <button class="btn btn--primary" id="sb-go-studio">AI 스튜디오로 이동</button>
      </div>
    `;
    document.getElementById('sb-go-studio')?.addEventListener('click', () => navigateTo('/ai-studio'));
    return () => {};
  }

  const data = JSON.parse(raw);
  const pages = data.pages || data.story.split('\n\n').filter(p => p.trim());
  const illustrations = data.illustrations || [];
  const title = data.title || '나의 동화';
  let currentPage = 0;

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
          <h2 class="storybook__title">📖 ${title}</h2>
          <span class="storybook__counter">${currentPage + 1} / ${total}</span>
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
      }, 300);
    } else {
      currentPage = idx;
      render();
    }
  }

  function startTTS() {
    if (!('speechSynthesis' in window)) return;
    stopTTS();
    ttsUtterance = new SpeechSynthesisUtterance(pages[currentPage]);
    ttsUtterance.lang = 'ko-KR';
    ttsUtterance.rate = 0.9;
    ttsUtterance.onend = () => {
      const stopBtn = document.getElementById('sb-tts-stop');
      const playBtn = document.getElementById('sb-tts-play');
      if (stopBtn) stopBtn.style.display = 'none';
      if (playBtn) playBtn.style.display = '';
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
