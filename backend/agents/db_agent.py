"""
DB Agent — 작품/스토리/유저 데이터 CRUD 전담
"""
import json
from sqlalchemy.orm import Session
from database.models import User, Artwork, Story, Post, Comment, Like, DirectMessage, Follow
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

    # ── SNS 직접 호출 메서드 ──────────────────────────────────────

    # --- Posts ---
    def create_post_direct(self, user_id: int, title: str, caption: str,
                           image_path: str | None = None, color: str = "#8B5CF6") -> dict:
        post = Post(user_id=user_id, title=title, caption=caption,
                    image_path=image_path, color=color)
        self.db.add(post)
        self.db.commit()
        self.db.refresh(post)
        return {"id": post.id, "title": post.title}

    def get_posts_direct(self, limit: int = 30, offset: int = 0, user_id: int | None = None) -> dict:
        from sqlalchemy.orm import joinedload
        query = self.db.query(Post).options(
            joinedload(Post.user),
            joinedload(Post.likes).joinedload(Like.user),
            joinedload(Post.comments).joinedload(Comment.user),
        )
        if user_id:
            query = query.filter(Post.user_id == user_id)
        posts = query.order_by(Post.created_at.desc()).offset(offset).limit(limit).all()
        result = []
        for p in posts:
            sorted_comments = sorted(p.comments, key=lambda c: c.created_at)
            result.append({
                "id": p.id,
                "user_id": p.user_id,
                "user_name": p.user.username,
                "user_emoji": p.user.avatar_emoji,
                "title": p.title,
                "caption": p.caption,
                "image_path": p.image_path,
                "color": p.color,
                "created_at": p.created_at.isoformat(),
                "likes": [{"user_id": l.user_id, "user_name": l.user.username} for l in p.likes],
                "like_count": len(p.likes),
                "comments": [
                    {"id": c.id, "user_id": c.user_id, "user_name": c.user.username,
                     "user_emoji": c.user.avatar_emoji, "text": c.text,
                     "created_at": c.created_at.isoformat()}
                    for c in sorted_comments[-5:]
                ],
                "comment_count": len(p.comments),
            })
        return {"posts": result}

    def delete_post_direct(self, post_id: int, user_id: int) -> dict:
        post = self.db.query(Post).filter(Post.id == post_id).first()
        if not post:
            return {"error": "post not found"}
        if post.user_id != user_id:
            return {"error": "not authorized"}
        self.db.delete(post)
        self.db.commit()
        return {"deleted": True}

    # --- Comments ---
    def create_comment_direct(self, post_id: int, user_id: int, text: str) -> dict:
        post = self.db.query(Post).filter(Post.id == post_id).first()
        if not post:
            return {"error": "post not found"}
        comment = Comment(post_id=post_id, user_id=user_id, text=text)
        self.db.add(comment)
        self.db.commit()
        self.db.refresh(comment)
        return {"id": comment.id, "text": comment.text, "user_name": comment.user.username}

    def get_comments_direct(self, post_id: int) -> dict:
        comments = (self.db.query(Comment).filter(Comment.post_id == post_id)
                    .order_by(Comment.created_at.asc()).all())
        return {"comments": [
            {"id": c.id, "user_id": c.user_id, "user_name": c.user.username,
             "user_emoji": c.user.avatar_emoji, "text": c.text,
             "created_at": c.created_at.isoformat()}
            for c in comments
        ]}

    # --- Likes ---
    def toggle_like_direct(self, post_id: int, user_id: int) -> dict:
        post = self.db.query(Post).filter(Post.id == post_id).first()
        if not post:
            return {"error": "post not found"}
        existing = (self.db.query(Like)
                    .filter(Like.post_id == post_id, Like.user_id == user_id).first())
        if existing:
            self.db.delete(existing)
            self.db.commit()
            liked = False
        else:
            self.db.add(Like(post_id=post_id, user_id=user_id))
            self.db.commit()
            liked = True
        count = self.db.query(Like).filter(Like.post_id == post_id).count()
        return {"liked": liked, "like_count": count}

    # --- DMs ---
    def send_dm_direct(self, sender_id: int, receiver_id: int, text: str) -> dict:
        if sender_id == receiver_id:
            return {"error": "cannot message yourself"}
        receiver = self.db.query(User).filter(User.id == receiver_id).first()
        if not receiver:
            return {"error": "receiver not found"}
        dm = DirectMessage(sender_id=sender_id, receiver_id=receiver_id, text=text)
        self.db.add(dm)
        self.db.commit()
        self.db.refresh(dm)
        return {"id": dm.id, "text": dm.text}

    def get_dm_conversations_direct(self, user_id: int) -> dict:
        from sqlalchemy import or_, func, case
        dms = (self.db.query(DirectMessage)
               .filter(or_(DirectMessage.sender_id == user_id,
                           DirectMessage.receiver_id == user_id))
               .order_by(DirectMessage.created_at.desc()).all())
        convos = {}
        for dm in dms:
            other_id = dm.receiver_id if dm.sender_id == user_id else dm.sender_id
            if other_id not in convos:
                other = self.db.query(User).filter(User.id == other_id).first()
                unread = (self.db.query(DirectMessage)
                          .filter(DirectMessage.sender_id == other_id,
                                  DirectMessage.receiver_id == user_id,
                                  DirectMessage.is_read == False).count())
                convos[other_id] = {
                    "user_id": other_id,
                    "user_name": other.username if other else "Unknown",
                    "user_emoji": other.avatar_emoji if other else "🎨",
                    "last_message": dm.text[:50],
                    "last_at": dm.created_at.isoformat(),
                    "unread": unread,
                }
        return {"conversations": sorted(convos.values(), key=lambda c: c["last_at"], reverse=True)}

    def get_dm_messages_direct(self, user_id: int, other_user_id: int) -> dict:
        from sqlalchemy import or_, and_
        msgs = (self.db.query(DirectMessage)
                .filter(or_(
                    and_(DirectMessage.sender_id == user_id, DirectMessage.receiver_id == other_user_id),
                    and_(DirectMessage.sender_id == other_user_id, DirectMessage.receiver_id == user_id),
                ))
                .order_by(DirectMessage.created_at.asc()).all())
        return {"messages": [
            {"id": m.id, "sender_id": m.sender_id, "receiver_id": m.receiver_id,
             "text": m.text, "is_read": m.is_read, "created_at": m.created_at.isoformat()}
            for m in msgs
        ]}

    def mark_dm_read_direct(self, user_id: int, sender_id: int) -> dict:
        (self.db.query(DirectMessage)
         .filter(DirectMessage.sender_id == sender_id,
                 DirectMessage.receiver_id == user_id,
                 DirectMessage.is_read == False)
         .update({"is_read": True}))
        self.db.commit()
        return {"marked": True}

    # --- User Profile ---
    def get_user_profile_direct(self, user_id: int) -> dict:
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "user not found"}
        post_count = self.db.query(Post).filter(Post.user_id == user_id).count()
        like_count = (self.db.query(Like).join(Post)
                      .filter(Post.user_id == user_id).count())
        return {
            "id": user.id, "username": user.username, "role": user.role,
            "bio": user.bio, "avatar_emoji": user.avatar_emoji,
            "post_count": post_count, "like_count": like_count,
            "created_at": user.created_at.isoformat(),
        }

    def update_user_profile_direct(self, user_id: int, bio: str | None = None,
                                    avatar_emoji: str | None = None) -> dict:
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "user not found"}
        if bio is not None:
            user.bio = bio
        if avatar_emoji is not None:
            user.avatar_emoji = avatar_emoji
        self.db.commit()
        self.db.refresh(user)
        return {"id": user.id, "username": user.username, "bio": user.bio,
                "avatar_emoji": user.avatar_emoji}

    def get_all_users_direct(self, limit: int = 50) -> dict:
        users = self.db.query(User).filter(User.is_active == True).limit(limit).all()
        return {"users": [
            {"id": u.id, "username": u.username, "avatar_emoji": u.avatar_emoji, "bio": u.bio}
            for u in users
        ]}

    # --- Follow ---
    def toggle_follow_direct(self, follower_id: int, following_id: int) -> dict:
        if follower_id == following_id:
            return {"error": "cannot follow yourself"}
        target = self.db.query(User).filter(User.id == following_id).first()
        if not target:
            return {"error": "user not found"}
        existing = (self.db.query(Follow)
                    .filter(Follow.follower_id == follower_id, Follow.following_id == following_id).first())
        if existing:
            self.db.delete(existing)
            self.db.commit()
            following = False
        else:
            self.db.add(Follow(follower_id=follower_id, following_id=following_id))
            self.db.commit()
            following = True
        follower_count = self.db.query(Follow).filter(Follow.following_id == following_id).count()
        following_count = self.db.query(Follow).filter(Follow.follower_id == follower_id).count()
        return {"following": following, "follower_count": follower_count, "following_count": following_count}

    def get_followers_direct(self, user_id: int) -> dict:
        follows = self.db.query(Follow).filter(Follow.following_id == user_id).all()
        return {"followers": [
            {"id": f.follower.id, "username": f.follower.username, "avatar_emoji": f.follower.avatar_emoji}
            for f in follows
        ]}

    def get_following_direct(self, user_id: int) -> dict:
        follows = self.db.query(Follow).filter(Follow.follower_id == user_id).all()
        return {"following": [
            {"id": f.following.id, "username": f.following.username, "avatar_emoji": f.following.avatar_emoji}
            for f in follows
        ]}

    def is_following_direct(self, follower_id: int, following_id: int) -> dict:
        exists = (self.db.query(Follow)
                  .filter(Follow.follower_id == follower_id, Follow.following_id == following_id).first())
        return {"is_following": exists is not None}

    # --- Stories ---
    def save_story_with_user_direct(self, user_id: int, vlm_model: str, title: str,
                                     pages: list, scenes: list, template: str = "default",
                                     page_images: list | None = None, layout_suggestion: str | None = None,
                                     artwork_id: int | None = None) -> dict:
        story = Story(
            artwork_id=artwork_id,
            user_id=user_id,
            template=template,
            vlm_model=vlm_model,
            title=title,
            pages_json=json.dumps(pages, ensure_ascii=False),
            scenes_json=json.dumps(scenes, ensure_ascii=False),
            page_images_json=json.dumps(page_images or [], ensure_ascii=False),
            layout_suggestion=layout_suggestion,
        )
        self.db.add(story)
        self.db.commit()
        self.db.refresh(story)
        return {"id": story.id, "title": story.title}

    def get_user_stories_direct(self, user_id: int, limit: int = 20) -> dict:
        stories = (self.db.query(Story)
                   .filter(Story.user_id == user_id)
                   .order_by(Story.created_at.desc()).limit(limit).all())
        return {"stories": [
            {"id": s.id, "title": s.title, "template": s.template, "vlm_model": s.vlm_model,
             "pages": json.loads(s.pages_json), "scenes": json.loads(s.scenes_json),
             "page_images": json.loads(s.page_images_json) if s.page_images_json else [],
             "created_at": s.created_at.isoformat()}
            for s in stories
        ]}

    def get_story_by_id_direct(self, story_id: int) -> dict:
        s = self.db.query(Story).filter(Story.id == story_id).first()
        if not s:
            return {"error": "story not found"}
        return {
            "id": s.id, "title": s.title, "template": s.template, "vlm_model": s.vlm_model,
            "pages": json.loads(s.pages_json), "scenes": json.loads(s.scenes_json),
            "page_images": json.loads(s.page_images_json) if s.page_images_json else [],
            "layout_suggestion": s.layout_suggestion,
            "created_at": s.created_at.isoformat(),
        }

    def update_story_direct(self, story_id: int, pages: list | None = None,
                            scenes: list | None = None) -> dict:
        s = self.db.query(Story).filter(Story.id == story_id).first()
        if not s:
            return {"error": "story not found"}
        if pages is not None:
            s.pages_json = json.dumps(pages, ensure_ascii=False)
        if scenes is not None:
            s.scenes_json = json.dumps(scenes, ensure_ascii=False)
        self.db.commit()
        self.db.refresh(s)
        return {"id": s.id, "title": s.title}

    def get_following_posts_direct(self, user_id: int, limit: int = 30) -> dict:
        following_ids = [f.following_id for f in
                         self.db.query(Follow).filter(Follow.follower_id == user_id).all()]
        if not following_ids:
            return {"posts": []}
        from sqlalchemy import or_
        query = self.db.query(Post).filter(Post.user_id.in_(following_ids))
        posts = query.order_by(Post.created_at.desc()).limit(limit).all()
        result = []
        for p in posts:
            likes = self.db.query(Like).filter(Like.post_id == p.id).all()
            comments = self.db.query(Comment).filter(Comment.post_id == p.id).order_by(Comment.created_at.asc()).all()
            result.append({
                "id": p.id, "user_id": p.user_id, "user_name": p.user.username,
                "user_emoji": p.user.avatar_emoji, "title": p.title, "caption": p.caption,
                "image_path": p.image_path, "color": p.color,
                "created_at": p.created_at.isoformat(),
                "likes": [{"user_id": l.user_id, "user_name": l.user.username} for l in likes],
                "like_count": len(likes),
                "comments": [
                    {"id": c.id, "user_id": c.user_id, "user_name": c.user.username,
                     "user_emoji": c.user.avatar_emoji, "text": c.text,
                     "created_at": c.created_at.isoformat()}
                    for c in comments[-5:]
                ],
                "comment_count": len(comments),
            })
        return {"posts": result}
