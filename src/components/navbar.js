// ============================================================
// Navbar Component — v2
// Dark/light toggle, mobile hamburger, auto-hide on scroll
// ============================================================
import { getCurrentUser, logout, isLoggedIn } from '../utils/auth.js';
import { navigateTo } from '../router.js';

let lastScrollY = 0;
let navScrollHandler = null;
let mobileMenuOpen = false;

export function renderNavbar() {
  const navbar = document.getElementById('navbar');
  const user = getCurrentUser();
  const loggedIn = isLoggedIn();
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const themeIcon = currentTheme === 'dark' ? '&#9788;' : '&#9790;'; // sun / moon

  navbar.innerHTML = `
    <nav class="navbar" role="navigation" aria-label="메인 네비게이션">
      <div class="navbar__logo" id="nav-logo" tabindex="0" role="button" aria-label="홈으로 이동">
        <div class="navbar__logo-dot"></div>
        <span>KidArt Gallery</span>
      </div>

      <ul class="navbar__links">
        <li class="navbar__link" data-route="/" tabindex="0" role="link">홈</li>
        <li class="navbar__link" data-route="/gallery" tabindex="0" role="link">3D 갤러리</li>
        <li class="navbar__link" data-route="/artists" tabindex="0" role="link">작가</li>
        <li class="navbar__link" data-route="/ai-studio" tabindex="0" role="link">AI 스튜디오</li>
      </ul>

      <div class="navbar__right">
        <button class="theme-toggle" id="theme-toggle"
                aria-label="테마 변경" title="다크/라이트 모드 전환">
          ${themeIcon}
        </button>

        <div class="navbar__auth">
          ${loggedIn
            ? `<span class="navbar__user">
                 <strong>${user.name}</strong>
               </span>
               <button class="btn btn--ghost btn--sm" id="nav-logout">로그아웃</button>`
            : `<button class="btn btn--primary btn--sm" id="nav-login">로그인</button>`
          }
        </div>

        <button class="navbar__hamburger" id="nav-hamburger"
                aria-label="메뉴 열기" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>

    <!-- Mobile nav drawer -->
    <div class="mobile-nav" id="mobile-nav" role="dialog" aria-label="모바일 메뉴">
      <div class="mobile-nav__link" data-route="/" tabindex="0">홈</div>
      <div class="mobile-nav__link" data-route="/gallery" tabindex="0">3D 갤러리</div>
      <div class="mobile-nav__link" data-route="/artists" tabindex="0">작가</div>
      <div class="mobile-nav__link" data-route="/ai-studio" tabindex="0">AI 스튜디오</div>
      ${loggedIn
        ? `<div class="mobile-nav__link" id="mobile-logout" tabindex="0">로그아웃</div>`
        : `<div class="mobile-nav__link" data-route="/login" tabindex="0">로그인</div>`
      }
    </div>
  `;

  // ===== EVENT LISTENERS =====

  // Logo click
  const logo = document.getElementById('nav-logo');
  logo.addEventListener('click', () => navigateTo('/'));
  logo.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') navigateTo('/');
  });

  // Desktop nav links
  navbar.querySelectorAll('.navbar__link').forEach(link => {
    const go = () => navigateTo(link.dataset.route);
    link.addEventListener('click', go);
    link.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  });

  // Auth buttons
  const loginBtn = document.getElementById('nav-login');
  if (loginBtn) loginBtn.addEventListener('click', () => navigateTo('/login'));

  const logoutBtn = document.getElementById('nav-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logout();
      renderNavbar();
      navigateTo('/');
      showToast('로그아웃 되었습니다.', 'info');
    });
  }

  // Theme toggle
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  // Hamburger
  const hamburger = document.getElementById('nav-hamburger');
  const mobileNav = document.getElementById('mobile-nav');

  hamburger.addEventListener('click', () => {
    mobileMenuOpen = !mobileMenuOpen;
    hamburger.classList.toggle('open', mobileMenuOpen);
    hamburger.setAttribute('aria-expanded', mobileMenuOpen);
    mobileNav.classList.toggle('open', mobileMenuOpen);
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
  });

  // Mobile nav links
  mobileNav.querySelectorAll('.mobile-nav__link[data-route]').forEach(link => {
    const go = () => {
      closeMobileMenu();
      navigateTo(link.dataset.route);
    };
    link.addEventListener('click', go);
    link.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  });

  const mobileLogout = document.getElementById('mobile-logout');
  if (mobileLogout) {
    mobileLogout.addEventListener('click', () => {
      closeMobileMenu();
      logout();
      renderNavbar();
      navigateTo('/');
    });
  }

  // Highlight active link
  highlightActiveLink();

  // Auto-hide navbar on scroll
  setupScrollBehavior();
}

function closeMobileMenu() {
  mobileMenuOpen = false;
  const hamburger = document.getElementById('nav-hamburger');
  const mobileNav = document.getElementById('mobile-nav');
  if (hamburger) {
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  }
  if (mobileNav) mobileNav.classList.remove('open');
  document.body.style.overflow = '';
}

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('kidart-theme', next);

  // Update icon
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.innerHTML = next === 'dark' ? '&#9788;' : '&#9790;';
}

function highlightActiveLink() {
  const hash = window.location.hash.slice(1) || '/';
  const basePath = '/' + (hash.split('/').filter(Boolean)[0] || '');

  document.querySelectorAll('.navbar__link').forEach(link => {
    link.classList.toggle('active', link.dataset.route === basePath);
  });

  document.querySelectorAll('.mobile-nav__link[data-route]').forEach(link => {
    link.classList.toggle('active', link.dataset.route === basePath);
  });
}

function setupScrollBehavior() {
  // Remove old listener
  if (navScrollHandler) {
    window.removeEventListener('scroll', navScrollHandler);
  }

  navScrollHandler = () => {
    const navEl = document.querySelector('.navbar');
    if (!navEl) return;

    const currentY = window.scrollY;

    // Add shadow when scrolled
    navEl.classList.toggle('scrolled', currentY > 20);

    // Hide on scroll down, show on scroll up (only after 300px)
    if (currentY > 300) {
      navEl.classList.toggle('hidden', currentY > lastScrollY && currentY - lastScrollY > 5);
    } else {
      navEl.classList.remove('hidden');
    }

    lastScrollY = currentY;
  };

  window.addEventListener('scroll', navScrollHandler, { passive: true });
}

// Listen for route changes
window.addEventListener('hashchange', () => {
  highlightActiveLink();
  closeMobileMenu();
});

// ============================================================
// Toast notification
// ============================================================
export function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('role', 'alert');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}
