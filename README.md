<p align="center">
  <img src="https://img.shields.io/badge/🎨_KidArt_Gallery-어린이_미술_전시_플랫폼-7c5cfc?style=for-the-badge&labelColor=0e0e1a" alt="KidArt Gallery" />
</p>

<h1 align="center">🏛️ KidArt Gallery</h1>

<p align="center">
  <b>아이들의 상상이 예술이 되는 공간</b><br/>
  3D 가상 갤러리 · AI 동화 생성 · 애니메이션 변환 · 2D→3D 전시
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=threedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=flat-square&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" />
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/AI_Powered-8B5CF6?style=flat-square&logo=openai&logoColor=white" />
</p>

<p align="center">
  <img src="https://img.shields.io/github/last-commit/Jooyongseok/kidart_gallery?style=flat-square&color=7c5cfc" />
  <img src="https://img.shields.io/github/repo-size/Jooyongseok/kidart_gallery?style=flat-square&color=f472b6" />
  <img src="https://img.shields.io/badge/license-MIT-34d399?style=flat-square" />
</p>

---

## 📋 목차

- [✨ 프로젝트 소개](#-프로젝트-소개)
- [🎯 주요 기능](#-주요-기능)
- [🏗️ 기술 스택](#️-기술-스택)
- [📁 프로젝트 구조](#-프로젝트-구조)
- [🚀 시작하기](#-시작하기)
- [🖥️ 페이지별 상세 설명](#️-페이지별-상세-설명)
- [🤖 AI 서비스 아키텍처](#-ai-서비스-아키텍처)
- [🔧 커스터마이징 가이드](#-커스터마이징-가이드)
- [🗺️ 로드맵](#️-로드맵)
- [🤝 기여하기](#-기여하기)

---

## ✨ 프로젝트 소개

**KidArt Gallery**는 어린이들의 미술 작품을 디지털 세계에서 전시하고 체험할 수 있는 웹 플랫폼입니다.

> *"평면의 그림에 생명을 불어넣고, 가상의 갤러리에서 걸어다니며 감상하는 새로운 경험"*

기존의 단순한 이미지 저장 서비스와는 달리, **Three.js 기반 3D 가상 갤러리**를 통해 실제 전시회처럼 작품을 감상할 수 있으며, **AI 기술**을 활용하여 아이들의 그림을 동화, 애니메이션, 3D 모델로 변환하는 창의적인 기능을 제공합니다.

### 🌟 왜 KidArt Gallery인가?

| 기존 방식 | KidArt Gallery |
|-----------|----------------|
| 📱 사진첩에 저장만 | 🏛️ 3D 갤러리에서 몰입감 있는 전시 |
| 📄 사진 한 장으로 끝 | 📖 AI가 동화 이야기로 변환 |
| 🖼️ 정적인 이미지 | 🎬 살아 움직이는 애니메이션 |
| 📐 평면 작품만 | 🧊 2D를 3D로 입체 전시 |
| 🗂️ 폴더로 분류 | 👶 작가별 포트폴리오 관리 |

---

## 🎯 주요 기능

### 🏛️ 3D 가상 갤러리
Three.js로 구현된 **1인칭 시점(FPS)** 가상 전시 공간입니다.

- **WASD 키**로 갤러리 내부를 자유롭게 이동
- **마우스**로 360° 시점 회전
- 벽면에 **액자 형태**로 전시된 작품 감상
- 작품 **클릭**으로 상세 정보 팝업
- 사실적인 **조명, 그림자, 안개** 효과
- 중앙 파티션, 기둥, 벤치 등 갤러리 인테리어
- 벽면 조명(스팟라이트)으로 작품 하이라이팅

### 📖 AI 동화 생성
아이의 그림을 업로드하면 AI가 그림의 내용을 분석하여 **세상에 하나뿐인 동화 이야기**를 생성합니다.

### 🎬 AI 애니메이션 변환
정적인 그림에 생명을 불어넣어 **움직이는 애니메이션**으로 변환합니다.
- 통통 튀는 모션 / 둥실둥실 떠다니기 / 반짝반짝 빛나기 / 춤추는 캐릭터 등 다양한 스타일 선택
- 프레임별 재생/정지 컨트롤

### 🧊 2D → 3D 변환
평면 작품을 **입체적인 3D 모델**로 변환하여 가상 갤러리에 전시할 수 있습니다.
- CSS 3D Transform 기반 인터랙티브 미리보기
- 마우스 호버로 실시간 3D 회전
- 깊이 단계 조절 (1~3단계)

### 👶 작가(아이) 포트폴리오
각 어린이 작가별 **개인 갤러리 페이지**를 제공합니다.
- 작가 프로필 (이름, 나이, 소개)
- 작품 그리드 갤러리
- 작품 상세 모달 (AI 스튜디오 / 3D 갤러리 연동)

### 🔐 로그인 / 회원가입
- 로그인 / 회원가입 탭 전환 UI
- 역할 선택 (학부모 / 어린이 작가 / 선생님)
- 로컬 스토리지 기반 세션 관리

---

## 🏗️ 기술 스택

| 카테고리 | 기술 | 설명 |
|----------|------|------|
| **프론트엔드** | HTML5 + CSS3 + Vanilla JS (ES Modules) | 빌드 도구 없이 바로 실행 |
| **3D 렌더링** | [Three.js](https://threejs.org/) v0.160 (CDN) | WebGL 기반 3D 갤러리 |
| **디자인** | CSS Custom Properties + Glassmorphism | 다크 테마, 그래디언트, 애니메이션 |
| **폰트** | Google Fonts (Outfit + Noto Sans KR) | 한글/영문 최적화 타이포그래피 |
| **라우팅** | Custom Hash Router | SPA 해시 기반 클라이언트 라우팅 |
| **인증** | Local Storage | 프로토타입용 인증 시스템 |
| **AI** | Pluggable Provider Pattern | 교체 가능한 AI 서비스 추상화 |

---

## 📁 프로젝트 구조

```
kidart-gallery/
│
├── 📄 index.html                      # SPA 엔트리 포인트
│
├── 📂 src/
│   ├── 🎯 main.js                     # 앱 진입점, 라우트 등록
│   ├── 🧭 router.js                   # 해시 기반 SPA 라우터
│   ├── 🎨 style.css                   # 디자인 시스템 (700+ 라인)
│   │
│   ├── 📂 components/                 # 재사용 UI 컴포넌트
│   │   └── 🧩 navbar.js               #   네비게이션 바 + 토스트 알림
│   │
│   ├── 📂 pages/                      # 페이지 모듈
│   │   ├── 🏠 landing.js              #   랜딩 (히어로 + 기능 소개)
│   │   ├── 🔑 login.js                #   로그인 / 회원가입
│   │   ├── 🏛️ gallery3d.js            #   Three.js 3D 갤러리
│   │   ├── 👶 artist.js               #   작가 포트폴리오
│   │   └── 🤖 ai-studio.js            #   AI 스튜디오 (3탭)
│   │
│   ├── 📂 services/ai/                # AI 서비스 레이어
│   │   ├── 📐 ai-provider.js          #   AI 인터페이스 (추상 클래스)
│   │   ├── 🎭 mock-provider.js        #   데모용 Mock AI 프로바이더
│   │   └── 🏭 index.js                #   AI 팩토리 (교체 지점)
│   │
│   ├── 📂 data/
│   │   └── 📊 sample-data.js          #   샘플 작가/작품 데이터 (6작가, 22작품)
│   │
│   └── 📂 utils/
│       └── 🔧 auth.js                 #   인증 유틸 (로컬 스토리지)
│
├── 📄 .gitignore
└── 📄 README.md
```

---

## 🚀 시작하기

### 사전 요구사항

- 모던 웹 브라우저 (Chrome, Firefox, Edge, Safari)
- Python 3.x (로컬 서버용) 또는 아무 HTTP 서버

### 설치 및 실행

```bash
# 1. 리포지토리 클론
git clone https://github.com/Jooyongseok/kidart_gallery.git
cd kidart_gallery

# 2. 로컬 서버 실행
python -m http.server 8080

# 3. 브라우저에서 접속
# http://localhost:8080
```

> **⚠️ 주의:** `file://` 프로토콜로 직접 열면 ES 모듈 로딩이 안 될 수 있습니다. 반드시 HTTP 서버를 통해 접속해주세요.

### 대안 서버
```bash
# Node.js가 있는 경우
npx serve .

# VS Code 사용 시
# Live Server 확장 설치 후 index.html 우클릭 → "Open with Live Server"
```

---

## 🖥️ 페이지별 상세 설명

### 1. 🏠 랜딩 페이지 (`#/`)

| 요소 | 설명 |
|------|------|
| **히어로 섹션** | 그래디언트 타이틀, 배경 오브(orb) 부유 애니메이션 |
| **CTA 버튼** | 갤러리 입장, 작가 둘러보기 |
| **기능 카드** | 6개 핵심 기능 소개 (스크롤 시 애니메이션 등장) |

### 2. 🔑 로그인 (`#/login`)

| 요소 | 설명 |
|------|------|
| **탭 전환** | 로그인 ↔ 회원가입 즉시 전환 |
| **역할 선택** | 학부모 / 어린이 작가 / 선생님 |
| **유효성 검사** | 빈 필드 체크, 중복 이름 체크 |

### 3. 🏛️ 3D 갤러리 (`#/gallery`)

| 요소 | 설명 |
|------|------|
| **공간 구성** | 40×50×8 크기의 갤러리, 파티션 벽, 기둥, 벤치 |
| **조명** | 천장 스팟라이트 3개, 벽면 작품 조명 8개, 앰비언트 |
| **포스트프로세싱** | ACES Filmic 톤매핑, 안개(Fog) 효과 |
| **조작법** | PointerLock API → WASD 이동 + 마우스 시점 |
| **인터랙션** | Raycaster로 작품 클릭 감지 → 상세 팝업 |
| **충돌 처리** | 벽면 경계 제한으로 갤러리 밖으로 나가는 것 방지 |

### 4. 👶 작가 페이지 (`#/artists` → `#/artists/{id}`)

| 요소 | 설명 |
|------|------|
| **작가 목록** | 카드 그리드 (이모지 아바타, 이름, 나이, 작품 수) |
| **작가 상세** | 프로필 + 작품 그리드 (호버 확대 효과) |
| **작품 모달** | 상세 정보 + AI 스튜디오 / 갤러리 바로가기 |

### 5. 🤖 AI 스튜디오 (`#/ai-studio`)

| 탭 | 입력 | 출력 |
|----|------|------|
| **📖 동화 생성** | 이미지 업로드 또는 기존 작품 선택 | AI가 생성한 동화 텍스트 |
| **🎬 애니메이션** | 이미지 + 스타일 선택 | 프레임 애니메이션 (재생/정지) |
| **🧊 2D→3D** | 이미지 + 깊이 설정 | CSS 3D 인터랙티브 미리보기 |

---

## 🤖 AI 서비스 아키텍처

교체 가능한 **프로바이더 패턴**으로 설계되어 있습니다.

```
┌─────────────────────────────────────────────────┐
│                  AI Studio UI                    │
│        (ai-studio.js — 사용자 인터페이스)          │
└─────────────────────┬───────────────────────────┘
                      │ getAIService()
                      ▼
┌─────────────────────────────────────────────────┐
│              AI Service Factory                  │
│         (index.js — 싱글톤 팩토리)                 │
│                                                  │
│  ┌─────────┐  현재 ──▶  MockAIProvider           │
│  │ 교체 시  │          (mock-provider.js)         │
│  │ 여기만  │                                      │
│  │ 수정!   │  미래 ──▶  OpenAIProvider            │
│  └─────────┘          StabilityProvider          │
│                       CustomProvider             │
└─────────────────────┬───────────────────────────┘
                      │ extends
                      ▼
┌─────────────────────────────────────────────────┐
│           AIServiceProvider (추상)                │
│            (ai-provider.js)                      │
│                                                  │
│  • generateStory(image, options)                 │
│  • generateAnimation(image, options)             │
│  • convert2Dto3D(image, options)                 │
│  • getInfo()                                     │
└─────────────────────────────────────────────────┘
```

### 🔄 AI 프로바이더 교체 방법

```javascript
// src/services/ai/index.js

// 1단계: 새 프로바이더 import
import { OpenAIProvider } from './openai-provider.js';

// 2단계: 팩토리에서 프로바이더 교체 (이 한 줄만 바꾸면 끝!)
export function getAIService(config = {}) {
  if (!instance) {
    instance = new OpenAIProvider({ apiKey: 'your-api-key' });
  }
  return instance;
}
```

### 새 프로바이더 작성 예시

```javascript
// src/services/ai/openai-provider.js
import { AIServiceProvider } from './ai-provider.js';

export class OpenAIProvider extends AIServiceProvider {
  constructor(config) {
    super(config);
    this.name = 'OpenAI GPT-4 Vision';
    this.apiKey = config.apiKey;
  }

  async generateStory(imageData, options = {}) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [{ 
          role: 'user', 
          content: [
            { type: 'text', text: '이 그림을 보고 어린이를 위한 동화를 만들어주세요.' },
            { type: 'image_url', image_url: { url: imageData } }
          ]
        }]
      })
    });
    const data = await response.json();
    return { title: '생성된 동화', story: data.choices[0].message.content };
  }

  // generateAnimation(), convert2Dto3D() 도 동일하게 구현...
}
```

---

## 🎨 디자인 시스템

### 색상 팔레트

| 토큰 | 색상 | 용도 |
|------|------|------|
| `--color-primary` | ![#7c5cfc](https://placehold.co/15x15/7c5cfc/7c5cfc.png) `#7c5cfc` | 주 액센트 |
| `--color-accent` | ![#f472b6](https://placehold.co/15x15/f472b6/f472b6.png) `#f472b6` | 보조 액센트 |
| `--color-success` | ![#34d399](https://placehold.co/15x15/34d399/34d399.png) `#34d399` | 성공 |
| `--color-warning` | ![#fbbf24](https://placehold.co/15x15/fbbf24/fbbf24.png) `#fbbf24` | 경고 |
| `--color-bg` | ![#0e0e1a](https://placehold.co/15x15/0e0e1a/0e0e1a.png) `#0e0e1a` | 배경 |

### 디자인 특징

- 🌙 **다크 테마** 기본
- 💎 **글래스모피즘** 카드 (backdrop-filter blur)
- 🌈 **그래디언트** 타이틀 및 버튼
- ✨ **마이크로 애니메이션** (hover, scroll, transition)
- 📱 **반응형** 레이아웃 (모바일/태블릿/데스크톱)
- 🔤 **Outfit + Noto Sans KR** 듀얼 폰트 시스템

---

## 🔧 커스터마이징 가이드

### 샘플 데이터 수정

`src/data/sample-data.js`에서 작가와 작품을 추가/수정할 수 있습니다:

```javascript
{
  id: 'artist-7',
  name: '새로운 작가',
  age: 6,
  emoji: '🌟',
  bio: '소개글',
  artworks: [
    { id: 'a7-1', title: '작품명', description: '설명', date: '2026-03-17', color: '#ff6b6b' },
  ]
}
```

### 테마 색상 변경

`src/style.css`의 `:root` CSS 변수를 수정하세요:

```css
:root {
  --color-primary: #your-color;
  --color-accent: #your-accent;
  /* ... */
}
```

### 3D 갤러리 크기 조절

`src/pages/gallery3d.js` 상단의 상수를 수정하세요:

```javascript
const ROOM_WIDTH = 40;   // 갤러리 너비
const ROOM_DEPTH = 50;   // 갤러리 깊이
const ROOM_HEIGHT = 8;   // 갤러리 높이
const MOVE_SPEED = 8;    // 이동 속도
```

---

## 🗺️ 로드맵

- [ ] 🔐 백엔드 인증 시스템 (Firebase / Supabase)
- [ ] 📸 실제 이미지 업로드 및 저장
- [ ] 🤖 실제 AI API 연동 (OpenAI, Stability AI, Meshy)
- [ ] 🎮 3D 갤러리 VR 모드 (WebXR)
- [ ] 👨‍👩‍👧‍👦 학부모/교사 대시보드
- [ ] 🌐 다국어 지원
- [ ] 📱 PWA (Progressive Web App) 지원
- [ ] 🎵 갤러리 배경 음악
- [ ] 💬 작품 댓글 & 좋아요 기능
- [ ] 📊 작가 성장 기록 타임라인

---

## 🤝 기여하기

1. 이 리포지토리를 **Fork** 합니다
2. 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'feat: Add amazing feature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`)
5. **Pull Request**를 생성합니다

### 브랜치 네이밍 컨벤션

| 접두사 | 용도 | 예시 |
|--------|------|------|
| `feature/` | 새 기능 | `feature/vr-mode` |
| `fix/` | 버그 수정 | `fix/gallery-collision` |
| `style/` | 디자인 변경 | `style/light-theme` |
| `refactor/` | 코드 개선 | `refactor/ai-service` |
| `docs/` | 문서 수정 | `docs/api-guide` |

---

## 📄 라이선스

이 프로젝트는 [MIT License](LICENSE)를 따릅니다.

---

<p align="center">
  Made with 💜 by <a href="https://github.com/Jooyongseok">Jooyongseok</a>
</p>

<p align="center">
  <i>어린 예술가들의 꿈을 응원합니다 🎨✨</i>
</p>