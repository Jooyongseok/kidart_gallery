"""
kidart_gallery FastAPI 백엔드 — 4개 에이전트 오케스트레이터
실행: uvicorn main:app --reload --port 8200
"""
import os
import re
import json
import uuid
import logging
import shutil
import aiofiles
from pathlib import Path
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Header, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import settings
from database.connection import get_db, init_db
from agents.security_agent import SecurityAgent
from agents.db_agent import DBAgent
from agents.modeling_agent import ModelingAgent
from agents.design_agent import DesignAgent
from agents.character_agent import CharacterAgent

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── 앱 초기화 ──────────────────────────────────────────────────
app = FastAPI(title="KidArt Gallery API", version="2.0.0")

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 시작 시 보안 경고 ──────────────────────────────────────────
if settings.SECRET_KEY == "kidart-dev-secret-change-in-prod":
    logger.warning("⚠️  SECRET_KEY is using default value! Set SECRET_KEY env var for production.")

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
CHARACTER_DIR = Path(settings.CHARACTER_UPLOAD_DIR)
CHARACTER_DIR.mkdir(parents=True, exist_ok=True)
EXPERIMENT_DIR = Path(settings.EXPERIMENT_DIR)
EXPERIMENT_DIR.mkdir(parents=True, exist_ok=True)

# 업로드 정적 파일 서빙
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.on_event("startup")
def startup():
    init_db()
    logger.info("DB initialized.")


# ── 에이전트 인스턴스 (싱글톤) ──────────────────────────────────
_security = SecurityAgent()
_modeling = ModelingAgent()
_design = DesignAgent()
_character = CharacterAgent()


def get_security() -> SecurityAgent:
    return _security


def get_modeling() -> ModelingAgent:
    return _modeling


def get_design() -> DesignAgent:
    return _design


def get_character() -> CharacterAgent:
    return _character


# ── 토큰 추출 헬퍼 ────────────────────────────────────────────
def get_current_user(authorization: str = Header(None)) -> dict | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:]
    result = _security.validate_token_direct(token)
    return result if result.get("valid") else None


def require_auth(authorization: str = Header(None)) -> dict:
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="인증이 필요합니다.")
    return user


# ── Pydantic 스키마 ───────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str = "artist"


class LoginRequest(BaseModel):
    username: str
    password: str


class CreatePostRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    caption: str = Field(..., min_length=1, max_length=500)
    image_path: str | None = None
    color: str = "#8B5CF6"


class CreateCommentRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=300)


class SendDMRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)


class UpdateProfileRequest(BaseModel):
    bio: str | None = None
    avatar_emoji: str | None = None


# ── 인증 엔드포인트 ───────────────────────────────────────────

@app.post("/api/auth/register")
@limiter.limit("5/minute")
async def register(request: Request, req: RegisterRequest, db: Session = Depends(get_db)):
    """회원가입"""
    # 1. 입력 검증 (Security Agent)
    sanitized = _security._sanitize_input({"text": req.username, "max_length": 50}, {})
    if sanitized.get("truncated") or len(req.username) < 2:
        raise HTTPException(status_code=400, detail="유저명은 2~50자 사이여야 합니다.")

    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="비밀번호는 6자 이상이어야 합니다.")

    # 2. 비밀번호 해싱 (Security Agent)
    hashed = _security.hash_password_direct(req.password)

    # 3. DB 저장 (DB Agent)
    db_agent = DBAgent(db)
    result = db_agent.create_user_direct(
        username=sanitized["sanitized"],
        hashed_password=hashed,
        role=req.role,
    )
    if "error" in result:
        raise HTTPException(status_code=409, detail=result["error"])

    # 4. 토큰 발급
    token = _security.create_token_direct(result["id"], result["username"], result["role"])
    return {"user": result, **token}


@app.post("/api/auth/login")
@limiter.limit("5/minute")
async def login(request: Request, req: LoginRequest, db: Session = Depends(get_db)):
    """로그인"""
    db_agent = DBAgent(db)

    # 1. 유저 조회
    user = db_agent.get_user_by_username_direct(req.username)
    if "error" in user:
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")

    # 2. 비밀번호 검증 (Security Agent)
    if not _security.verify_password_direct(req.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")

    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="비활성화된 계정입니다.")

    # 3. 토큰 발급
    token = _security.create_token_direct(user["id"], user["username"], user["role"])
    return {"user": {"id": user["id"], "username": user["username"], "role": user["role"]}, **token}


# ── 작품 엔드포인트 ───────────────────────────────────────────

