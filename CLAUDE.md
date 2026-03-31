# KidArt Gallery — CLAUDE.md
**Last Updated**: 2026-03-31

## Quick Start
```bash
# 백엔드 (FastAPI 멀티 에이전트)
cd /project/ahnailab/jys0207/kidart_gallery/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8200

# 프론트엔드
cd /project/ahnailab/jys0207/kidart_gallery
python3 -m http.server 8080
# → http://localhost:8080
```

## Architecture
```
kidart_gallery/
├── src/          # Vanilla JS SPA (ES Modules, Three.js 3D gallery)
├── test/         # 로컬 vLLM 테스트 UI (story-test.html)
└── backend/      # FastAPI + 4 Claude 에이전트 오케스트레이터
```

### 멀티 에이전트 흐름
```
Frontend → POST /api/generate-story
  1. Security Agent  : 입력 검증 (content_type, template, model_key)
  2. Modeling Agent  : VLM 분석 → 한국어 동화 생성 → SCENE 태그 파싱
  3. Modeling Agent  : Pollinations.ai 삽화 URL 생성
  4. Design Agent    : 레이아웃/테마/애니메이션 제안
  5. DB Agent        : 결과 저장 (로그인 + artwork_id 있을 때만)
```

## Agent Roles
| 에이전트 | 파일 | Tools | 역할 |
|---------|------|-------|------|
| Security | `backend/agents/security_agent.py` | 6 | JWT/bcrypt/XSS/RBAC |
| DB | `backend/agents/db_agent.py` | 6 | User/Artwork/Story CRUD |
| Modeling | `backend/agents/modeling_agent.py` | 4 | VLM+스토리+삽화 |
| Design | `backend/agents/design_agent.py` | 4 | 레이아웃/테마/CSS |

## Key Conventions

### 에이전트 패턴
- `BaseAgent.run()` : async tool_use 루프, `MAX_TURNS=10`
- **direct methods** : 오케스트레이터에서 sync 직접 호출 (`hash_password_direct()` 등)
- **시스템 프롬프트**: XML 구조 `<role>`, `<context>`, `<instructions>`, `<guardrails>`
- 재시도 전 반성: "무엇이 실패했나? 같은 접근을 반복하고 있지 않나?"

### 백엔드 규칙
- SQLAlchemy 2.0 — `Mapped[T]` / `mapped_column()` 사용
- Story.pages_json / scenes_json : `json.dumps(list)` → Text 컬럼
- DBAgent : per-request 세션 주입 (`DBAgent(db)`)
- 업로드: `uploads/{uuid}.ext`, 10MB 제한
- 환경변수: `ANTHROPIC_API_KEY`, `SECRET_KEY`

### 프론트엔드 규칙
- ES Modules — `file://` 불가, HTTP 서버 필수
- Three.js CDN → `typeof THREE === 'undefined'` 체크 후 init
- AI Provider 교체: `src/services/ai/index.js` L27 한 줄만 수정

## API Endpoints
| Method | Path | Auth | 담당 에이전트 |
|--------|------|------|-------------|
| POST | `/api/generate-story` | 선택 | Security+Modeling+Design+DB |
| POST | `/api/artworks` | 필수 | Security+DB |
| GET | `/api/artworks` | 선택 | DB |
| POST | `/api/auth/login` | — | Security+DB |
| POST | `/api/auth/register` | — | Security+DB |
| GET | `/api/stories/{artwork_id}` | 필수 | DB |
| GET | `/api/health` | — | — |

## Frontend AI Provider Swap
`src/services/ai/index.js` L27 변경:
```js
// MockAIProvider (기본):
instance = new MockAIProvider(config);

// BackendAIProvider (백엔드 연동):
instance = new BackendAIProvider({ baseUrl: 'http://localhost:8200' });
```

## Local VLM Models (test/ only, :8100)
- `qwen` → Qwen/Qwen2.5-VL-7B-Instruct
- `llama` → meta-llama/Llama-3.2-11B-Vision-Instruct
- `mistral` → mistralai/Pixtral-12B-2409

## Current Status
| 기능 | 상태 |
|------|------|
| 프론트엔드 SPA + 3D 갤러리 | ✅ |
| 동화 생성 테스트 (vLLM 로컬) | ✅ |
| FastAPI 멀티 에이전트 백엔드 | ✅ |
| BackendAIProvider (프론트 연결) | ✅ |
| 메인앱 ↔ 백엔드 실제 연동 | ⏳ (index.js swap 필요) |
| SD Turbo 로컬 삽화 연동 | ❌ |
| PostgreSQL / 프로덕션 배포 | ❌ |

## Important Notes
- `test/config.js`에 HF 토큰 하드코딩 → push 전 gitignore 확인
- `backend/uploads/` 및 `*.db` → .gitignore 제외 (런타임 결과물)
- 에이전트 시스템 프롬프트는 `backend/agents/*.py`의 `SYSTEM_PROMPT` 상수
