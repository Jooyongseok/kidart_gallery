// ============================================================
// Landing Page
// ============================================================
import { navigateTo } from '../router.js';
import { isLoggedIn } from '../utils/auth.js';

export function renderLanding() {
  const content = document.getElementById('page-content');

  content.innerHTML = `
    <div class="landing">
      <section class="hero">
        <div class="hero__bg-orb hero__bg-orb--1"></div>
        <div class="hero__bg-orb hero__bg-orb--2"></div>
        <div class="hero__bg-orb hero__bg-orb--3"></div>

        <div class="hero__badge">✨ 어린이 미술의 새로운 세계</div>

        <h1 class="hero__title">
          아이들의 상상이<br>예술이 되는 공간
        </h1>

        <p class="hero__subtitle">
          3D 갤러리에서 작품을 감상하고, AI로 동화와 애니메이션을 만들어 보세요.
          어린 예술가들의 세계를 탐험하는 특별한 경험이 시작됩니다.
        </p>

        <div class="hero__actions">
          <button class="btn btn--primary btn--lg" id="hero-gallery">
            🖼️ 갤러리 입장
          </button>
          <button class="btn btn--secondary btn--lg" id="hero-artists">
            👨‍🎨 작가 둘러보기
          </button>
        </div>
      </section>

      <section class="features" id="features">
        <div class="glass-card feature-card">
          <span class="feature-card__icon">🏛️</span>
          <h3 class="feature-card__title">3D 가상 갤러리</h3>
          <p class="feature-card__desc">
            직접 걸어 다니며 벽면에 전시된 아이들의 작품을 가까이에서 감상하세요.
            WASD 키로 이동하고 마우스로 둘러볼 수 있습니다.
          </p>
        </div>

        <div class="glass-card feature-card">
          <span class="feature-card__icon">📖</span>
          <h3 class="feature-card__title">AI 동화 생성</h3>
          <p class="feature-card__desc">
            아이의 그림을 AI가 분석하여 멋진 동화 이야기로 변환해 드립니다.
            세상에 하나뿐인 특별한 동화를 만들어 보세요.
          </p>
        </div>

        <div class="glass-card feature-card">
          <span class="feature-card__icon">🎬</span>
          <h3 class="feature-card__title">애니메이션 변환</h3>
          <p class="feature-card__desc">
            정적인 그림이 움직이는 애니메이션으로! AI가 그림에 생명을 불어넣어
            아이들의 상상을 현실로 만들어 줍니다.
          </p>
        </div>

        <div class="glass-card feature-card">
          <span class="feature-card__icon">🧊</span>
          <h3 class="feature-card__title">2D → 3D 변환</h3>
          <p class="feature-card__desc">
            평면 작품을 입체적인 3D 모델로 변환하여 가상 갤러리에 전시하세요.
            어린 예술가의 작품을 새로운 차원으로 경험할 수 있습니다.
          </p>
        </div>

        <div class="glass-card feature-card">
          <span class="feature-card__icon">👶</span>
          <h3 class="feature-card__title">작가 포트폴리오</h3>
          <p class="feature-card__desc">
            각 어린이 작가만의 개인 페이지에서 작품을 모아보세요.
            성장 과정을 기록하고 공유할 수 있습니다.
          </p>
        </div>

        <div class="glass-card feature-card">
          <span class="feature-card__icon">🔒</span>
          <h3 class="feature-card__title">안전한 보관</h3>
          <p class="feature-card__desc">
            소중한 아이들의 작품을 디지털로 안전하게 보관하고
            언제 어디서나 가족과 함께 감상하세요.
          </p>
        </div>
      </section>
    </div>
  `;

  // Bind events
  document.getElementById('hero-gallery').addEventListener('click', () => {
    if (!isLoggedIn()) {
      navigateTo('/login');
    } else {
      navigateTo('/gallery');
    }
  });

  document.getElementById('hero-artists').addEventListener('click', () => {
    navigateTo('/artists');
  });

  // Intersection observer for feature cards animation
  const cards = content.querySelectorAll('.feature-card');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  cards.forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = `all 0.5s ease ${i * 0.1}s`;
    observer.observe(card);
  });
}