@app.post("/api/artworks")
async def upload_artwork(
    title: str = Form(...),
    description: str = Form(""),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    """작품 이미지 업로드 + 메타데이터 저장"""
    # 1. 파일 검증 (Security Agent)
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")

    # 2. 파일 저장
    ext = Path(image.filename or "upload.jpg").suffix or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    save_path = UPLOAD_DIR / filename

    async with aiofiles.open(save_path, "wb") as f:
        content = await image.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="파일 크기는 10MB 이하여야 합니다.")
        await f.write(content)

    # 3. DB 저장 (DB Agent)
    db_agent = DBAgent(db)
    sanitized_title = _security._sanitize_input({"text": title, "max_length": 200}, {})["sanitized"]
    result = db_agent.save_artwork_direct(
        title=sanitized_title,
        image_path=f"/uploads/{filename}",
        owner_id=current_user["user_id"],
        description=description,
    )
    return {"artwork": result, "image_url": f"/uploads/{filename}"}


@app.get("/api/artworks")
async def list_artworks(
    db: Session = Depends(get_db),
    current_user: dict | None = Depends(get_current_user),
):
    """작품 목록 조회"""
    db_agent = DBAgent(db)
    owner_id = current_user["user_id"] if current_user else None
    result = db_agent.get_artworks_direct(owner_id=owner_id, limit=20)
    return result


# ── 핵심: 동화 생성 엔드포인트 ─────────────────────────────────

@app.post("/api/generate-story")
@limiter.limit("3/minute")
async def generate_story(
    request: Request,
    image: UploadFile = File(...),
    template: str = Form("default"),
    model_key: str = Form("qwen"),
    custom_prompt: str = Form(""),
    art_style: str = Form(""),
    language: str = Form("ko"),
    artwork_id: int = Form(None),
    db: Session = Depends(get_db),
    current_user: dict | None = Depends(get_current_user),
):
    """
    그림 → 동화 생성 전체 파이프라인 (오케스트레이터)
    흐름:
      1. Security Agent: 입력 검증
      2. Modeling Agent: VLM 분석 + 스토리 생성 + 이미지 프롬프트
      3. Design Agent: 레이아웃/테마 제안
      4. DB Agent: 결과 저장 (로그인 시)
    """
    # ── 1. Security: 입력 검증 ──
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일만 허용됩니다.")

    if template not in ("default", "fantasy", "adventure", "nature", "custom"):
        raise HTTPException(status_code=400, detail="유효하지 않은 템플릿입니다.")

    if model_key not in ("qwen", "llama", "mistral"):
        raise HTTPException(status_code=400, detail="유효하지 않은 모델입니다.")

    # ── 이미지 읽기 + base64 인코딩 ──
    image_bytes = await image.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="파일 크기는 10MB 이하여야 합니다.")

    import base64
    image_b64 = base64.b64encode(image_bytes).decode()
    image_mime = image.content_type or "image/jpeg"

    # ── 2. Modeling Agent: 스토리 생성 ──
    prompt = _modeling.build_prompt(template, custom_prompt, art_style=art_style, language=language)

    logger.info("Calling VLM: model=%s template=%s", model_key, template)
    vlm_result = _modeling._call_vlm({
        "model_key": model_key,
        "prompt": prompt,
        "image_b64": image_b64,
        "image_mime": image_mime,
    }, {})

    if "error" in vlm_result:
        logger.error("VLM error: %s", vlm_result["error"])
        raise HTTPException(status_code=502, detail=f"VLM 호출 실패: {vlm_result['error']}")

    # ── 스토리 파싱 ──
    parsed = _modeling.parse_story_direct(vlm_result["text"])
    logger.info("Story parsed: title=%s pages=%d", parsed["title"], parsed["page_count"])

    # ── 삽화 URL 생성 (Pollinations.ai) ──
    page_images = []
    for i, scene in enumerate(parsed["scenes"]):
        if scene:
            url = _modeling.get_image_url(scene, page_idx=i)
            page_images.append(url)
        else:
            page_images.append(None)

    # ── 3. Design Agent: 레이아웃/테마 ──
    design_result = _design.get_layout_for_story(
        template=template,
        page_count=parsed["page_count"],
        has_images=any(page_images),
    )
    logger.info("Design layout generated: %s", design_result["layouts"])

    # ── 4. DB Agent: 저장 (로그인 시) ──
    story_id = None
    if current_user:
        db_agent = DBAgent(db)
        save_result = db_agent.save_story_with_user_direct(
            user_id=current_user["user_id"],
            vlm_model=model_key,
            title=parsed["title"],
            pages=parsed["pages"],
            scenes=[s or "" for s in parsed["scenes"]],
            template=template,
            page_images=[u or "" for u in page_images],
            layout_suggestion=str(design_result),
            artwork_id=artwork_id,
        )
        story_id = save_result.get("id")

    return {
        "story": {
            "title": parsed["title"],
            "pages": parsed["pages"],
            "scenes": parsed["scenes"],
            "page_images": page_images,
            "page_count": parsed["page_count"],
            "model": model_key,
            "template": template,
        },
        "design": design_result,
        "story_id": story_id,
    }


