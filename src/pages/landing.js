// ============================================================
// Landing Page — v2 Redesign
// Parallax hero, scroll animations, horizontal portfolio,
// magnetic CTA button, counter stats
// ============================================================
import { navigateTo } from '../router.js';
import { isLoggedIn } from '../utils/auth.js';
import { artists, getAllArtworks } from '../data/sample-data.js';

let cleanupFns = [];

export function renderLanding() {
  const content = document.getElementById('page-content');
  const allArtworks = getAllArtworks();

  content.innerHTML = `
    <div class="landing page-enter">

      <!-- ===== HERO (Parallax) ===== -->
      <section class="hero" id="hero-section">
        <div class="hero__orb hero__orb--1" data-parallax="0.03"></div>
        <div class="hero__orb hero__orb--2" data-parallax="0.05"></div>
        <div class="hero__orb hero__orb--3" data-parallax="0.04"></div>

        <div class="hero__badge">
          <span style="font-size:0.9em">&#9733;</span>
          어린이 미술의 새로운 경험
        </div>

        <h1 class="hero__title">
          아이들의 상상이<br>
          <span class="gradient-text">예술이 되는 공간</span>
        </h1>

        <p class="hero__subtitle">
          3D 갤러리에서 작품을 감상하고, AI로 동화와 애니메이션을 만들어 보세요.
        </p>

        <div class="hero__actions">
          <button class="btn btn--primary btn--lg" id="hero-gallery">
            갤러리 입장
          </button>
          <button class="btn btn--secondary btn--lg" id="hero-artists">
            작가 둘러보기
          </button>
        </div>

        <div class="hero__scroll-hint" aria-hidden="true">
          <span>Scroll</span>
          <div class="hero__scroll-line"></div>
        </div>
      </section>

      <!-- ===== STATS ===== -->
      <section class="stats reveal" id="stats-section">
        <div class="stat">
          <div class="stat__number" data-count="${allArtworks.length}">0</div>
          <div class="stat__label">전시 작품</div>
        </div>
        <div class="stat">
          <div class="stat__number" data-count="${artists.length}">0</div>
          <div class="stat__label">어린이 작가</div>
        </div>
        <div class="stat">
          <div class="stat__number" data-count="3">0</div>
          <div class="stat__label">AI 변환 도구</div>
        </div>
      </section>

      <!-- ===== FEATURES ===== -->
      <section class="section" id="features-section">
        <div class="section__label reveal">Features</div>
        <h2 class="section__title reveal stagger-1">
          아이의 그림이 가진<br>무한한 가능성
        </h2>
        <p class="section__desc reveal stagger-2">
          단순한 전시를 넘어, AI 기술로 아이들의 창작물을 새로운 차원으로 확장합니다.
        </p>

        <div class="features-grid" style="margin-top: var(--space-2xl)">
          <div class="glass-card feature-card reveal stagger-1">
            <div class="feature-card__icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <h3 class="feature-card__title">3D 가상 갤러리</h3>
            <p class="feature-card__desc">
              직접 걸어 다니며 벽면에 전시된 작품을 감상하세요.
              WASD 키보드로 이동, 마우스로 시점 전환.
            </p>
          </div>

          <div class="glass-card feature-card reveal stagger-2">
            <div class="feature-card__icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            </div>
            <h3 class="feature-card__title">AI 동화 생성</h3>
            <p class="feature-card__desc">
              그림을 AI가 분석하여 세상에 하나뿐인
              동화 이야기로 변환합니다.
            </p>
          </div>

          <div class="glass-card feature-card reveal stagger-3">
            <div class="feature-card__icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            </div>
            <h3 class="feature-card__title">애니메이션 변환</h3>
            <p class="feature-card__desc">
              정적인 그림에 생명을 불어넣어
              움직이는 애니메이션으로 만들어 줍니다.
            </p>
          </div>

          <div class="glass-card feature-card reveal stagger-4">
            <div class="feature-card__icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            </div>
            <h3 class="feature-card__title">2D → 3D 변환</h3>
            <p class="feature-card__desc">
              평면 작품을 입체적인 3D 모델로 변환하여
              가상 갤러리에 전시하세요.
            </p>
          </div>

          <div class="glass-card feature-card reveal stagger-5">
            <div class="feature-card__icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <h3 class="feature-card__title">작가 포트폴리오</h3>
            <p class="feature-card__desc">
              어린이 작가의 성장 과정을 기록하고
              가족과 함께 공유할 수 있습니다.
            </p>
          </div>

          <div class="glass-card feature-card reveal stagger-6">
            <div class="feature-card__icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <h3 class="feature-card__title">안전한 보관</h3>
            <p class="feature-card__desc">
              소중한 작품을 디지털로 안전하게 보관.
              언제 어디서나 감상 가능합니다.
            </p>
          </div>
        </div>
      </section>

      <!-- ===== PORTFOLIO (Horizontal Scroll) ===== -->
      <section class="portfolio-section" id="portfolio-section">
        <div class="section" style="padding-bottom: var(--space-lg)">
          <div class="section__label reveal">Portfolio</div>
          <h2 class="section__title reveal stagger-1">
            어린 예술가들의 작품
          </h2>
          <p class="section__desc reveal stagger-2">
            가로로 스크롤하여 다양한 작품을 감상해 보세요.
          </p>
        </div>

        <div class="portfolio-scroll" id="portfolio-scroll">
          ${allArtworks.map(art => `
            <article class="portfolio-card" data-artist="${art.artistId}" tabindex="0"
                     role="button" aria-label="${art.title} - ${art.artistName}">
              <div class="portfolio-card__image-wrap">
                <div class="portfolio-card__image"
                     style="background: linear-gradient(135deg, ${art.color}, ${shiftColor(art.color, 30)});
                            display:flex; align-items:center; justify-content:center;
                            font-size:2rem; color:rgba(255,255,255,0.8);">
                  ${art.artistEmoji}
                </div>
              </div>
              <div class="portfolio-card__info">
                <h3 class="portfolio-card__title">${art.title}</h3>
                <div class="portfolio-card__artist">
                  <span>${art.artistEmoji}</span> ${art.artistName}
                </div>
              </div>
            </article>
          `).join('')}
        </div>

        <div class="scroll-indicator" id="scroll-indicator">
          ${Array.from({ length: Math.min(8, Math.ceil(allArtworks.length / 3)) }, (_, i) =>
            `<div class="scroll-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></div>`
          ).join('')}
        </div>
      </section>

      <!-- ===== HOW IT WORKS ===== -->
      <section class="section" id="process-section">
        <div class="section__label reveal">How it works</div>
        <h2 class="section__title reveal stagger-1">
          세 단계로 시작하세요
        </h2>

        <div class="process-grid" style="margin-top: var(--space-2xl)">
          <div class="process-step reveal stagger-1">
            <div class="process-step__number">01</div>
            <h3 class="process-step__title">그림 업로드</h3>
            <p class="process-step__desc">
              아이가 그린 그림을 사진으로 찍어 올리세요.
              크레파스, 수채화, 어떤 것이든 가능합니다.
            </p>
          </div>
          <div class="process-step reveal stagger-2">
            <div class="process-step__number">02</div>
            <h3 class="process-step__title">AI 변환</h3>
            <p class="process-step__desc">
              동화, 애니메이션, 3D 모델 중 원하는 형태로
              AI가 자동 변환합니다.
            </p>
          </div>
          <div class="process-step reveal stagger-3">
            <div class="process-step__number">03</div>
            <h3 class="process-step__title">갤러리 전시</h3>
            <p class="process-step__desc">
              3D 가상 미술관에 작품이 전시됩니다.
              가족, 친구와 함께 감상하세요.
            </p>
          </div>
        </div>
      </section>

      <!-- ===== CTA (Magnetic Button) ===== -->
      <section class="cta-section reveal-scale" id="cta-section">
        <div class="cta-box">
          <h2 class="cta-box__title">
            우리 아이의 첫 전시회,<br>지금 시작하세요
          </h2>
          <p class="cta-box__desc">
            무료로 가입하고 아이의 작품을 3D 갤러리에 전시해 보세요.
          </p>
          <button class="btn btn--primary btn--lg btn-magnetic" id="cta-btn">
            무료로 시작하기
          </button>
        </div>
      </section>

      <!-- ===== FOOTER ===== -->
      <footer class="footer">
        <div class="footer__content">
          <span class="footer__copy">&copy; 2026 KidArt Gallery</span>
          <div class="footer__links">
            <a href="#" aria-label="이용약관">이용약관</a>
            <a href="#" aria-label="개인정보처리방침">개인정보</a>
          </div>
        </div>
      </footer>

    </div>
  `;

  // ===== EVENT BINDINGS =====
  document.getElementById('hero-gallery').addEventListener('click', () => {
    navigateTo(isLoggedIn() ? '/gallery' : '/login');
  });
  document.getElementById('hero-artists').addEventListener('click', () => {
    navigateTo('/artists');
  });
  document.getElementById('cta-btn').addEventListener('click', () => {
    navigateTo(isLoggedIn() ? '/gallery' : '/login');
  });

  // Portfolio card clicks
  document.querySelectorAll('.portfolio-card').forEach(card => {
    card.addEventListener('click', () => {
      navigateTo(`/artists/${card.dataset.artist}`);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigateTo(`/artists/${card.dataset.artist}`);
      }
    });
  });

  // ===== PARALLAX =====
  const heroSection = document.getElementById('hero-section');
  const orbs = heroSection.querySelectorAll('[data-parallax]');

  function handleParallax() {
    const scrollY = window.scrollY;
    const heroHeight = heroSection.offsetHeight;
    if (scrollY > heroHeight) return;

    orbs.forEach(orb => {
      const speed = parseFloat(orb.dataset.parallax);
      orb.style.transform = `translate(0, ${scrollY * speed * -1}px)`;
    });
  }

  // ===== SCROLL REVEAL =====
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  content.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
    revealObserver.observe(el);
  });

  // ===== STAT COUNTER =====
  let countStarted = false;
  const statsObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !countStarted) {
          countStarted = true;
          animateCounters();
          statsObserver.disconnect();
        }
      });
    },
    { threshold: 0.3 }
  );

  const statsEl = document.getElementById('stats-section');
  if (statsEl) statsObserver.observe(statsEl);

  // ===== HORIZONTAL SCROLL INDICATOR =====
  const scrollContainer = document.getElementById('portfolio-scroll');
  const dots = document.querySelectorAll('.scroll-dot');

  function updateScrollDots() {
    if (!scrollContainer || !dots.length) return;
    const scrollPercent = scrollContainer.scrollLeft / (scrollContainer.scrollWidth - scrollContainer.clientWidth);
    const activeIndex = Math.round(scrollPercent * (dots.length - 1));
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === activeIndex);
    });
  }

  if (scrollContainer) {
    scrollContainer.addEventListener('scroll', updateScrollDots, { passive: true });
    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const index = parseInt(dot.dataset.index);
        const target = (scrollContainer.scrollWidth - scrollContainer.clientWidth) * (index / (dots.length - 1));
        scrollContainer.scrollTo({ left: target, behavior: 'smooth' });
      });
    });
  }

  // ===== MAGNETIC BUTTON =====
  const magneticBtn = document.querySelector('.btn-magnetic');
  if (magneticBtn) {
    function handleMagnet(e) {
      const rect = magneticBtn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const distance = Math.sqrt(x * x + y * y);
      const maxDist = 120;

      if (distance < maxDist) {
        const strength = 0.35;
        magneticBtn.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      } else {
        magneticBtn.style.transform = '';
      }
    }

    function resetMagnet() {
      magneticBtn.style.transform = '';
    }

    document.addEventListener('mousemove', handleMagnet);
    magneticBtn.addEventListener('mouseleave', resetMagnet);
    cleanupFns.push(() => {
      document.removeEventListener('mousemove', handleMagnet);
    });
  }

  // ===== SCROLL LISTENER =====
  function onScroll() {
    handleParallax();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  cleanupFns.push(() => {
    window.removeEventListener('scroll', onScroll);
    revealObserver.disconnect();
    statsObserver.disconnect();
  });

  // Cleanup function for router
  return function cleanup() {
    cleanupFns.forEach(fn => fn());
    cleanupFns = [];
  };
}

// ===== HELPERS =====

function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    const duration = 1500;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased);
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  });
}

function shiftColor(hex, amount) {
  if (!hex || !hex.startsWith('#')) return hex;
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.min(255, r + amount);
  g = Math.min(255, g + amount);
  b = Math.min(255, Math.max(0, b - amount / 2));
  return `rgb(${r}, ${g}, ${b})`;
}
