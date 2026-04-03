# KidArt Gallery — Backend Module
**Last Updated**: 2026-04-03

## Quick Start
```bash
cd /project/ahnailab/jys0207/kidart_gallery/backend
pip install -r requirements.txt
ANTHROPIC_API_KEY="your-key" uvicorn main:app --reload --port 8200
# Health check: curl http://localhost:8200/api/health
```

---

## 현재 상태
| 컴포넌트 | 상태 | 비고 |
|---------|------|------|
| FastAPI 오케스트레이터 | ✅ | `main.py` — 6개 엔드포인트 |
| 4개 Claude 에이전트 | ✅ | agents/ 폴더 |
| SQLite DB | ✅ | 개발용, 런타임 생성 |
| 프론트엔드 연동 | ⏳ | `src/services/ai/index.js` L27 swap 필요 |
| PostgreSQL 마이그레이션 | ❌ | |
| Docker 배포 | ❌ | |

---

## 에이전트 아키텍처

### 파이프라인 (`POST /api/generate-story`)
```
입력 → Security Agent (검증)
     → Modeling Agent (VLM 분석 → 한국어 동화 → SCENE 파싱)
     → Modeling Agent (Pollinations.ai 삽화 URL)
     → Design Agent (레이아웃/테마/애니 제안)
     → DB Agent (저장, 로그인 시에만)
```

### 에이전트 패턴
- `BaseAgent.run()`: async tool_use 루프, `MAX_TURNS=10`
- **direct methods**: 오케스트레이터에서 sync 직접 호출 (`hash_password_direct()` 등)
- 시스템 프롬프트: XML 구조 `<role>` `<context>` `<instructions>` `<guardrails>`
- 에러 반환: 항상 `{"error": "메시지"}` dict (예외 발생 금지)

### 파일 맵
| 파일 | 역할 |
|------|------|
| `main.py` | FastAPI + 에이전트 오케스트레이터 |
| `agents/base_agent.py` | BaseAgent (tool_use 루프, MAX_TURNS=10) |
| `agents/security_agent.py` | JWT/bcrypt/XSS/RBAC (6 tools) |
| `agents/db_agent.py` | User/Artwork/Story CRUD (6 tools) |
| `agents/modeling_agent.py` | VLM 분석 + 동화 + 삽화 (4 tools) |
| `agents/design_agent.py` | 레이아웃/테마/CSS 제안 (4 tools) |
| `database/models.py` | SQLAlchemy 2.0 ORM (User, Artwork, Story) |
| `database/connection.py` | SQLite 연결, init_db() |

---

## API 엔드포인트
| Method | Path | Auth | 에이전트 |
|--------|------|------|---------|
| POST | `/api/generate-story` | 선택 | Security+Modeling+Design+DB |
| POST | `/api/artworks` | 필수 | Security+DB |
| GET | `/api/artworks` | 선택 | DB |
| POST | `/api/auth/login` | — | Security+DB |
| POST | `/api/auth/register` | — | Security+DB |
| GET | `/api/stories/{artwork_id}` | 필수 | DB |
| GET | `/api/health` | — | — |

---

## DB 규칙
- SQLAlchemy 2.0 — `Mapped[T]` / `mapped_column()` 패턴만 사용
- `Story.pages_json` / `scenes_json`: `json.dumps(list)` → Text 컬럼
- `DBAgent`: per-request 세션 주입 `DBAgent(db)`
- 파일 업로드: `uploads/{uuid}.ext`, 10MB 제한

## 환경변수
- `ANTHROPIC_API_KEY` (필수)
- `SECRET_KEY` (기본값: "kidart-dev-secret-change-in-prod")

---

## 다음 태스크

### 🔗 프론트엔드 연동 (우선순위 HIGH)
- [ ] `src/services/ai/index.js` L27: `MockAIProvider` → `BackendAIProvider` swap
- [ ] CORS 확인 (현재 `allow_origins=["*"]`)
- [ ] 실제 이미지 업로드 테스트

### 🔒 보안 강화
- [ ] `SECRET_KEY` 환경변수 필수화 (기본값 제거)
- [ ] Rate limiting (slowapi)
- [ ] Refresh token + 만료 처리

### 🗄️ DB 마이그레이션 (PostgreSQL)
- [ ] `requirements.txt`에 `asyncpg`, `alembic` 추가
- [ ] `DATABASE_URL` 환경변수 기반 드라이버 선택
- [ ] Alembic migration 초기 설정

### 🚀 배포
- [ ] `Dockerfile` 작성 (uvicorn + 8200 포트)
- [ ] `docker-compose.yml` (app + postgres)
- [ ] nginx reverse proxy 설정
