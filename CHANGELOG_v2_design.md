# KidArt Gallery — Design v2 변경 내역
**날짜**: 2026-04-04

## 개요
랜딩 페이지 및 전체 디자인 시스템을 미니멀리즘 + 다크/라이트 모드 기반으로 전면 리뉴얼.

## 변경 파일

### 1. `index.html`
- Space Grotesk + Noto Sans KR 폰트로 교체
- `data-theme="dark"` 기본 적용, `color-scheme` 메타 추가
- FOUC 방지: 인라인 스크립트로 localStorage에서 저장된 테마 즉시 적용
- `font-display=swap` 적용된 Google Fonts 링크

### 2. `src/style.css` (전면 재작성, ~1500줄)
- **다크/라이트 모드**: CSS 변수 기반 `[data-theme="dark"]` / `[data-theme="light"]` 토큰
- **색상 팔레트 (5색)**:
  - Primary: `#8B5CF6` (Violet)
  - Secondary: `#EC4899` (Pink)
  - Accent: `#06B6D4` (Cyan)
  - Warm: `#F59E0B` (Amber)
  - Success: `#10B981` (Emerald)
- **타이포그래피**: Space Grotesk (display), Noto Sans KR (body), letter-spacing -0.02em
- **Scroll Reveal 시스템**: `.reveal`, `.reveal-left`, `.reveal-right`, `.reveal-scale` + stagger 딜레이
- **페이지 전환**: `.page-enter` 애니메이션 (fade-in + slide-up)
- **Navbar**: 자동 숨김(scroll down), 그림자(scrolled), 모바일 햄버거 + 드로어
- **Hero**: Parallax orb, gradient text animation, scroll hint
- **Stats**: 카운터 애니메이션 레이아웃
- **Feature Cards**: SVG 아이콘, glassmorphism 카드 그리드
- **Portfolio**: 가로 스크롤 (scroll-snap), 스크롤 인디케이터 dots
- **Process Steps**: 01/02/03 넘버링, 커넥터 라인
- **CTA**: 그라디언트 glow 배경, 자석 버튼 스타일
- **Footer**: 미니멀 2컬럼 (copyright + links)
- **접근성**: `:focus-visible`, `.skip-link`, `prefers-reduced-motion` 미디어쿼리
- **반응형**: 375px / 480px / 768px 브레이크포인트
- 기존 페이지 (gallery3d, artist, ai-studio, login, storybook) 호환 유지

### 3. `src/pages/landing.js` (전면 재작성)
- **Parallax Hero**: 3개의 blurred orb, `data-parallax` 속도 계수, scroll 이벤트 연동
- **Stats Counter**: IntersectionObserver 트리거, ease-out-cubic 카운팅 애니메이션
- **Features**: 6개 SVG 아이콘 카드, stagger 순차 등장
- **Horizontal Portfolio**: `getAllArtworks()` 기반 카드, scroll-snap, dot 인디케이터 클릭 이동
- **Process Steps**: 3단계 (업로드 → AI 변환 → 갤러리 전시)
- **Magnetic CTA Button**: mousemove 추적, 반경 120px 내 0.35 강도 자석 효과
- **Cleanup**: 라우트 변경 시 이벤트 리스너 정리 (메모리 누수 방지)

### 4. `src/components/navbar.js` (재작성)
- **다크/라이트 토글**: 버튼 클릭 → `data-theme` 변경 + localStorage 저장 + 아이콘 업데이트
- **모바일 햄버거**: CSS 애니메이션 open/close, 드로어 메뉴, body overflow 제어
- **Auto-hide**: 스크롤 다운 시 navbar 숨김, 스크롤 업 시 표시, 300px 이후 활성
- **접근성**: `aria-label`, `aria-expanded`, `role`, `tabindex`, 키보드 탐색

### 5. `src/router.js` (수정)
- 라우트 변경 시 `window.scrollTo(0, 0)` 추가

### 6. `src/main.js` (수정)
- `renderLanding()` 반환값(cleanup 함수)을 라우터에 전달하도록 변경

## 디자인 원칙
- 미니멀리즘: 넓은 여백, 불필요한 장식 제거
- 성능: font preconnect, async Three.js, passive scroll listeners, will-change 최소화
- 접근성: WCAG AA 대비비, focus-visible, reduced-motion, semantic HTML
- 반응형: 모바일 우선, 3단계 브레이크포인트
