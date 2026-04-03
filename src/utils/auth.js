// ============================================================
// Auth Utility — Local Storage + Backend JWT 지원
// ============================================================
import { isBackendMode, getAIService } from '../services/ai/index.js';

const USERS_KEY = 'kidart_users';
const SESSION_KEY = 'kidart_session';
const TOKEN_KEY = 'kidart_token';

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export async function register(name, password, role = 'artist') {
  if (isBackendMode()) {
    try {
      const ai = getAIService();
      const data = await ai.register(name, password, role);
      setSession({ id: data.user_id || name, name, role });
      return { success: true, user: { name, role } };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
  const users = getUsers();
  if (users.find(u => u.name === name)) {
    return { success: false, message: '이미 존재하는 이름입니다.' };
  }
  const user = {
    id: Date.now().toString(36),
    name,
    password,
    role,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  saveUsers(users);
  setSession(user);
  return { success: true, user };
}

export async function login(name, password) {
  if (isBackendMode()) {
    try {
      const ai = getAIService();
      const data = await ai.login(name, password);
      setSession({ id: data.user_id || name, name, role: data.role || 'artist' });
      return { success: true, user: { name } };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
  const users = getUsers();
  const user = users.find(u => u.name === name && u.password === password);
  if (!user) {
    return { success: false, message: '이름 또는 비밀번호가 올바르지 않습니다.' };
  }
  setSession(user);
  return { success: true, user };
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);
  if (isBackendMode()) {
    try { getAIService().logout(); } catch {}
  }
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  if (isBackendMode()) {
    return getCurrentUser() !== null && !!localStorage.getItem(TOKEN_KEY);
  }
  return getCurrentUser() !== null;
}

function setSession(user) {
  const session = { id: user.id, name: user.name, role: user.role };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
