// ============================================================
// Auth Utility — Local Storage based
// ============================================================
const USERS_KEY = 'kidart_users';
const SESSION_KEY = 'kidart_session';

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

export function register(name, password, role = 'artist') {
  const users = getUsers();
  if (users.find(u => u.name === name)) {
    return { success: false, message: '이미 존재하는 이름입니다.' };
  }
  const user = {
    id: Date.now().toString(36),
    name,
    password, // In production, this would be hashed
    role,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  saveUsers(users);
  setSession(user);
  return { success: true, user };
}

export function login(name, password) {
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
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return getCurrentUser() !== null;
}

function setSession(user) {
  const session = { id: user.id, name: user.name, role: user.role };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
