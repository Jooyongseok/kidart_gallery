# KidArt Gallery
**Last Updated**: 2026-04-03

## Quick Start
```bash
# 백엔드
cd /project/ahnailab/jys0207/kidart_gallery/backend
ANTHROPIC_API_KEY="your-key" uvicorn main:app --reload --port 8200

# 프론트엔드
cd /project/ahnailab/jys0207/kidart_gallery
python3 -m http.server 8080  # → http://localhost:8080
```

---

## Module Map

| 모듈 | 상태 | 서브 CLAUDE.md | 다음 작업 |
|------|------|---------------|----------|
| **3D 갤러리** | ✅ 작동 / 개선 중 | `src/pages/gallery3d/CLAUDE.md` | 신규 미술관 템플릿 추가, UX 개선 |
| **동화책 생성** | ⏳ Mock 상태 | `src/pages/story/CLAUDE.md` | `/storybook` 뷰어 페이지, 페이지 전환 애니메이션 |
| **캐릭터 3D 변환** | ❌ 미구현 | `src/pages/character3d/CLAUDE.md` | MVP 아키텍처 설계 |
| **백엔드/DB/보안** | ✅ 완성 / 연동 필요 | `backend/CLAUDE.md` | index.js Provider swap, PostgreSQL 마이그레이션 |
| **배포** | ❌ | `backend/CLAUDE.md` → Deploy 섹션 | Docker + 서버 설정 |

> 각 모듈 작업 시 해당 서브 CLAUDE.md를 먼저 읽을 것.

---

## Shared Conventions

### 라우팅 (Hash SPA)
- `src/router.js` — 경로 → 핸들러 매핑
- 각 페이지 모듈은 `init(container)` + `cleanup()` export

### AI Provider 교체
- `src/services/ai/index.js` L27 한 줄만 수정
  - Mock (기본): `new MockAIProvider(config)`
  - 백엔드 연동: `new BackendAIProvider({ baseUrl: 'http://localhost:8200' })`

### ES Modules 규칙
- `file://` 불가 → 반드시 HTTP 서버 실행 후 접속
- Three.js CDN → `typeof THREE === 'undefined'` 가드 필수

### 주의사항
- `test/config.js` HF 토큰 하드코딩 → push 전 `.gitignore` 확인
- `backend/uploads/`, `*.db` → 런타임 결과물, gitignore 처리됨
