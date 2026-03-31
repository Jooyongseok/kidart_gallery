// ============================================================
// Backend AI Provider — kidart_gallery FastAPI 백엔드 연동
// 엔드포인트: http://localhost:8200 (uvicorn main:app --port 8200)
// ============================================================

import { AIServiceProvider } from './ai-provider.js';

const BACKEND_URL = 'http://localhost:8200';

export class BackendAIProvider extends AIServiceProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'BackendAIProvider';
    this.baseUrl = config.baseUrl || BACKEND_URL;
    this.token = config.token || localStorage.getItem('kidart_token') || null;
  }

  _headers() {
    const h = {};
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  /**
   * 그림 이미지로 동화 생성
   * @param {string|File} imageData - base64 문자열 or File 객체
   * @param {object} options - { template, modelKey, customPrompt, artworkId }
   */
  async generateStory(imageData, options = {}) {
    const {
      template = 'default',
      modelKey = 'qwen',
      customPrompt = '',
      artworkId = null,
    } = options;

    const formData = new FormData();

    // imageData가 File이면 그대로, base64면 Blob으로 변환
    if (imageData instanceof File) {
      formData.append('image', imageData);
    } else if (typeof imageData === 'string' && imageData.startsWith('data:')) {
      const res = await fetch(imageData);
      const blob = await res.blob();
      formData.append('image', blob, 'artwork.jpg');
    } else {
      throw new Error('지원되지 않는 이미지 형식입니다.');
    }

    formData.append('template', template);
    formData.append('model_key', modelKey);
    formData.append('custom_prompt', customPrompt);
    if (artworkId) formData.append('artwork_id', String(artworkId));

    const response = await fetch(`${this.baseUrl}/api/generate-story`, {
      method: 'POST',
      headers: this._headers(),
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(err.detail || '동화 생성 실패');
    }

    const data = await response.json();

    return {
      title: data.story.title,
      pages: data.story.pages,
      scenes: data.story.scenes,
      illustrations: data.story.page_images,
      pageCount: data.story.page_count,
      design: data.design,
      storyId: data.story_id,
      // ai-studio.js 호환 필드
      story: data.story.pages.join('\n\n'),
    };
  }

  /**
   * 애니메이션 생성 (향후 구현 예정 — 현재 Mock 반환)
   */
  async generateAnimation(imageData, options = {}) {
    return {
      frames: [],
      preview: null,
      message: '애니메이션 생성은 준비 중입니다.',
    };
  }

  /**
   * 2D→3D 변환 (향후 구현 예정 — 현재 Mock 반환)
   */
  async convert2Dto3D(imageData, options = {}) {
    return {
      modelData: null,
      preview: null,
      meshInfo: { vertices: 0, faces: 0 },
      message: '3D 변환은 준비 중입니다.',
    };
  }

  getInfo() {
    return {
      name: this.name,
      capabilities: ['story'],
      backendUrl: this.baseUrl,
      authenticated: !!this.token,
    };
  }

  // ── 인증 헬퍼 ───────────────────────────────────────────────

  async login(username, password) {
    const res = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: '로그인 실패' }));
      throw new Error(err.detail);
    }
    const data = await res.json();
    this.token = data.access_token;
    localStorage.setItem('kidart_token', data.access_token);
    return data;
  }

  async register(username, password, role = 'artist') {
    const res = await fetch(`${this.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: '회원가입 실패' }));
      throw new Error(err.detail);
    }
    const data = await res.json();
    this.token = data.access_token;
    localStorage.setItem('kidart_token', data.access_token);
    return data;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('kidart_token');
  }

  // ── 작품 관련 ─────────────────────────────────────────────

  async uploadArtwork(file, title, description = '') {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('title', title);
    formData.append('description', description);

    const res = await fetch(`${this.baseUrl}/api/artworks`, {
      method: 'POST',
      headers: this._headers(),
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: '업로드 실패' }));
      throw new Error(err.detail);
    }
    return res.json();
  }

  async getArtworks() {
    const res = await fetch(`${this.baseUrl}/api/artworks`, {
      headers: this._headers(),
    });
    if (!res.ok) throw new Error('작품 목록 조회 실패');
    return res.json();
  }
}
