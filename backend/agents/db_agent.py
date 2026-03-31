"""
DB Agent — 작품/스토리/유저 데이터 CRUD 전담
"""
import json
from sqlalchemy.orm import Session
from database.models import User, Artwork, Story
from agents.base_agent import BaseAgent

SYSTEM_PROMPT = """<role>
당신은 KidArt Gallery의 데이터베이스(DB) 전담 에이전트입니다.
모든 상태는 당신을 통해서만 읽고 씁니다.
</role>

<context>
프로젝트: 어린이 그림을 AI로 분석해 동화를 생성하는 플랫폼.
오케스트레이터(main.py)가 User/Artwork/Story CRUD 작업을 당신에게 위임합니다.
SQLAlchemy 2.0 ORM + SQLite(개발) / PostgreSQL(프로덕션) 환경.
</context>

<instructions>
1. 사용자(User), 작품(Artwork), 스토리(Story) 데이터 저장·조회·검색
2. 데이터 무결성 확인 — 중복 username, FK 위반 등 명확히 보고
3. pages/scenes 배열은 json.dumps()로 직렬화하여 Text 컬럼에 저장
4. 존재하지 않는 데이터 요청 시 {"error": "..."} 반환 (예외 발생 금지)
5. 쿼리 결과는 항상 직렬화 가능한 dict/list 형태로 반환
</instructions>

<guardrails>
- MAX_TURNS 초과 시 즉시 중단하고 현재 상태 반환
- 재시도 전 반성: "무엇이 실패했나? 같은 접근을 반복하고 있지 않나?"
- DB 세션(db)은 오케스트레이터가 주입 — 에이전트 내에서 새 세션 생성 금지
</guardrails>

<default_to_action>
명시적 지시가 없으면 제안이 아닌 실행을 기본으로 합니다.
</default_to_action>"""

TOOLS = [
    {
        "name": "create_user",
        "description": "새 사용자를 DB에 저장합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "username": {"type": "string"},
                "hashed_password": {"type": "string"},
                "role": {"type": "string", "description": "artist | viewer | admin"}
            },
            "required": ["username", "hashed_password"]
        }
    },
    {
        "name": "get_user_by_username",
        "description": "username으로 사용자 정보를 조회합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "username": {"type": "string"}
            },
            "required": ["username"]
        }
    },
    {
        "name": "save_artwork",
        "description": "새 작품 메타데이터를 저장합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "description": {"type": "string"},
                "image_path": {"type": "string"},
                "owner_id": {"type": "integer"}
            },
            "required": ["title", "image_path", "owner_id"]
        }
    },
    {
        "name": "get_artworks",
        "description": "작품 목록을 조회합니다. owner_id로 필터 가능.",
        "input_schema": {
            "type": "object",
            "properties": {
                "owner_id": {"type": "integer", "description": "특정 사용자 작품만 조회 (선택)"},
                "limit": {"type": "integer", "description": "최대 개수 (기본 20)"}
            }
        }
    },
    {
        "name": "save_story",
        "description": "생성된 스토리 결과를 DB에 저장합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "artwork_id": {"type": "integer"},
                "template": {"type": "string"},
                "vlm_model": {"type": "string"},
                "title": {"type": "string"},
                "pages": {"type": "array", "items": {"type": "string"}},
                "scenes": {"type": "array", "items": {"type": "string"}},
                "page_images": {"type": "array", "items": {"type": "string"}},
                "layout_suggestion": {"type": "string"}
            },
            "required": ["artwork_id", "vlm_model", "title", "pages", "scenes"]
        }
    },
    {
        "name": "get_stories_by_artwork",
        "description": "특정 작품의 스토리 목록을 조회합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "artwork_id": {"type": "integer"}
            },
            "required": ["artwork_id"]
        }
    }
]


