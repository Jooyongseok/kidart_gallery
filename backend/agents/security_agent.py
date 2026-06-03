"""
Security Agent — 인증, 입력 검증, 세션/토큰 관리 전담
"""
import re
import html
from passlib.context import CryptContext
from jose import jwt, JWTError
import datetime
from agents.base_agent import BaseAgent
from config import settings

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SYSTEM_PROMPT = """<role>
당신은 KidArt Gallery의 보안(Security) 전담 에이전트입니다.
NEVER include passwords, tokens, or hashed values in logs or response text.
</role>

<context>
프로젝트: 어린이 그림을 AI로 분석해 동화를 생성하는 플랫폼.
오케스트레이터(main.py)가 인증·검증 작업을 당신에게 위임합니다.
당신은 인증·검증의 단일 진실 지점(Single Source of Truth)입니다.
</context>

<instructions>
1. 사용자 입력 데이터의 안전성 검증 — XSS, HTML 인젝션 방지
2. 비밀번호 bcrypt 해싱 및 검증
3. JWT 토큰 발급(HS256, 24시간 만료) 및 검증
4. 역할 기반 권한 체크 (viewer < artist < admin)
5. 도구 호출 시 필요한 최소 정보만 요청
6. 검증 실패는 반드시 구체적 이유와 함께 {"error": "..."} 반환
</instructions>

<guardrails>
- MAX_TURNS 초과 시 즉시 중단하고 현재 상태 반환
- 재시도 전 반성: "무엇이 실패했나? 같은 접근을 반복하고 있지 않나?"
- 비밀번호·토큰·해시값을 절대 로그나 응답 텍스트에 포함하지 않음
</guardrails>

<default_to_action>
명시적 지시가 없으면 제안이 아닌 실행을 기본으로 합니다.
</default_to_action>"""

TOOLS = [
    {
        "name": "hash_password",
        "description": "평문 비밀번호를 bcrypt로 해싱합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "password": {"type": "string", "description": "해싱할 평문 비밀번호"}
            },
            "required": ["password"]
        }
    },
    {
        "name": "verify_password",
        "description": "평문 비밀번호와 해시를 비교 검증합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "plain": {"type": "string"},
                "hashed": {"type": "string"}
            },
            "required": ["plain", "hashed"]
        }
    },
    {
        "name": "create_token",
        "description": "사용자 정보로 JWT access token을 생성합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "user_id": {"type": "integer"},
                "username": {"type": "string"},
                "role": {"type": "string"}
            },
            "required": ["user_id", "username", "role"]
        }
    },
    {
        "name": "validate_token",
        "description": "JWT 토큰의 유효성을 검증하고 payload를 반환합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "token": {"type": "string"}
            },
            "required": ["token"]
        }
    },
    {
        "name": "sanitize_input",
        "description": "사용자 입력에서 XSS 위험 문자열을 제거/이스케이프합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "text": {"type": "string"},
                "max_length": {"type": "integer", "description": "최대 허용 길이 (기본 1000)"}
            },
            "required": ["text"]
        }
    },
    {
        "name": "check_permission",
        "description": "사용자 role이 특정 action을 수행할 권한이 있는지 확인합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "role": {"type": "string", "description": "artist | viewer | admin"},
                "action": {"type": "string", "description": "upload_artwork | generate_story | view_gallery | manage_users"}
            },
            "required": ["role", "action"]
        }
    }
]

# role별 허용 action
PERMISSIONS: dict[str, set[str]] = {
    "viewer":  {"view_gallery"},
    "artist":  {"view_gallery", "upload_artwork", "generate_story"},
    "admin":   {"view_gallery", "upload_artwork", "generate_story", "manage_users"},
}


class SecurityAgent(BaseAgent):
    def __init__(self):
        super().__init__(system_prompt=SYSTEM_PROMPT, tools=TOOLS)
        self._tool_registry = {
            "hash_password":    self._hash_password,
            "verify_password":  self._verify_password,
            "create_token":     self._create_token,
            "validate_token":   self._validate_token,
            "sanitize_input":   self._sanitize_input,
            "check_permission": self._check_permission,
        }

    # ── tool 구현 ──────────────────────────────────────────────

    def _hash_password(self, inputs: dict, _ctx: dict) -> dict:
        hashed = pwd_context.hash(inputs["password"])
        return {"hashed_password": hashed}

    def _verify_password(self, inputs: dict, _ctx: dict) -> dict:
        ok = pwd_context.verify(inputs["plain"], inputs["hashed"])
        return {"valid": ok}

    def _create_token(self, inputs: dict, _ctx: dict) -> dict:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {
            "sub": str(inputs["user_id"]),
            "username": inputs["username"],
            "role": inputs["role"],
            "exp": expire,
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        return {"access_token": token, "token_type": "bearer"}

    def _validate_token(self, inputs: dict, _ctx: dict) -> dict:
        try:
            payload = jwt.decode(inputs["token"], SECRET_KEY, algorithms=[ALGORITHM])
            return {"valid": True, "user_id": int(payload["sub"]), "username": payload["username"], "role": payload["role"]}
        except JWTError as e:
            return {"valid": False, "error": str(e)}

    def _sanitize_input(self, inputs: dict, _ctx: dict) -> dict:
        text: str = inputs["text"]
        max_length: int = inputs.get("max_length", 1000)
        text = html.escape(text)
        # script 태그 제거 (이중 이스케이프 후에도 패턴 제거)
        text = re.sub(r"&lt;script.*?&gt;.*?&lt;/script&gt;", "", text, flags=re.IGNORECASE | re.DOTALL)
        text = text[:max_length]
        return {"sanitized": text, "original_length": len(inputs["text"]), "truncated": len(inputs["text"]) > max_length}

    def _check_permission(self, inputs: dict, _ctx: dict) -> dict:
        role = inputs["role"]
        action = inputs["action"]
        allowed = action in PERMISSIONS.get(role, set())
        return {"allowed": allowed, "role": role, "action": action}

    # ── 직접 호출 편의 메서드 (오케스트레이터용) ────────────────

    def hash_password_direct(self, password: str) -> str:
        return pwd_context.hash(password)

    def verify_password_direct(self, plain: str, hashed: str) -> bool:
        return pwd_context.verify(plain, hashed)

    def create_token_direct(self, user_id: int, username: str, role: str) -> dict:
        return self._create_token({"user_id": user_id, "username": username, "role": role}, {})

    def validate_token_direct(self, token: str) -> dict:
        return self._validate_token({"token": token}, {})
