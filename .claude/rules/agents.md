---
description: KidArt Gallery 에이전트 개발 규칙 및 시스템 프롬프트 패턴
paths:
  - "backend/agents/**"
---

# Agent Development Rules

## tool_use 루프 패턴 (BaseAgent 상속)
```python
# ✅ 올바른 에이전트 정의
class MyAgent(BaseAgent):
    SYSTEM_PROMPT = """..."""  # XML 구조 사용 (아래 참고)

    def __init__(self):
        super().__init__(self.SYSTEM_PROMPT, self._define_tools())
        self._tool_registry = {
            "tool_name": self._tool_method,
        }

    def _define_tools(self) -> list[dict]:
        return [{"name": "tool_name", "description": "...", "input_schema": {...}}]

    def _tool_method(self, inputs: dict, context: dict) -> dict:
        # 동기 함수로 작성 (BaseAgent가 _dispatch_tool에서 호출)
        return {"result": ...}
```

## 시스템 프롬프트 XML 구조 (Anthropic 권장)
```
<role>
  당신은 KidArt Gallery의 [역할명] 전담 에이전트입니다.
</role>

<context>
  프로젝트: 어린이 그림을 AI로 분석해 동화를 생성하는 플랫폼
  오케스트레이터(main.py)가 당신에게 특정 작업을 위임합니다.
</context>

<instructions>
  - [구체적 책임 목록 — 번호 매기기]
  - 도구 호출 시 필요한 최소 정보만 요청
  - 불확실한 경우 추측하지 말고 오류 딕셔너리 반환
</instructions>

<guardrails>
  - MAX_TURNS 초과 시 작업 중단하고 현재 상태 반환
  - 재시도 전 반성: "무엇이 실패했나? 같은 접근을 반복하고 있지 않나?"
  - 민감한 데이터(비밀번호, 토큰)는 로그/응답에 포함하지 않음
</guardrails>

<default_to_action>
  명시적 지시가 없으면 제안이 아닌 실행을 기본으로 합니다.
</default_to_action>
```

## Direct Methods 패턴
- 오케스트레이터(main.py)는 `async run()` 대신 `*_direct()` 메서드 사용
- direct 메서드: 동기, 빠른 호출, tool_use 루프 없음
- 네이밍: `{tool_name}_direct(args) → dict`

## Primacy / Recency 효과 활용
- 시스템 프롬프트 **첫 부분**: 역할 정의, 핵심 금지사항
- 시스템 프롬프트 **마지막 부분**: 중요 규칙 재강조
- **중간 부분**: 상세 절차, 예시 (주의력 낮음)

## 에러 반환 규칙
- 실패 시 항상 `{"error": "메시지"}` 딕셔너리 반환
- 예외 발생 금지 (오케스트레이터에서 HTTP 예외로 변환)
- 단, ValueError/TypeError 등 프로그래밍 오류는 그대로 raise

## 금지 사항
- 에이전트 내부에서 다른 에이전트 직접 import/호출 금지 (오케스트레이터 패턴 위반)
- tool_use 루프에서 외부 상태 변경 금지 (DB 조작은 DB Agent를 통해서만)
- MAX_TURNS 초과 후 계속 진행 금지 (무한 루프 방지)
