// ============================================================
// Login Page
// ============================================================
import { login, register } from '../utils/auth.js';
import { navigateTo } from '../router.js';
import { renderNavbar, showToast } from '../components/navbar.js';

export function renderLogin() {
  const content = document.getElementById('page-content');
  let isLoginMode = true;

  function render() {
    content.innerHTML = `
      <div class="login-page">
        <div class="glass-card login-card">
          <h2 class="login-card__title">🎨 KidArt Gallery</h2>
          <p class="login-card__sub">어린이 미술 전시 플랫폼에 오신 것을 환영합니다</p>

          <div class="login-card__tabs">
            <button class="login-card__tab ${isLoginMode ? 'active' : ''}" id="tab-login">로그인</button>
            <button class="login-card__tab ${!isLoginMode ? 'active' : ''}" id="tab-register">회원가입</button>
          </div>

          <form id="auth-form">
            <div class="form-group">
              <label for="auth-name">이름</label>
              <input type="text" id="auth-name" class="form-input" placeholder="이름을 입력하세요" required autocomplete="username" />
            </div>

            <div class="form-group">
              <label for="auth-password">비밀번호</label>
              <input type="password" id="auth-password" class="form-input" placeholder="비밀번호를 입력하세요" required autocomplete="${isLoginMode ? 'current-password' : 'new-password'}" />
            </div>

            ${!isLoginMode ? `
              <div class="form-group">
                <label for="auth-role">역할</label>
                <select id="auth-role" class="form-select">
                  <option value="parent">학부모</option>
                  <option value="artist">어린이 작가</option>
                  <option value="teacher">선생님</option>
                </select>
              </div>
            ` : ''}

            <div id="auth-error"></div>

            <button type="submit" class="btn btn--primary btn--block btn--lg">
              ${isLoginMode ? '로그인' : '가입하기'}
            </button>
          </form>

          ${isLoginMode ? `
            <p style="margin-top: var(--space-lg); font-size: 0.82rem; color: var(--color-text-dim);">
              데모 계정: 아무 이름/비밀번호로 회원가입 후 이용하세요
            </p>
          ` : ''}
        </div>
      </div>
    `;

    // Tab toggle
    document.getElementById('tab-login').addEventListener('click', () => {
      isLoginMode = true;
      render();
    });

    document.getElementById('tab-register').addEventListener('click', () => {
      isLoginMode = false;
      render();
    });

    // Form submit
    document.getElementById('auth-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('auth-name').value.trim();
      const password = document.getElementById('auth-password').value;
      const errorEl = document.getElementById('auth-error');

      if (!name || !password) {
        errorEl.innerHTML = '<p class="form-error">모든 필드를 입력해주세요.</p>';
        return;
      }

      let result;
      if (isLoginMode) {
        result = login(name, password);
      } else {
        const role = document.getElementById('auth-role')?.value || 'parent';
        result = register(name, password, role);
      }

      if (result.success) {
        renderNavbar();
        showToast(isLoginMode ? '로그인 성공!' : '가입 완료! 환영합니다!', 'success');
        navigateTo('/gallery');
      } else {
        errorEl.innerHTML = `<p class="form-error">${result.message}</p>`;
      }
    });
  }

  render();
}
