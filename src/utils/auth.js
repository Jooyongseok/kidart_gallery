// ============================================================
// Auth Utility — Backend JWT Auth
// ============================================================
import { AuthAPI } from '../services/api.js';

const SESSION_KEY = 'kidart_session';
const TOKEN_KEY = 'kidart_token';

export async function register(name, password, role = 'artist') {
  try {
    const data = await AuthAPI.register(name, password, role);
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setSession({ id: data.user.id, name: data.user.username, role: data.user.role });
    return { success: true, user: data.user };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

export async function login(name, password) {
  try {
    const data = await AuthAPI.login(name, password);
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setSession({ id: data.user.id, name: data.user.username, role: data.user.role });
    return { success: true, user: data.user };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return getCurrentUser() !== null && !!localStorage.getItem(TOKEN_KEY);
}

function setSession(user) {
  const session = { id: user.id, name: user.name, role: user.role };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
