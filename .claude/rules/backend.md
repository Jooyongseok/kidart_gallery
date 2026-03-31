---
description: KidArt Gallery FastAPI 백엔드 개발 규칙
paths:
  - "backend/**"
---

# Backend Development Rules

## FastAPI 패턴
- 엔드포인트는 `main.py`에서만 정의 (라우터 분리 없음)
- 인증 필수: `Depends(require_auth)` / 선택: `Depends(get_current_user)`
- FormData + UploadFile 사용 시 `python-multipart` 필수
- CORS 허용: localhost:8080, 3000, 8200 (변경 시 `main.py` 수정)

## SQLAlchemy 2.0 규칙
- 모델 정의: `Mapped[T]` + `mapped_column()` 사용 (legacy Column 금지)
- 세션: `DBAgent(db)` per-request 주입 패턴 유지
- JSON 배열 저장: `json.dumps(list)` → Text 컬럼 (pages_json, scenes_json)
- 관계: `relationship()` + `back_populates` 양방향 명시

## 파일 업로드
- 저장 경로: `uploads/{uuid4().hex}{ext}` (고정)
- 파일 크기: 10MB 이하 강제
- 파일 타입: `content_type.startswith("image/")` 검증

## 환경 변수
- `ANTHROPIC_API_KEY`: Claude API (필수)
- `SECRET_KEY`: JWT 서명 키 (기본값은 dev용)
- `.env` 파일 사용 권장, gitignore 필수

## 금지 사항
- `uploads/`, `*.db` 파일 git commit 금지
- `SECRET_KEY` 하드코딩 프로덕션 배포 금지
- 에이전트 tool_use 루프 외부에서 `anthropic.Anthropic()` 직접 호출 금지
