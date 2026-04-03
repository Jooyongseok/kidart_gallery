# Story Module (동화책 생성)
**Last Updated**: 2026-04-03

## 현재 상태: ⏳ Mock 데이터 상태

AI 스튜디오(`ai-studio.js`)의 동화 생성 탭에서 Mock 데이터만 반환. 별도 뷰어 페이지 없음.

---

## 관련 파일
| 파일 | 역할 |
|------|------|
| `src/pages/ai-studio.js` | AI 스튜디오 UI (동화/애니/3D 탭) |
| `src/services/ai/mock-provider.js` | 샘플 동화 2개 하드코딩 |
| `src/services/ai/backend-provider.js` | `generateStory()` — POST `/api/generate-story` |
| `backend/agents/modeling_agent.py` | VLM 분석 → 동화 생성 → SCENE 파싱 |
| `backend/agents/design_agent.py` | 레이아웃/테마/애니메이션 제안 |

## 동화 데이터 구조
```json
{
  "title": "마법의 숲 속 토끼",
  "pages": ["옛날 옛적에...", "어느 날...", ...],
  "scenes": ["A rabbit in a magical forest", ...],
  "page_images": ["https://pollinations.ai/..."],
  "layout": { "theme": "fantasy", "animation": "page-turn" }
}
```

---

## 다음 태스크
- [ ] `/storybook` 뷰어 페이지 신규 생성 (router 등록)
  - 페이지 넘김 애니메이션 (CSS 3D transform flip)
  - 삽화 + 텍스트 양면 레이아웃
  - 음성 재생 (Web Speech API TTS)
- [ ] `ai-studio.js` 동화 생성 결과 → `/storybook?id=xxx` 리다이렉트
- [ ] Backend Provider swap 후 실제 생성 테스트
