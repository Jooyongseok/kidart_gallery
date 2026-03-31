"""
kidart_gallery FastAPI 백엔드 — 4개 에이전트 오케스트레이터
실행: uvicorn main:app --reload --port 8200
"""
import os
import uuid
import logging
import shutil
import aiofiles
from pathlib import Path
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.connection import get_db, init_db
from agents.security_agent import SecurityAgent
from agents.db_agent import DBAgent
from agents.modeling_agent import ModelingAgent
from agents.design_agent import DesignAgent

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── 앱 초기화 ──────────────────────────────────────────────────
app = FastAPI(title="KidArt Gallery API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:3000", "http://localhost:8200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

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


def get_security() -> SecurityAgent:
    return _security


def get_modeling() -> ModelingAgent:
    return _modeling


def get_design() -> DesignAgent:
    return _design


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


# ── 인증 엔드포인트 ───────────────────────────────────────────

@app.post("/api/auth/register")
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
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
async def login(req: LoginRequest, db: Session = Depends(get_db)):
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
async def generate_story(
    image: UploadFile = File(...),
    template: str = Form("default"),
    model_key: str = Form("qwen"),
    custom_prompt: str = Form(""),
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
    prompt = _modeling.build_prompt(template, custom_prompt)

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

    # ── 4. DB Agent: 저장 (로그인 시 + artwork_id 있을 때) ──
    story_id = None
    if current_user and artwork_id:
        db_agent = DBAgent(db)
        save_result = db_agent.save_story_direct(
            artwork_id=artwork_id,
            vlm_model=model_key,
            title=parsed["title"],
            pages=parsed["pages"],
            scenes=[s or "" for s in parsed["scenes"]],
            template=template,
            page_images=[u or "" for u in page_images],
            layout_suggestion=str(design_result),
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
    return {"status": "ok", "version": "1.0.0"}