class DBAgent(BaseAgent):
    def __init__(self, db: Session):
        super().__init__(system_prompt=SYSTEM_PROMPT, tools=TOOLS)
        self.db = db
        self._tool_registry = {
            "create_user":           self._create_user,
            "get_user_by_username":  self._get_user_by_username,
            "save_artwork":          self._save_artwork,
            "get_artworks":          self._get_artworks,
            "save_story":            self._save_story,
            "get_stories_by_artwork": self._get_stories_by_artwork,
        }

    # ── tool 구현 ──────────────────────────────────────────────

    def _create_user(self, inputs: dict, _ctx: dict) -> dict:
        if self.db.query(User).filter(User.username == inputs["username"]).first():
            return {"error": "username already exists"}
        user = User(
            username=inputs["username"],
            hashed_password=inputs["hashed_password"],
            role=inputs.get("role", "artist"),
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return {"id": user.id, "username": user.username, "role": user.role}

    def _get_user_by_username(self, inputs: dict, _ctx: dict) -> dict:
        user = self.db.query(User).filter(User.username == inputs["username"]).first()
        if not user:
            return {"error": "user not found"}
        return {"id": user.id, "username": user.username, "role": user.role, "hashed_password": user.hashed_password, "is_active": user.is_active}

    def _save_artwork(self, inputs: dict, _ctx: dict) -> dict:
        artwork = Artwork(
            title=inputs["title"],
            description=inputs.get("description"),
            image_path=inputs["image_path"],
            owner_id=inputs["owner_id"],
        )
        self.db.add(artwork)
        self.db.commit()
        self.db.refresh(artwork)
        return {"id": artwork.id, "title": artwork.title}

    def _get_artworks(self, inputs: dict, _ctx: dict) -> dict:
        query = self.db.query(Artwork)
        if "owner_id" in inputs:
            query = query.filter(Artwork.owner_id == inputs["owner_id"])
        limit = inputs.get("limit", 20)
        artworks = query.order_by(Artwork.created_at.desc()).limit(limit).all()
        return {"artworks": [{"id": a.id, "title": a.title, "image_path": a.image_path, "owner_id": a.owner_id} for a in artworks]}

    def _save_story(self, inputs: dict, _ctx: dict) -> dict:
        story = Story(
            artwork_id=inputs["artwork_id"],
            template=inputs.get("template", "default"),
            vlm_model=inputs["vlm_model"],
            title=inputs["title"],
            pages_json=json.dumps(inputs["pages"], ensure_ascii=False),
            scenes_json=json.dumps(inputs["scenes"], ensure_ascii=False),
            page_images_json=json.dumps(inputs.get("page_images", []), ensure_ascii=False),
            layout_suggestion=inputs.get("layout_suggestion"),
        )
        self.db.add(story)
        self.db.commit()
        self.db.refresh(story)
        return {"id": story.id, "title": story.title, "artwork_id": story.artwork_id}

    def _get_stories_by_artwork(self, inputs: dict, _ctx: dict) -> dict:
        stories = self.db.query(Story).filter(Story.artwork_id == inputs["artwork_id"]).order_by(Story.created_at.desc()).all()
        return {"stories": [
            {"id": s.id, "title": s.title, "template": s.template, "vlm_model": s.vlm_model,
             "pages": json.loads(s.pages_json), "scenes": json.loads(s.scenes_json)}
            for s in stories
        ]}

    # ── 직접 호출 편의 메서드 ────────────────────────────────────

    def create_user_direct(self, username: str, hashed_password: str, role: str = "artist") -> dict:
        return self._create_user({"username": username, "hashed_password": hashed_password, "role": role}, {})

    def get_user_by_username_direct(self, username: str) -> dict:
        return self._get_user_by_username({"username": username}, {})

    def save_artwork_direct(self, title: str, image_path: str, owner_id: int, description: str = "") -> dict:
        return self._save_artwork({"title": title, "image_path": image_path, "owner_id": owner_id, "description": description}, {})

    def get_artworks_direct(self, owner_id: int | None = None, limit: int = 20) -> dict:
        inputs = {"limit": limit}
        if owner_id:
            inputs["owner_id"] = owner_id
        return self._get_artworks(inputs, {})

    def save_story_direct(self, artwork_id: int, vlm_model: str, title: str,
                          pages: list, scenes: list, template: str = "default",
                          page_images: list | None = None, layout_suggestion: str | None = None) -> dict:
        return self._save_story({
            "artwork_id": artwork_id, "vlm_model": vlm_model, "title": title,
            "pages": pages, "scenes": scenes, "template": template,
            "page_images": page_images or [], "layout_suggestion": layout_suggestion,
        }, {})