@app.get("/api/stories/{artwork_id}")
async def get_stories(
    artwork_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    """특정 작품의 저장된 스토리 목록"""
    db_agent = DBAgent(db)
    return db_agent._get_stories_by_artwork({"artwork_id": artwork_id}, {})


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


# ══════════════════════════════════════════════════════════════
# Character Endpoints
# ══════════════════════════════════════════════════════════════


@app.post("/api/characters/extract")
@limiter.limit("5/minute")
async def extract_character(
    request: Request,
    image: UploadFile = File(...),
    name: str = Form(""),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    """이미지에서 캐릭터 추출 + 분석 + 저장"""
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일만 허용됩니다.")

    image_bytes = await image.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="파일 크기는 10MB 이하여야 합니다.")

    # 1. 캐릭터 추출 (배경 제거)
    extract_result = _character.extract_character_direct(image_bytes)
    if "error" in extract_result:
        # 추출 실패 시 원본 이미지 사용
        import base64 as b64mod
        extracted_b64 = b64mod.b64encode(image_bytes).decode()
        thumbnail_b64 = None
        logger.warning("Character extraction failed, using original: %s", extract_result["error"])
    else:
        extracted_b64 = extract_result["extracted_b64"]
        thumbnail_b64 = extract_result.get("thumbnail_b64")

    # 2. 캐릭터 분석
    analysis_result = _character.analyze_character_direct(extracted_b64, "image/png")
    if "error" in analysis_result and "analysis" not in analysis_result:
        raise HTTPException(status_code=502, detail=f"캐릭터 분석 실패: {analysis_result['error']}")

    analysis = analysis_result.get("analysis", {})
    analysis_json = json.dumps(analysis, ensure_ascii=False)

    # 3. 일관성 프롬프트 생성
    prompt_result = _character.build_consistency_prompt_direct(analysis_json)
    if "error" in prompt_result:
        raise HTTPException(status_code=502, detail=f"프롬프트 생성 실패: {prompt_result['error']}")

    consistency_prompt = prompt_result["consistency_prompt"]

    # 4. 파일 저장
    file_result = _character.save_character_files(
        user_id=current_user["user_id"],
        extracted_b64=extracted_b64,
        thumbnail_b64=thumbnail_b64,
    )

    # 5. DB 저장
    char_name = name or analysis.get("name_suggestion", "캐릭터")
    style_tags = json.dumps(
        [analysis.get("art_style", "unknown")] + analysis.get("distinctive_features", []),
        ensure_ascii=False,
    )

    from database.models import Character as CharacterModel
    db_char = CharacterModel(
        user_id=current_user["user_id"],
        name=char_name,
        description_json=analysis_json,
        extracted_image_path=file_result["extracted_image_path"],
        thumbnail_path=file_result.get("thumbnail_path"),
        consistency_prompt=consistency_prompt,
        style_tags=style_tags,
    )
    db.add(db_char)
    db.commit()
    db.refresh(db_char)

    return {
        "character": {
            "id": db_char.id,
            "name": db_char.name,
            "description": analysis,
            "consistency_prompt": consistency_prompt,
            "extracted_image_path": db_char.extracted_image_path,
            "thumbnail_path": db_char.thumbnail_path,
            "style_tags": json.loads(style_tags),
        }
    }


@app.get("/api/characters")
async def list_characters(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    """내 캐릭터 목록"""
    from database.models import Character as CharacterModel
    chars = db.query(CharacterModel).filter(
        CharacterModel.user_id == current_user["user_id"]
    ).order_by(CharacterModel.created_at.desc()).all()

    return {
        "characters": [
            {
                "id": c.id,
                "name": c.name,
                "thumbnail_path": c.thumbnail_path,
                "extracted_image_path": c.extracted_image_path,
                "style_tags": json.loads(c.style_tags) if c.style_tags else [],
                "created_at": c.created_at.isoformat(),
            }
            for c in chars
        ]
    }


@app.get("/api/characters/{character_id}")
async def get_character(
    character_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    """캐릭터 상세 조회"""
    from database.models import Character as CharacterModel
    char = db.query(CharacterModel).filter(
        CharacterModel.id == character_id,
        CharacterModel.user_id == current_user["user_id"],
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="캐릭터를 찾을 수 없습니다.")

    return {
        "id": char.id,
        "name": char.name,
        "description": json.loads(char.description_json),
        "consistency_prompt": char.consistency_prompt,
        "extracted_image_path": char.extracted_image_path,
        "reference_sheet_path": char.reference_sheet_path,
        "thumbnail_path": char.thumbnail_path,
        "style_tags": json.loads(char.style_tags) if char.style_tags else [],
        "created_at": char.created_at.isoformat(),
    }


@app.delete("/api/characters/{character_id}")
async def delete_character(
    character_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    """캐릭터 삭제"""
    from database.models import Character as CharacterModel
    char = db.query(CharacterModel).filter(
        CharacterModel.id == character_id,
        CharacterModel.user_id == current_user["user_id"],
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="캐릭터를 찾을 수 없습니다.")

    # 파일 삭제
    for path_attr in [char.extracted_image_path, char.thumbnail_path, char.reference_sheet_path]:
        if path_attr:
            p = Path(path_attr)
            if p.exists():
                p.unlink()
            # 빈 디렉토리 정리
            if p.parent.exists() and not any(p.parent.iterdir()):
                p.parent.rmdir()

    db.delete(char)
    db.commit()
    return {"deleted": True, "id": character_id}


@app.post("/api/characters/{character_id}/compare")
@limiter.limit("3/minute")
async def compare_character_providers(
    request: Request,
    character_id: int,
    scene: str = Form("A cheerful scene in a sunny meadow with flowers"),
    providers: str = Form("replicate_ip_adapter,replicate_flux,dalle,pollinations"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    """동일 장면을 여러 provider로 생성하여 비교"""
    from database.models import Character as CharacterModel
    char = db.query(CharacterModel).filter(
        CharacterModel.id == character_id,
        CharacterModel.user_id == current_user["user_id"],
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="캐릭터를 찾을 수 없습니다.")

    # 캐릭터 참조 이미지 로드
    ref_b64 = None
    ref_path = Path(char.extracted_image_path)
    if ref_path.exists():
        import base64 as b64mod
        ref_b64 = b64mod.b64encode(ref_path.read_bytes()).decode()

    provider_list = [p.strip() for p in providers.split(",") if p.strip()]
    result = _character.compare_providers_direct(
        consistency_prompt=char.consistency_prompt,
        scene_description=scene,
        character_ref_b64=ref_b64,
        providers=provider_list,
    )
    return result


@app.post("/api/generate-story-with-character")
@limiter.limit("3/minute")
async def generate_story_with_character(
    request: Request,
    image: UploadFile = File(...),
    character_id: int = Form(...),
    template: str = Form("default"),
    model_key: str = Form("qwen"),
    custom_prompt: str = Form(""),
    art_style: str = Form(""),
    language: str = Form("ko"),
    provider: str = Form(""),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    """캐릭터 일관성이 보장된 동화 생성"""
    # 1. 캐릭터 조회
    from database.models import Character as CharacterModel, StoryCharacter
    char = db.query(CharacterModel).filter(
        CharacterModel.id == character_id,
        CharacterModel.user_id == current_user["user_id"],
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="캐릭터를 찾을 수 없습니다.")

    # 2. 입력 검증
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일만 허용됩니다.")
    if template not in ("default", "fantasy", "adventure", "nature", "custom"):
        raise HTTPException(status_code=400, detail="유효하지 않은 템플릿입니다.")

    image_bytes = await image.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="파일 크기는 10MB 이하여야 합니다.")

    import base64 as b64mod
    image_b64 = b64mod.b64encode(image_bytes).decode()
    image_mime = image.content_type or "image/jpeg"

    # 3. VLM 스토리 생성 (기존 ModelingAgent)
    prompt = _modeling.build_prompt(template, custom_prompt, art_style=art_style, language=language)
    vlm_result = _modeling._call_vlm({
        "model_key": model_key, "prompt": prompt,
        "image_b64": image_b64, "image_mime": image_mime,
    }, {})
    if "error" in vlm_result:
        raise HTTPException(status_code=502, detail=f"VLM 호출 실패: {vlm_result['error']}")

    parsed = _modeling.parse_story_direct(vlm_result["text"])

    # 4. 캐릭터 일관성 삽화 생성 (CharacterAgent)
    ref_b64 = None
    ref_path = Path(char.extracted_image_path)
    if ref_path.exists():
        ref_b64 = b64mod.b64encode(ref_path.read_bytes()).decode()

    gen_provider = provider or settings.IMAGE_GENERATION_PROVIDER
    image_results = _character.generate_story_images_direct(
        consistency_prompt=char.consistency_prompt,
        scenes=parsed["scenes"],
        character_ref_b64=ref_b64,
        provider=gen_provider,
    )
    page_images = [r.get("image_url") for r in image_results]

    # 5. Design Agent
    design_result = _design.get_layout_for_story(
        template=template, page_count=parsed["page_count"],
        has_images=any(page_images),
    )

    # 6. DB 저장
    db_agent = DBAgent(db)
    save_result = db_agent.save_story_with_user_direct(
        user_id=current_user["user_id"],
        vlm_model=model_key,
        title=parsed["title"],
        pages=parsed["pages"],
        scenes=[s or "" for s in parsed["scenes"]],
        template=template,
        page_images=[u or "" for u in page_images],
        layout_suggestion=str(design_result),
    )
    story_id = save_result.get("id")

    # 7. StoryCharacter 연결
    if story_id:
        sc = StoryCharacter(story_id=story_id, character_id=character_id)
        db.add(sc)
        db.commit()

    return {
        "story": {
            "title": parsed["title"],
            "pages": parsed["pages"],
            "scenes": parsed["scenes"],
            "page_images": page_images,
            "page_count": parsed["page_count"],
            "model": model_key,
            "template": template,
        },
        "character": {"id": char.id, "name": char.name},
        "design": design_result,
        "story_id": story_id,
        "provider": gen_provider,
    }


# ══════════════════════════════════════════════════════════════
# Experiment / Lab Endpoints — Provider 비교 실험
# ══════════════════════════════════════════════════════════════


@app.get("/api/providers")
async def list_providers():
    """사용 가능한 이미지 생성 provider 목록 + API 키 설정 상태"""
    from agents.character_agent import CharacterAgent
    providers = {}
    for key, info in CharacterAgent.PROVIDERS.items():
        available = True
        if key in ("flux2_fal", "flux_kontext", "nano_banana_fal"):
            available = bool(settings.FAL_KEY)
        elif key == "ideogram3":
            available = bool(settings.IDEOGRAM_API_KEY)
        elif key in ("gpt_image2",):
            available = bool(settings.OPENAI_API_KEY)
        elif key in ("replicate_ip_adapter", "replicate_flux"):
            available = bool(settings.REPLICATE_API_TOKEN)
        # pollinations is always available

        providers[key] = {**info, "available": available, "key": key}
    return {"providers": providers, "default": settings.IMAGE_GENERATION_PROVIDER}


@app.post("/api/experiment/single")
@limiter.limit("10/minute")
async def experiment_single(
    request: Request,
    image: UploadFile = File(None),
    character_id: int = Form(None),
    scene: str = Form("A cheerful scene in a sunny meadow with flowers, cute storybook illustration"),
    provider: str = Form("flux2_fal"),
    seed: int = Form(42),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    """단일 provider로 이미지 1장 생성 실험"""
    import base64 as b64mod
    from database.models import Character as CharacterModel

    ref_b64 = None
    consistency_prompt = scene  # default: scene만 사용

    # 캐릭터 참조 로드
    if character_id:
        char = db.query(CharacterModel).filter(
            CharacterModel.id == character_id,
            CharacterModel.user_id == current_user["user_id"],
        ).first()
        if char:
            consistency_prompt = char.consistency_prompt
            ref_path = Path(char.extracted_image_path)
            if ref_path.exists():
                ref_b64 = b64mod.b64encode(ref_path.read_bytes()).decode()
    elif image:
        image_bytes = await image.read()
        ref_b64 = b64mod.b64encode(image_bytes).decode()

    result = _character.generate_consistent_image_direct(
        consistency_prompt=consistency_prompt,
        scene_description=scene,
        character_ref_b64=ref_b64,
        provider=provider,
        seed=seed,
    )
    return {"result": result, "provider": provider, "scene": scene}


@app.post("/api/experiment/compare")
@limiter.limit("3/minute")
async def experiment_compare(
    request: Request,
    image: UploadFile = File(None),
    character_id: int = Form(None),
    scene: str = Form("A cheerful scene in a sunny meadow with flowers, cute storybook illustration"),
    providers: str = Form(""),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    """여러 provider 동시 비교 실험"""
    import base64 as b64mod
    from database.models import Character as CharacterModel

    ref_b64 = None
    consistency_prompt = scene

    if character_id:
        char = db.query(CharacterModel).filter(
            CharacterModel.id == character_id,
            CharacterModel.user_id == current_user["user_id"],
        ).first()
        if char:
            consistency_prompt = char.consistency_prompt
            ref_path = Path(char.extracted_image_path)
            if ref_path.exists():
                ref_b64 = b64mod.b64encode(ref_path.read_bytes()).decode()
    elif image:
        image_bytes = await image.read()
        ref_b64 = b64mod.b64encode(image_bytes).decode()

    provider_list = [p.strip() for p in providers.split(",") if p.strip()] if providers else None

    result = _character.compare_providers_direct(
        consistency_prompt=consistency_prompt,
        scene_description=scene,
        character_ref_b64=ref_b64,
        providers=provider_list,
    )
    return result


@app.post("/api/experiment/extract")
@limiter.limit("5/minute")
async def experiment_extract(
    request: Request,
    image: UploadFile = File(...),
    method: str = Form("auto"),
    current_user: dict = Depends(require_auth),
):
    """배경 제거 실험 (rembg vs BiRefNet)"""
    image_bytes = await image.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="10MB 이하")

    if method == "birefnet":
        result = _character.extract_character_birefnet_direct(image_bytes)
    elif method == "rembg":
        result = _character.extract_character_direct(image_bytes)
    else:  # auto: birefnet 우선, fallback rembg
        result = _character.extract_character_birefnet_direct(image_bytes)

    if "error" in result:
        raise HTTPException(status_code=502, detail=result["error"])

    return {
        "method": result.get("method", "rembg"),
        "width": result.get("width"),
        "height": result.get("height"),
        "thumbnail_b64": result.get("thumbnail_b64", "")[:100] + "...",
        "extracted_preview": f"data:image/png;base64,{result['extracted_b64'][:200]}...",
        "full_b64_length": len(result.get("extracted_b64", "")),
    }


# ══════════════════════════════════════════════════════════════
# SNS Endpoints
# ══════════════════════════════════════════════════════════════

# --- Posts ---

@app.post("/api/posts")
@limiter.limit("30/minute")
async def create_post(
    request: Request,
    req: CreatePostRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    db_agent = DBAgent(db)
    sanitized_title = _security._sanitize_input({"text": req.title, "max_length": 100}, {})["sanitized"]
    sanitized_caption = _security._sanitize_input({"text": req.caption, "max_length": 500}, {})["sanitized"]
    result = db_agent.create_post_direct(
        user_id=current_user["user_id"],
        title=sanitized_title,
        caption=sanitized_caption,
        image_path=req.image_path,
        color=req.color,
    )
    return result


@app.get("/api/posts")
async def list_posts(
    limit: int = 30,
    offset: int = 0,
    user_id: int | None = None,
    db: Session = Depends(get_db),
):
    db_agent = DBAgent(db)
    return db_agent.get_posts_direct(limit=limit, offset=offset, user_id=user_id)


@app.delete("/api/posts/{post_id}")
async def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    db_agent = DBAgent(db)
    result = db_agent.delete_post_direct(post_id, current_user["user_id"])
    if "error" in result:
        raise HTTPException(status_code=403, detail=result["error"])
    return result


# --- Comments ---

@app.post("/api/posts/{post_id}/comments")
async def create_comment(
    post_id: int,
    req: CreateCommentRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    db_agent = DBAgent(db)
    sanitized = _security._sanitize_input({"text": req.text, "max_length": 300}, {})["sanitized"]
    result = db_agent.create_comment_direct(post_id, current_user["user_id"], sanitized)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@app.get("/api/posts/{post_id}/comments")
async def list_comments(post_id: int, db: Session = Depends(get_db)):
    db_agent = DBAgent(db)
    return db_agent.get_comments_direct(post_id)


# --- Likes ---

@app.post("/api/posts/{post_id}/like")
async def toggle_like(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    db_agent = DBAgent(db)
    result = db_agent.toggle_like_direct(post_id, current_user["user_id"])
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    # Notify post owner
    if result.get("liked"):
        from database.models import Post as PostModel
        post = db.query(PostModel).filter(PostModel.id == post_id).first()
        if post and post.user_id != current_user["user_id"]:
            await notify_user(post.user_id, {"type": "like", "post_id": post_id, "by": current_user["username"]})
    return result


# --- Direct Messages ---

@app.get("/api/dm/conversations")
async def dm_conversations(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    db_agent = DBAgent(db)
    return db_agent.get_dm_conversations_direct(current_user["user_id"])


@app.get("/api/dm/{user_id}")
async def dm_messages(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    db_agent = DBAgent(db)
    db_agent.mark_dm_read_direct(current_user["user_id"], user_id)
    return db_agent.get_dm_messages_direct(current_user["user_id"], user_id)


@app.post("/api/dm/{user_id}")
async def send_dm(
    user_id: int,
    req: SendDMRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    db_agent = DBAgent(db)
    sanitized = _security._sanitize_input({"text": req.text, "max_length": 500}, {})["sanitized"]
    result = db_agent.send_dm_direct(current_user["user_id"], user_id, sanitized)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    await notify_user(user_id, {"type": "dm", "from": current_user["username"], "preview": sanitized[:50]})
    return result


@app.put("/api/dm/{user_id}/read")
async def mark_dm_read(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    db_agent = DBAgent(db)
    return db_agent.mark_dm_read_direct(current_user["user_id"], user_id)


# --- User Profile ---

@app.get("/api/users/me")
async def get_my_profile(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    db_agent = DBAgent(db)
    return db_agent.get_user_profile_direct(current_user["user_id"])


@app.put("/api/users/me")
async def update_my_profile(
    req: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    db_agent = DBAgent(db)
    return db_agent.update_user_profile_direct(
        current_user["user_id"],
        bio=req.bio,
        avatar_emoji=req.avatar_emoji,
    )


@app.get("/api/users")
async def list_users(db: Session = Depends(get_db)):
    db_agent = DBAgent(db)
    return db_agent.get_all_users_direct()


@app.post("/api/users/{user_id}/follow")
async def toggle_follow(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    db_agent = DBAgent(db)
    result = db_agent.toggle_follow_direct(current_user["user_id"], user_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.get("/api/users/{user_id}/followers")
async def get_followers(user_id: int, db: Session = Depends(get_db)):
    db_agent = DBAgent(db)
    return db_agent.get_followers_direct(user_id)


@app.get("/api/users/{user_id}/following")
async def get_following(user_id: int, db: Session = Depends(get_db)):
    db_agent = DBAgent(db)
    return db_agent.get_following_direct(user_id)


@app.get("/api/feed/following")
async def following_feed(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    db_agent = DBAgent(db)
    return db_agent.get_following_posts_direct(current_user["user_id"])


@app.get("/api/users/{user_id}/is-following")
async def check_following(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    db_agent = DBAgent(db)
    return db_agent.is_following_direct(current_user["user_id"], user_id)


@app.get("/api/users/{user_id}")
async def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    db_agent = DBAgent(db)
    result = db_agent.get_user_profile_direct(user_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# --- Posts with Image ---

@app.post("/api/posts/with-image")
@limiter.limit("30/minute")
async def create_post_with_image(
    request: Request,
    title: str = Form(...),
    caption: str = Form(...),
    color: str = Form("#8B5CF6"),
    image: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    """이미지 포함 게시물 작성"""
    image_path = None
    if image and image.content_type and image.content_type.startswith("image/"):
        ext = Path(image.filename or "upload.jpg").suffix or ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        save_path = UPLOAD_DIR / filename
        content = await image.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="파일 크기는 10MB 이하여야 합니다.")
        async with aiofiles.open(save_path, "wb") as f:
            await f.write(content)
        image_path = f"/uploads/{filename}"

    db_agent = DBAgent(db)
    sanitized_title = _security._sanitize_input({"text": title, "max_length": 100}, {})["sanitized"]
    sanitized_caption = _security._sanitize_input({"text": caption, "max_length": 500}, {})["sanitized"]
    result = db_agent.create_post_direct(
        user_id=current_user["user_id"],
        title=sanitized_title,
        caption=sanitized_caption,
        image_path=image_path,
        color=color,
    )
    return result


# --- Stories ---

@app.get("/api/stories/my")
async def get_my_stories(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    """내가 생성한 스토리 목록"""
    db_agent = DBAgent(db)
    return db_agent.get_user_stories_direct(current_user["user_id"])


@app.get("/api/stories/view/{story_id}")
async def get_story_view(story_id: int, db: Session = Depends(get_db)):
    """스토리 상세 조회 (공유 링크용)"""
    db_agent = DBAgent(db)
    result = db_agent.get_story_by_id_direct(story_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@app.put("/api/stories/{story_id}")
async def update_story(
    story_id: int,
    pages: list[str] | None = None,
    scenes: list[str] | None = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    """스토리 텍스트 수정"""
    db_agent = DBAgent(db)
    result = db_agent.update_story_direct(story_id, pages=pages, scenes=scenes)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# --- WebSocket Real-time Notifications ---

_ws_connections: dict[int, WebSocket] = {}

async def notify_user(user_id: int, event: dict):
    ws = _ws_connections.get(user_id)
    if ws:
        try:
            import json
            await ws.send_text(json.dumps(event))
        except Exception:
            _ws_connections.pop(user_id, None)

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    # Validate token from query param
    token = websocket.query_params.get("token", "")
    if token:
        result = _security.validate_token_direct(token)
        if not result.get("valid") or result.get("user_id") != user_id:
            await websocket.close(code=4001)
            return

    await websocket.accept()
    _ws_connections[user_id] = websocket
    try:
        while True:
            await websocket.receive_text()  # Keep alive
    except WebSocketDisconnect:
        _ws_connections.pop(user_id, None)


# --- Search ---

@app.get("/api/search")
async def search(q: str = "", db: Session = Depends(get_db)):
    """포스트/유저 검색"""
    if not q or len(q) < 1:
        return {"posts": [], "users": []}
    db_agent = DBAgent(db)
    from database.models import Post as PostModel, User as UserModel
    posts = db.query(PostModel).filter(
        PostModel.title.ilike(f"%{q}%") | PostModel.caption.ilike(f"%{q}%")
    ).limit(20).all()
    users = db.query(UserModel).filter(
        UserModel.username.ilike(f"%{q}%")
    ).filter(UserModel.is_active == True).limit(10).all()
    return {
        "posts": [{"id": p.id, "title": p.title, "caption": p.caption[:100],
                    "user_name": p.user.username, "image_path": p.image_path}
                   for p in posts],
        "users": [{"id": u.id, "username": u.username, "avatar_emoji": u.avatar_emoji}
                   for u in users],
    }


# --- Seed Data ---

@app.post("/api/seed")
async def seed_data(db: Session = Depends(get_db)):
    """샘플 작가/게시물 데이터를 DB에 시딩합니다."""
    db_agent = DBAgent(db)
    sample_artists = [
        {"name": "김하늘", "emoji": "🎨", "bio": "색감이 뛰어난 꼬마 화가"},
        {"name": "이서준", "emoji": "🖌️", "bio": "공룡과 로봇을 좋아하는 아이"},
        {"name": "박소율", "emoji": "✏️", "bio": "동물과 자연을 사랑하는 아이"},
        {"name": "최도현", "emoji": "🎭", "bio": "만화와 캐릭터 디자인 좋아하는 아이"},
        {"name": "정예은", "emoji": "🌈", "bio": "파스텔 톤 그림을 그리는 아이"},
        {"name": "한지우", "emoji": "🖍️", "bio": "독특한 패턴과 추상화를 그리는 아이"},
        {"name": "양선우", "emoji": "🌟", "bio": "상상력이 풍부한 꿈꾸는 아이"},
    ]
    created_users = []
    for artist in sample_artists:
        existing = db_agent.get_user_by_username_direct(artist["name"])
        if "error" not in existing:
            created_users.append(existing)
            continue
        hashed = _security.hash_password_direct("1234")
        user = db_agent.create_user_direct(artist["name"], hashed, "artist")
        if "error" not in user:
            db_agent.update_user_profile_direct(user["id"], bio=artist["bio"], avatar_emoji=artist["emoji"])
            created_users.append(user)

    sample_posts = [
        {"artist": "김하늘", "title": "무지개 나라", "caption": "오늘 완성한 그림이에요! 어떤가요? ^^", "color": "#7c5cfc", "image": "public/artworks/rainbow_land.png"},
        {"artist": "김하늘", "title": "바다 속 친구들", "caption": "열심히 그렸어요~ 좋아요 눌러주세요!", "color": "#38bdf8", "image": "public/artworks/ocean_friends.png"},
        {"artist": "이서준", "title": "로봇 왕국", "caption": "로봇 친구들과 함께!", "color": "#f472b6", "image": "public/artworks/robot_kingdom.png"},
        {"artist": "이서준", "title": "공룡 대모험", "caption": "공룡이랑 모험 떠나자!", "color": "#fb923c", "image": "public/artworks/dino_adventure.png"},
        {"artist": "박소율", "title": "고양이 가족", "caption": "귀여운 고양이 가족이에요~", "color": "#f9a8d4", "image": "public/artworks/cat_family.png"},
        {"artist": "박소율", "title": "마법의 숲", "caption": "요정들이 사는 숲을 그렸어요", "color": "#6ee7b7", "image": "public/artworks/magic_forest.png"},
        {"artist": "최도현", "title": "슈퍼히어로", "caption": "나만의 히어로 캐릭터!", "color": "#ef4444", "image": "public/artworks/superhero.png"},
        {"artist": "정예은", "title": "구름 나라", "caption": "구름 위 마을을 상상해봤어요", "color": "#c4b5fd", "image": "public/artworks/cloud_village.png"},
        {"artist": "한지우", "title": "소용돌이", "caption": "색이 소용돌이치는 그림!", "color": "#a855f7", "image": "public/artworks/swirl_abstract.png"},
        {"artist": "양선우", "title": "은하수 고래", "caption": "우주를 헤엄치는 고래를 그렸어요!", "color": "#6366F1", "image": "public/artworks/sunwoo_galaxy_whale.png"},
        {"artist": "양선우", "title": "꿈꾸는 나무", "caption": "마법의 나무에는 문과 창문이 있어요", "color": "#10B981", "image": "public/artworks/sunwoo_dream_tree.png"},
        {"artist": "양선우", "title": "사탕 집", "caption": "달콤한 사탕으로 만든 집!", "color": "#F472B6", "image": "public/artworks/sunwoo_candy_house.png"},
        {"artist": "양선우", "title": "구름 기차", "caption": "구름 위를 달리는 기차에요~", "color": "#38BDF8", "image": "public/artworks/sunwoo_train_clouds.png"},
        {"artist": "양선우", "title": "공룡 학교", "caption": "공룡들도 학교에 다닐까?", "color": "#FB923C", "image": "public/artworks/sunwoo_dino_school.png"},
        {"artist": "양선우", "title": "오로라의 밤", "caption": "북극에서 본 오로라가 너무 예뻤어요!", "color": "#34D399", "image": "public/artworks/sunwoo_aurora.png"},
    ]
    post_count = 0
    for sp in sample_posts:
        user = next((u for u in created_users if u["username"] == sp["artist"]), None)
        if not user:
            continue
        db_agent.create_post_direct(
            user_id=user["id"], title=sp["title"], caption=sp["caption"],
            image_path=sp.get("image"), color=sp["color"],
        )
        post_count += 1

    return {"seeded_users": len(created_users), "seeded_posts": post_count}
