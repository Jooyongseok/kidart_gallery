// ============================================================
// Navbar Component
// ============================================================
import { getCurrentUser, logout, isLoggedIn } from '../utils/auth.js';
import { navigateTo } from '../router.js';

export function renderNavbar() {
  const navbar = document.getElementById('navbar');
  const user = getCurrentUser();
  const loggedIn = isLoggedIn();

  navbar.innerHTML = `
    <nav class="navbar" role="navigation" aria-label="메인 네비게이션">
      <div class="navbar__logo" id="nav-logo">
        <span class="navbar__logo-icon">🎨</span>
        <span>KidArt Gallery</span>
      </div>

      <ul class="navbar__links">
        <li class="navbar__link" data-route="/">홈</li>
        <li class="navbar__link" data-route="/gallery">3D 갤러리</li>
        <li class="navbar__link" data-route="/artists">작가</li>
        <li class="navbar__link" data-route="/ai-studio">AI 스튜디오</li>
      </ul>

      <div class="navbar__auth">
        ${loggedIn
          ? `<span class="navbar__user">안녕하세요, <strong>${user.name}</strong>님!</span>
             <button class="btn btn--secondary btn--sm" id="nav-logout">로그아웃</button>`
          : `<button class="btn btn--primary btn--sm" id="nav-login">로그인</button>`
        }
      </div>
    </nav>
  `;

  // Event listeners
  document.getElementById('nav-logo').addEventListener('click', () => navigateTo('/'));

  navbar.querySelectorAll('.navbar__link').forEach(link => {
    link.addEventListener('click', () => {
      navigateTo(link.dataset.route);
    });
  });

  const loginBtn = document.getElementById('nav-login');
  if (loginBtn) loginBtn.addEventListener('click', () => navigateTo('/login'));

  const logoutBtn = document.getElementById('nav-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logout();
      renderNavbar(); // Re-render
      navigateTo('/');
      showToast('로그아웃 되었습니다.', 'info');
    });
  }

  // Highlight active link
  highlightActiveLink();
}

function highlightActiveLink() {
  const hash = window.location.hash.slice(1) || '/';
  const basePath = '/' + (hash.split('/').filter(Boolean)[0] || '');

  document.querySelectorAll('.navbar__link').forEach(link => {
    link.classList.toggle('active', link.dataset.route === basePath);
  });
}

// Listen for route changes
window.addEventListener('hashchange', highlightActiveLink);

// ============================================================
// Toast notification
// ============================================================
export function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}
