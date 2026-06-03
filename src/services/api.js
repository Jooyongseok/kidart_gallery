// ============================================================
// API Client — Backend REST API 통신 레이어
// ============================================================
import { navigateTo } from '../router.js';

const API_BASE = window.__KIDART_API_URL__ || 'http://localhost:8200';

export function getApiBase() {
  return API_BASE;
}

function getHeaders(json = true) {
  const headers = {};
  if (json) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('kidart_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function apiRequest(method, path, body = null) {
  const opts = { method, headers: getHeaders() };
  if (body) opts.body = JSON.stringify(body);

  let resp;
  try {
    resp = await fetch(`${API_BASE}${path}`, opts);
  } catch (err) {
    throw new Error('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.');
  }

  if (resp.status === 401) {
    localStorage.removeItem('kidart_token');
    localStorage.removeItem('kidart_session');
    navigateTo('/login');
    throw new Error('로그인이 만료되었습니다. 다시 로그인해주세요.');
  }

  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(data.detail || data.error || '요청 처리 중 오류가 발생했습니다.');
  }

  return data;
}

// ===== Auth =====
export const AuthAPI = {
  register: (username, password, role = 'artist') =>
    apiRequest('POST', '/api/auth/register', { username, password, role }),

  login: (username, password) =>
    apiRequest('POST', '/api/auth/login', { username, password }),
};

// ===== Posts =====
export const PostsAPI = {
  list: (limit = 30, offset = 0, userId = null) => {
    let url = `/api/posts?limit=${limit}&offset=${offset}`;
    if (userId) url += `&user_id=${userId}`;
    return apiRequest('GET', url);
  },

  create: (title, caption, imagePath = null, color = '#8B5CF6') =>
    apiRequest('POST', '/api/posts', { title, caption, image_path: imagePath, color }),

  createWithImage: async (formData) => {
    const token = localStorage.getItem('kidart_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const resp = await fetch(`${API_BASE}/api/posts/with-image`, {
      method: 'POST', headers, body: formData,
    });
    if (resp.status === 401) {
      localStorage.removeItem('kidart_token');
      localStorage.removeItem('kidart_session');
      navigateTo('/login');
      throw new Error('로그인이 만료되었습니다.');
    }
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.detail || data.error || '업로드 실패');
    return data;
  },

  delete: (postId) =>
    apiRequest('DELETE', `/api/posts/${postId}`),
};

// ===== Comments =====
export const CommentsAPI = {
  list: (postId) => apiRequest('GET', `/api/posts/${postId}/comments`),

  create: (postId, text) =>
    apiRequest('POST', `/api/posts/${postId}/comments`, { text }),
};

// ===== Likes =====
export const LikesAPI = {
  toggle: (postId) => apiRequest('POST', `/api/posts/${postId}/like`),
};

// ===== DM =====
export const DMAPI = {
  conversations: () => apiRequest('GET', '/api/dm/conversations'),

  messages: (userId) => apiRequest('GET', `/api/dm/${userId}`),

  send: (userId, text) => apiRequest('POST', `/api/dm/${userId}`, { text }),

  markRead: (userId) => apiRequest('PUT', `/api/dm/${userId}/read`),
};

// ===== Users =====
export const UsersAPI = {
  me: () => apiRequest('GET', '/api/users/me'),

  update: (data) => apiRequest('PUT', '/api/users/me', data),

  list: () => apiRequest('GET', '/api/users'),

  get: (userId) => apiRequest('GET', `/api/users/${userId}`),
};

// ===== Follow =====
export const FollowAPI = {
  toggle: (userId) => apiRequest('POST', `/api/users/${userId}/follow`),

  followers: (userId) => apiRequest('GET', `/api/users/${userId}/followers`),

  following: (userId) => apiRequest('GET', `/api/users/${userId}/following`),

  isFollowing: (userId) => apiRequest('GET', `/api/users/${userId}/is-following`),

  feed: () => apiRequest('GET', '/api/feed/following'),
};

// ===== Stories =====
export const StoriesAPI = {
  my: () => apiRequest('GET', '/api/stories/my'),

  view: (storyId) => apiRequest('GET', `/api/stories/view/${storyId}`),

  update: (storyId, data) => apiRequest('PUT', `/api/stories/${storyId}`, data),
};

// ===== Characters =====
export const CharacterAPI = {
  list: () => apiRequest('GET', '/api/characters'),

  get: (id) => apiRequest('GET', `/api/characters/${id}`),

  delete: (id) => apiRequest('DELETE', `/api/characters/${id}`),

  extract: async (imageFile, name = '') => {
    const formData = new FormData();
    formData.append('image', imageFile);
    if (name) formData.append('name', name);
    const token = localStorage.getItem('kidart_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const resp = await fetch(`${API_BASE}/api/characters/extract`, {
      method: 'POST', headers, body: formData,
    });
    if (resp.status === 401) {
      localStorage.removeItem('kidart_token');
      localStorage.removeItem('kidart_session');
      navigateTo('/login');
      throw new Error('로그인이 만료되었습니다.');
    }
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.detail || data.error || '추출 실패');
    return data;
  },

  compare: async (characterId, scene, providers = '') => {
    const formData = new FormData();
    formData.append('scene', scene);
    if (providers) formData.append('providers', providers);
    const token = localStorage.getItem('kidart_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const resp = await fetch(`${API_BASE}/api/characters/${characterId}/compare`, {
      method: 'POST', headers, body: formData,
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.detail || data.error || '비교 실패');
    return data;
  },

  generateStory: async (formData) => {
    const token = localStorage.getItem('kidart_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const resp = await fetch(`${API_BASE}/api/generate-story-with-character`, {
      method: 'POST', headers, body: formData,
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.detail || data.error || '동화 생성 실패');
    return data;
  },
};

// ===== Search =====
export const SearchAPI = {
  search: (query) => apiRequest('GET', `/api/search?q=${encodeURIComponent(query)}`),
};

// ===== Seed =====
export const SeedAPI = {
  seed: () => apiRequest('POST', '/api/seed'),
};
