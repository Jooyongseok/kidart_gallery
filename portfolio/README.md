# Jooyongseok Portfolio (React + Vite)

학교 과제 — React (Vite) + 외부 API + Cloudflare Pages 자동 배포 학습용 포트폴리오 스타터입니다.

> 이 프로젝트는 `kidart_gallery` 저장소의 **`portfolio-react` 브랜치**에서만 작동합니다.
> `main` 브랜치(원본 vanilla JS 갤러리)는 그대로 유지됩니다.

---

## 🚀 빠른 시작

```bash
cd portfolio
npm install
npm run dev
# → http://localhost:5173
```

빌드 + 로컬 미리보기:
```bash
npm run build
npm run preview
# → http://localhost:4173
```

---

## 📁 디렉토리 구조

```
portfolio/
├── package.json
├── vite.config.js          # base: './' (Cloudflare Pages 호환)
├── index.html
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx            # ReactDOM root
    ├── App.jsx             # 섹션 조립
    ├── App.css             # 메인 스타일
    ├── index.css           # 디자인 토큰 + reset
    └── components/
        ├── Navbar.jsx
        ├── Hero.jsx
        ├── About.jsx
        ├── Projects.jsx
        ├── ContactForm.jsx  # ← Formspree 연동
        └── Footer.jsx
```

---

## ✏️ 채워야 할 placeholder

| 파일 | 수정할 내용 |
|------|------------|
| `src/components/Hero.jsx` | 이름, 한 줄 소개 |
| `src/components/About.jsx` | 자기소개 단락, 스킬 리스트 |
| `src/components/Projects.jsx` | 프로젝트 카드 (현재 2개 샘플) |
| `src/components/ContactForm.jsx` | `FORMSPREE_ENDPOINT` 교체 |
| `src/components/Footer.jsx` | GitHub URL, 이메일 |
| `index.html` | 페이지 title, description |

---

## 📮 Formspree 연동

1. https://formspree.io 가입 (무료 50건/월)
2. **New Form** 생성 → Endpoint URL 복사 (예: `https://formspree.io/f/xpwzgkno`)
3. 다음 중 하나로 적용:

   **방법 A** — 코드에 직접 (간단)
   ```jsx
   // src/components/ContactForm.jsx 상단
   const FORMSPREE_ENDPOINT = 'https://formspree.io/f/YOUR_ID';
   ```

   **방법 B** — 환경변수 (권장)
   ```bash
   # portfolio/.env (gitignore됨)
   VITE_FORMSPREE_ENDPOINT=https://formspree.io/f/YOUR_ID
   ```
   Vite는 `VITE_` 접두사가 붙은 환경변수만 클라이언트에 노출합니다.

4. Cloudflare Pages 배포 시에도 환경변수 동일 이름으로 추가 가능 (Settings → Environment variables)

---

## ☁️ Cloudflare Pages 자동 배포

### 첫 설정
1. https://dash.cloudflare.com 에서 Cloudflare 계정 생성/로그인
2. 좌측 메뉴 **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
3. GitHub 연동 → `Jooyongseok/kidart_gallery` 저장소 선택
4. 빌드 설정:
   - **Project name**: `jooyongseok-portfolio` (원하는 대로)
   - **Production branch**: `portfolio-react` ← 중요!
   - **Framework preset**: `Vite`
   - **Build command**: `cd portfolio && npm install && npm run build`
   - **Build output directory**: `portfolio/dist`
   - **Root directory (advanced)**: `/` (그대로 둠)
5. **Save and Deploy** 클릭 → 첫 빌드 시작

### 환경변수 (Formspree)
- Pages 프로젝트 → **Settings** → **Environment variables**
- Variable name: `VITE_FORMSPREE_ENDPOINT`
- Value: `https://formspree.io/f/YOUR_ID`
- Production / Preview 둘 다 추가
- 저장 후 **재배포 필요** (Deployments → 점 3개 → Retry deployment)

### 자동 배포
이후 `portfolio-react` 브랜치에 push하면 Cloudflare가 자동으로 빌드 + 배포합니다.

---

## 🔧 빌드 오류가 났을 때 (학습 가이드)

> **이 과제의 핵심 목적**: AI CLI와 대화하며 에러를 해결하는 경험을 쌓는 것입니다.

빌드가 실패하면:

1. **Cloudflare Pages 빌드 로그 전체 복사**
   - Deployments → 실패한 빌드 클릭 → Build log 탭
   - 에러 메시지 + 그 위 10줄 정도 함께 복사

2. **AI에게 물어보기** (Claude Code, ChatGPT, Cursor 등)
   ```
   Cloudflare Pages 빌드가 실패했어. 로그는 다음과 같아:
   [붙여넣기]
   원인이 뭐고 어떻게 고쳐?
   ```

3. **흔한 빌드 오류 패턴**
   | 증상 | 원인 | 해결 |
   |------|------|------|
   | `Cannot find module 'xxx'` | 의존성 누락 | `package.json`에 추가 후 push |
   | `EACCES: permission denied` | 권한 문제 | Cloudflare 환경변수에 `NPM_FLAGS=--prefer-offline` |
   | `Out of memory` | Node 메모리 부족 | `NODE_OPTIONS=--max_old_space_size=4096` 환경변수 |
   | `Unknown file extension ".jsx"` | Vite 설정 누락 | `vite.config.js`에 `@vitejs/plugin-react` 확인 |
   | `Cannot resolve './Component'` | 경로 대소문자 (Linux는 case-sensitive!) | 파일명 대소문자 일치 확인 |
   | `Build script not found` | Build command 오타 | Cloudflare 빌드 설정 재확인 |

4. **로컬에서 먼저 재현**
   ```bash
   cd portfolio
   rm -rf node_modules dist
   npm install
   npm run build
   ```
   로컬에서 잘 되는데 Cloudflare에서만 실패하면 보통 Node 버전 차이입니다.
   Cloudflare Pages 기본 Node 버전을 변경하려면 `Settings → Environment variables`에:
   ```
   NODE_VERSION = 20
   ```

---

## 📚 학습 노트

이 포트폴리오는 **완성품이 아니라 출발점**입니다. 졸업 전까지 다음을 추가해보세요:

- [ ] 실제 본인 사진/아바타
- [ ] 더 많은 프로젝트 카드
- [ ] 다크/라이트 토글 (현재는 OS 설정 자동 감지)
- [ ] 다국어 지원 (i18n)
- [ ] 블로그/Notes 섹션
- [ ] 이력서 PDF 다운로드 버튼
- [ ] 모바일 햄버거 메뉴
- [ ] 스크롤 애니메이션 (Framer Motion)
- [ ] SEO 메타 태그 강화 + Open Graph

---

## 🛠 기술 스택

- **React 18** — UI 라이브러리
- **Vite 5** — 빠른 개발 서버 + 빌드
- **CSS Variables** — 디자인 토큰 (Tailwind 없이 가벼움)
- **Formspree** — 무서버 폼 제출 API
- **Cloudflare Pages** — 정적 호스팅 + 자동 배포

---

## 📝 라이선스

MIT
