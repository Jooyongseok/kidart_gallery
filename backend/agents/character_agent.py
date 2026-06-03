"""
Character Agent — 캐릭터 추출, 분석, 일관성 있는 이미지 생성 전담
핵심 목표: 아동 그림에서 캐릭터를 인식/추출하고, 모든 2차 창작물에서 동일 캐릭터 유지
"""
import io
import json
import uuid
import base64
import logging
import urllib.parse
from pathlib import Path

import httpx
from PIL import Image

from agents.base_agent import BaseAgent
from config import settings

logger = logging.getLogger(__name__)

# Gemini API
GEMINI_MODEL = "gemini-2.5-flash-lite"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"

# 캐릭터 분석 프롬프트
CHARACTER_ANALYSIS_PROMPT = """Analyze this children's drawing and identify the MAIN CHARACTER.
Output a JSON object with these exact fields:

{
  "name_suggestion": "a short Korean name suggestion for this character",
  "hair": {"color": "...", "style": "...", "length": "..."},
  "face": {"shape": "...", "eyes": "...", "mouth": "...", "expression": "..."},
  "body": {"build": "...", "height_relative": "..."},
  "clothing": {"top": "...", "bottom": "...", "colors": ["..."]},
  "accessories": ["..."],
  "art_style": "crayon/colored_pencil/marker/watercolor/digital",
  "distinctive_features": ["..."],
  "color_palette": ["#hex1", "#hex2", "..."],
  "character_summary": "A one-paragraph English description covering ALL visual details"
}

Be EXTREMELY specific about colors, shapes, and proportions.
Focus on details that make this character UNIQUE and recognizable.
Output ONLY the JSON, no other text."""

CONSISTENCY_PROMPT_TEMPLATE = """Based on this character analysis, create a FROZEN English prompt (~150 words) that describes this character for image generation.
The prompt must:
1. Start with the character type (child, animal, creature, etc.)
2. Include EVERY visual detail: exact hair color/style, clothing colors/patterns, body proportions
3. Include the art style (e.g., "drawn in crayon style", "colored pencil illustration")
4. Be specific enough that any image generator would produce a recognizably SAME character
5. End with "children's drawing style, bright cheerful colors"

Character analysis:
{analysis}

Output ONLY the prompt text, nothing else."""

SYSTEM_PROMPT = """<role>
당신은 KidArt Gallery의 캐릭터 전담 에이전트입니다.
아동 그림에서 캐릭터를 인식, 추출, 분석하고 일관성 있게 재생성합니다.
</role>

<context>
프로젝트: 어린이 그림을 AI로 분석해 동화를 생성하는 플랫폼.
핵심 목표: 원본 그림의 캐릭터가 모든 생성물(동화책 삽화, 영상)에서 동일하게 보이는 것.
캐릭터 추출에는 rembg(배경제거)를, 분석에는 Gemini Vision을 사용합니다.
이미지 생성은 다중 provider를 지원합니다 (Replicate IP-Adapter, Pollinations, DALL-E 등).
</context>

<instructions>
1. rembg를 이용한 캐릭터 배경 제거 + 투명 PNG 생성
2. Gemini Vision으로 캐릭터 세밀 분석 (JSON 구조)
3. 분석 결과로 일관성 프롬프트(consistency_prompt) 생성
4. 다양한 provider를 통한 캐릭터 일관성 삽화 생성
5. 캐릭터 에셋 저장/관리
</instructions>

<guardrails>
- 캐릭터 일관성이 최우선: 퀄리티보다 동일 캐릭터 유지가 중요
- rembg 실패 시 원본 이미지를 참조로 사용 (에러 아님)
- API 키 미설정 시 graceful fallback (Pollinations.ai 무료)
- 민감한 데이터(API 키)는 로그에 포함 금지
</guardrails>"""

TOOLS = [
    {
        "name": "extract_character",
        "description": "rembg로 이미지에서 캐릭터를 추출(배경 제거)합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "image_b64": {"type": "string", "description": "base64 인코딩된 이미지"}
            },
            "required": ["image_b64"]
        }
    },
    {
        "name": "analyze_character",
        "description": "Gemini Vision으로 캐릭터를 세밀 분석하여 JSON 구조를 반환합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "image_b64": {"type": "string", "description": "base64 인코딩된 (추출된) 캐릭터 이미지"},
                "image_mime": {"type": "string", "description": "image/jpeg | image/png"}
            },
            "required": ["image_b64"]
        }
    },
    {
        "name": "build_consistency_prompt",
        "description": "캐릭터 분석 JSON으로 일관성 생성 프롬프트를 만듭니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "analysis_json": {"type": "string", "description": "analyze_character의 결과 JSON 문자열"}
            },
            "required": ["analysis_json"]
        }
    },
    {
        "name": "generate_consistent_image",
        "description": "캐릭터 참조 이미지 + 장면 설명으로 일관된 삽화를 생성합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "character_ref_b64": {"type": "string", "description": "캐릭터 참조 이미지 base64"},
                "consistency_prompt": {"type": "string", "description": "캐릭터 일관성 프롬프트"},
                "scene_description": {"type": "string", "description": "장면 설명 (영어)"},
                "provider": {"type": "string", "description": "replicate_ip_adapter | replicate_flux | dalle | pollinations"},
                "seed": {"type": "integer", "description": "시드 (선택)"}
            },
            "required": ["consistency_prompt", "scene_description"]
        }
    }
]


class CharacterAgent(BaseAgent):
    def __init__(self):
        super().__init__(system_prompt=SYSTEM_PROMPT, tools=TOOLS)
        self._tool_registry = {
            "extract_character":         self._extract_character,
            "analyze_character":         self._analyze_character,
            "build_consistency_prompt":  self._build_consistency_prompt,
            "generate_consistent_image": self._generate_consistent_image,
        }

    # ── tool 구현 ──────────────────────────────────────────────

    def _extract_character(self, inputs: dict, _ctx: dict) -> dict:
        """rembg로 배경 제거 → 투명 PNG 반환"""
        try:
            from rembg import remove
        except ImportError:
            return {"error": "rembg not installed. Run: pip install rembg"}

        try:
            image_bytes = base64.b64decode(inputs["image_b64"])
            input_image = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
            output_image = remove(input_image)

            # PNG로 변환
            buf = io.BytesIO()
            output_image.save(buf, format="PNG")
            extracted_b64 = base64.b64encode(buf.getvalue()).decode()

            # 썸네일도 생성
            thumb = output_image.copy()
            thumb.thumbnail((128, 128), Image.Resampling.LANCZOS)
            thumb_buf = io.BytesIO()
            thumb.save(thumb_buf, format="PNG")
            thumb_b64 = base64.b64encode(thumb_buf.getvalue()).decode()

            return {
                "extracted_b64": extracted_b64,
                "thumbnail_b64": thumb_b64,
                "width": output_image.width,
                "height": output_image.height,
            }
        except Exception as e:
            logger.error("Character extraction failed: %s", e)
            return {"error": f"추출 실패: {str(e)}"}

    def _analyze_character(self, inputs: dict, _ctx: dict) -> dict:
        """Gemini Vision으로 캐릭터 세밀 분석"""
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            return {"error": "GEMINI_API_KEY not set"}

        image_mime = inputs.get("image_mime", "image/png")
        image_b64 = inputs["image_b64"]

        url = GEMINI_URL.format(model=GEMINI_MODEL, key=api_key)
        payload = {
            "contents": [{
                "parts": [
                    {"text": CHARACTER_ANALYSIS_PROMPT},
                    {"inline_data": {"mime_type": image_mime, "data": image_b64}},
                ]
            }],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 1500,
            }
        }

        try:
            with httpx.Client(timeout=60.0) as client:
                resp = client.post(url, json=payload)
                resp.raise_for_status()
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]

            # JSON 파싱 시도
            text = text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1] if "\n" in text else text[3:]
                text = text.rsplit("```", 1)[0]
            analysis = json.loads(text)
            return {"analysis": analysis}

        except json.JSONDecodeError:
            return {"analysis_raw": text, "error": "JSON parsing failed, raw text returned"}
        except httpx.HTTPStatusError as e:
            return {"error": f"Gemini HTTP {e.response.status_code}: {e.response.text[:200]}"}
        except Exception as e:
            return {"error": str(e)}

    def _build_consistency_prompt(self, inputs: dict, _ctx: dict) -> dict:
        """분석 JSON으로 일관성 프롬프트 생성"""
        api_key = settings.GEMINI_API_KEY
        analysis_str = inputs["analysis_json"]

        # Gemini API 있으면 사용, 없으면 로컬 생성
        if api_key:
            prompt = CONSISTENCY_PROMPT_TEMPLATE.format(analysis=analysis_str)
            url = GEMINI_URL.format(model=GEMINI_MODEL, key=api_key)
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.2, "maxOutputTokens": 500},
            }
            try:
                with httpx.Client(timeout=30.0) as client:
                    resp = client.post(url, json=payload)
                    resp.raise_for_status()
                    data = resp.json()
                    consistency_prompt = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    return {"consistency_prompt": consistency_prompt}
            except Exception as e:
                logger.warning("Gemini consistency prompt failed, falling back to local: %s", e)

        # 로컬 fallback: analysis JSON에서 직접 조합
        try:
            analysis = json.loads(analysis_str) if isinstance(analysis_str, str) else analysis_str
            parts = []
            if "character_summary" in analysis:
                parts.append(analysis["character_summary"])
            else:
                if analysis.get("hair"):
                    h = analysis["hair"]
                    parts.append(f"{h.get('color', '')} {h.get('style', '')} {h.get('length', '')} hair")
                if analysis.get("clothing"):
                    c = analysis["clothing"]
                    parts.append(f"wearing {c.get('top', '')} and {c.get('bottom', '')}")
                if analysis.get("distinctive_features"):
                    parts.append(", ".join(analysis["distinctive_features"]))
            parts.append(f"{analysis.get('art_style', 'crayon')} drawing style")
            parts.append("children's drawing style, bright cheerful colors")
            consistency_prompt = ". ".join(p for p in parts if p.strip())
            return {"consistency_prompt": consistency_prompt}
        except Exception as e:
            return {"error": f"프롬프트 생성 실패: {str(e)}"}

    # ── 지원 Provider 목록 (UI 표시용) ────────────────────────

    PROVIDERS = {
        "flux2_fal": {
            "name": "Flux 2 Pro (fal.ai)",
            "cost": "~$0.03-0.06/장",
            "consistency": 5,
            "ref_image": True,
            "description": "10장 멀티레퍼런스 지원. 2026년 최강 오픈소스",
        },
        "flux_kontext": {
            "name": "Flux Kontext Pro (fal.ai)",
            "cost": "~$0.04-0.08/장",
            "consistency": 5,
            "ref_image": True,
            "description": "캐릭터/컨텍스트 일관성 전용 모델. 아동 그림 최적",
        },
        "ideogram3": {
            "name": "Ideogram 3.0",
            "cost": "~$0.037-0.112/장",
            "consistency": 5,
            "ref_image": True,
            "description": "캐릭터 일관성 1위. 텍스트 렌더링 최강",
        },
        "gpt_image2": {
            "name": "GPT Image 2 (OpenAI)",
            "cost": "$0.005-0.211/장",
            "consistency": 4,
            "ref_image": True,
            "description": "스타일 전환 강점. 2026 플래그십",
        },
        "replicate_ip_adapter": {
            "name": "IP-Adapter SDXL (Replicate)",
            "cost": "~$0.02-0.03/장",
            "consistency": 3.5,
            "ref_image": True,
            "description": "참조 이미지 기반 SDXL. 가성비 우수",
        },
        "replicate_flux": {
            "name": "Flux 1.1 Pro (Replicate)",
            "cost": "~$0.03-0.07/장",
            "consistency": 4,
            "ref_image": True,
            "description": "Flux 1세대. Replicate 호스팅",
        },
        "nano_banana_fal": {
            "name": "Nano Banana 2 (fal.ai)",
            "cost": "~$0.06/장",
            "consistency": 4.5,
            "ref_image": False,
            "description": "fal.ai 1위 모델. 캐릭터 일관성+텍스트 렌더링",
        },
        "pollinations": {
            "name": "Pollinations.ai (무료)",
            "cost": "무료",
            "consistency": 2,
            "ref_image": False,
            "description": "무료 fallback. API 키 불필요",
        },
    }

    def _generate_consistent_image(self, inputs: dict, _ctx: dict) -> dict:
        """다중 provider로 캐릭터 일관성 삽화 생성"""
        provider = inputs.get("provider", settings.IMAGE_GENERATION_PROVIDER)
        consistency_prompt = inputs["consistency_prompt"]
        scene_desc = inputs["scene_description"]
        character_ref_b64 = inputs.get("character_ref_b64")
        seed = inputs.get("seed", 42)

        full_prompt = f"{consistency_prompt}. Scene: {scene_desc}"

        dispatch = {
            "flux2_fal": self._gen_flux2_fal,
            "flux_kontext": self._gen_flux_kontext,
            "ideogram3": self._gen_ideogram3,
            "gpt_image2": self._gen_gpt_image2,
            "replicate_ip_adapter": self._gen_replicate_ip_adapter,
            "replicate_flux": self._gen_replicate_flux,
            "nano_banana_fal": self._gen_nano_banana_fal,
            "pollinations": self._gen_pollinations,
        }

        gen_fn = dispatch.get(provider)
        if gen_fn:
            return gen_fn(full_prompt, character_ref_b64, seed)

        logger.warning("Unknown provider '%s', falling back to pollinations", provider)
        return self._gen_pollinations(full_prompt, character_ref_b64, seed)

    # ── Provider 구현 ─────────────────────────────────────────

    def _fal_run(self, model_id: str, arguments: dict) -> dict:
        """fal.ai 공통 호출 헬퍼"""
        fal_key = settings.FAL_KEY
        if not fal_key:
            return None  # caller handles fallback

        url = f"https://queue.fal.run/{model_id}"
        headers = {"Authorization": f"Key {fal_key}", "Content-Type": "application/json"}
        try:
            with httpx.Client(timeout=120.0) as client:
                resp = client.post(url, json=arguments, headers=headers)
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.error("fal.ai %s failed: %s", model_id, e)
            return None

    def _gen_flux2_fal(self, prompt: str, ref_b64: str | None, seed: int) -> dict:
        """Flux 2 Pro via fal.ai — 10장 멀티레퍼런스 지원"""
        args = {
            "prompt": prompt,
            "image_size": {"width": 1024, "height": 1024},
            "num_images": 1,
            "seed": seed,
        }
        if ref_b64:
            args["image_prompts"] = [{"image_url": f"data:image/png;base64,{ref_b64}", "strength": 0.7}]

        result = self._fal_run("fal-ai/flux-pro/v2", args)
        if result and result.get("images"):
            return {"image_url": result["images"][0]["url"], "provider": "flux2_fal", "prompt": prompt}
        return self._gen_pollinations(prompt, ref_b64, seed)

    def _gen_flux_kontext(self, prompt: str, ref_b64: str | None, seed: int) -> dict:
        """Flux Kontext Pro via fal.ai — 캐릭터 일관성 전용"""
        if not ref_b64:
            return self._gen_flux2_fal(prompt, ref_b64, seed)

        args = {
            "prompt": prompt,
            "image_url": f"data:image/png;base64,{ref_b64}",
            "image_size": {"width": 1024, "height": 1024},
            "num_images": 1,
            "seed": seed,
        }
        result = self._fal_run("fal-ai/flux-kontext/pro", args)
        if result and result.get("images"):
            return {"image_url": result["images"][0]["url"], "provider": "flux_kontext", "prompt": prompt}
        return self._gen_flux2_fal(prompt, ref_b64, seed)

    def _gen_ideogram3(self, prompt: str, ref_b64: str | None, seed: int) -> dict:
        """Ideogram 3.0 API — 캐릭터 레퍼런스 + 텍스트 렌더링 최강"""
        api_key = settings.IDEOGRAM_API_KEY
        if not api_key:
            return self._gen_pollinations(prompt, ref_b64, seed)

        try:
            headers = {"Api-Key": api_key, "Content-Type": "application/json"}
            payload = {
                "image_request": {
                    "prompt": prompt,
                    "model": "V_3",
                    "magic_prompt_option": "AUTO",
                    "aspect_ratio": "ASPECT_1_1",
                    "seed": seed,
                }
            }
            if ref_b64:
                payload["image_request"]["character_reference"] = {
                    "image_url": f"data:image/png;base64,{ref_b64}"
                }

            with httpx.Client(timeout=90.0) as client:
                resp = client.post("https://api.ideogram.ai/generate", json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                image_url = data["data"][0]["url"]
                return {"image_url": image_url, "provider": "ideogram3", "prompt": prompt}

        except Exception as e:
            logger.error("Ideogram 3.0 failed: %s", e)
            return self._gen_pollinations(prompt, ref_b64, seed)

    def _gen_gpt_image2(self, prompt: str, ref_b64: str | None, seed: int) -> dict:
        """OpenAI GPT Image 2 — 2026 플래그십"""
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            return self._gen_pollinations(prompt, ref_b64, seed)

        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)

            gpt_prompt = prompt[:4000]
            response = client.images.generate(
                model="gpt-image-1",
                prompt=gpt_prompt,
                size="1024x1024",
                quality="medium",
                n=1,
            )
            image_url = response.data[0].url
            return {"image_url": image_url, "provider": "gpt_image2", "prompt": prompt}

        except Exception as e:
            logger.error("GPT Image 2 failed: %s", e)
            return self._gen_pollinations(prompt, ref_b64, seed)

    def _gen_replicate_ip_adapter(self, prompt: str, ref_b64: str | None, seed: int) -> dict:
        """Replicate IP-Adapter SDXL"""
        token = settings.REPLICATE_API_TOKEN
        if not token:
            return self._gen_pollinations(prompt, ref_b64, seed)

        try:
            import replicate

            input_data = {
                "prompt": prompt,
                "negative_prompt": "deformed, ugly, bad anatomy, disfigured, poorly drawn, mutation",
                "num_outputs": 1,
                "width": 512,
                "height": 512,
                "num_inference_steps": 30,
                "guidance_scale": 7.5,
                "seed": seed,
            }
            if ref_b64:
                input_data["image"] = f"data:image/png;base64,{ref_b64}"
                input_data["ip_adapter_scale"] = 0.7

            output = replicate.run("lucataco/ip-adapter-sdxl", input=input_data)
            image_url = output[0] if isinstance(output, list) else str(output)
            return {"image_url": image_url, "provider": "replicate_ip_adapter", "prompt": prompt}

        except Exception as e:
            logger.error("Replicate IP-Adapter failed: %s", e)
            return self._gen_pollinations(prompt, ref_b64, seed)

    def _gen_replicate_flux(self, prompt: str, ref_b64: str | None, seed: int) -> dict:
        """Replicate Flux 1.1 Pro"""
        token = settings.REPLICATE_API_TOKEN
        if not token:
            return self._gen_pollinations(prompt, ref_b64, seed)

        try:
            import replicate

            input_data = {
                "prompt": prompt,
                "num_outputs": 1,
                "aspect_ratio": "1:1",
                "output_format": "png",
                "seed": seed,
            }
            if ref_b64:
                input_data["image_prompt"] = f"data:image/png;base64,{ref_b64}"
                input_data["image_prompt_strength"] = 0.65

            output = replicate.run("black-forest-labs/flux-1.1-pro", input=input_data)
            image_url = output[0] if isinstance(output, list) else str(output)
            return {"image_url": image_url, "provider": "replicate_flux", "prompt": prompt}

        except Exception as e:
            logger.error("Replicate Flux failed: %s", e)
            return self._gen_pollinations(prompt, ref_b64, seed)

    def _gen_nano_banana_fal(self, prompt: str, ref_b64: str | None, seed: int) -> dict:
        """Nano Banana 2 via fal.ai — 캐릭터 일관성+텍스트 렌더링"""
        args = {
            "prompt": prompt,
            "image_size": {"width": 1024, "height": 1024},
            "num_images": 1,
            "seed": seed,
        }
        result = self._fal_run("fal-ai/nano-banana-2", args)
        if result and result.get("images"):
            return {"image_url": result["images"][0]["url"], "provider": "nano_banana_fal", "prompt": prompt}
        return self._gen_pollinations(prompt, ref_b64, seed)

    def _gen_pollinations(self, prompt: str, ref_b64: str | None = None, seed: int = 42) -> dict:
        """Pollinations.ai — 무료 fallback"""
        encoded_prompt = urllib.parse.quote(prompt[:500])
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=512&height=512&seed={seed}&nologo=true"
        return {"image_url": url, "provider": "pollinations", "prompt": prompt}

    # ── BiRefNet 배경 제거 (fal.ai) ──────────────────────────

    def extract_character_birefnet_direct(self, image_bytes: bytes) -> dict:
        """fal.ai BiRefNet으로 고품질 배경 제거"""
        fal_key = settings.FAL_KEY
        if not fal_key:
            return self.extract_character_direct(image_bytes)  # rembg fallback

        image_b64 = base64.b64encode(image_bytes).decode()
        args = {"image_url": f"data:image/png;base64,{image_b64}"}
        result = self._fal_run("fal-ai/birefnet", args)
        if result and result.get("image"):
            # fal.ai BiRefNet returns {"image": {"url": "...", ...}}
            img_url = result["image"]["url"]
            try:
                with httpx.Client(timeout=30.0) as client:
                    resp = client.get(img_url)
                    resp.raise_for_status()
                    extracted_bytes = resp.content
                    extracted_b64 = base64.b64encode(extracted_bytes).decode()

                    img = Image.open(io.BytesIO(extracted_bytes))
                    thumb = img.copy()
                    thumb.thumbnail((128, 128), Image.Resampling.LANCZOS)
                    thumb_buf = io.BytesIO()
                    thumb.save(thumb_buf, format="PNG")
                    thumb_b64 = base64.b64encode(thumb_buf.getvalue()).decode()

                    return {
                        "extracted_b64": extracted_b64,
                        "thumbnail_b64": thumb_b64,
                        "width": img.width,
                        "height": img.height,
                        "method": "birefnet",
                    }
            except Exception as e:
                logger.error("BiRefNet image download failed: %s", e)

        return self.extract_character_direct(image_bytes)  # rembg fallback

    # ── Direct Methods (오케스트레이터용) ─────────────────────

    def extract_character_direct(self, image_bytes: bytes) -> dict:
        """이미지 바이트 → 배경 제거된 캐릭터 추출"""
        image_b64 = base64.b64encode(image_bytes).decode()
        return self._extract_character({"image_b64": image_b64}, {})

    def analyze_character_direct(self, image_b64: str, image_mime: str = "image/png") -> dict:
        """캐릭터 이미지 분석 → 구조화된 JSON"""
        return self._analyze_character({"image_b64": image_b64, "image_mime": image_mime}, {})

    def build_consistency_prompt_direct(self, analysis_json: str) -> dict:
        """분석 JSON → 일관성 프롬프트"""
        return self._build_consistency_prompt({"analysis_json": analysis_json}, {})

    def generate_consistent_image_direct(
        self,
        consistency_prompt: str,
        scene_description: str,
        character_ref_b64: str | None = None,
        provider: str | None = None,
        seed: int = 42,
    ) -> dict:
        """일관된 캐릭터 삽화 1장 생성"""
        return self._generate_consistent_image({
            "consistency_prompt": consistency_prompt,
            "scene_description": scene_description,
            "character_ref_b64": character_ref_b64 or "",
            "provider": provider or settings.IMAGE_GENERATION_PROVIDER,
            "seed": seed,
        }, {})

    def generate_story_images_direct(
        self,
        consistency_prompt: str,
        scenes: list[str],
        character_ref_b64: str | None = None,
        provider: str | None = None,
    ) -> list[dict]:
        """동화책 전체 페이지 삽화 일괄 생성"""
        results = []
        for i, scene in enumerate(scenes):
            if not scene:
                results.append({"image_url": None, "page_idx": i})
                continue
            result = self.generate_consistent_image_direct(
                consistency_prompt=consistency_prompt,
                scene_description=scene,
                character_ref_b64=character_ref_b64,
                provider=provider,
                seed=42 + i,
            )
            result["page_idx"] = i
            results.append(result)
        return results

    def compare_providers_direct(
        self,
        consistency_prompt: str,
        scene_description: str,
        character_ref_b64: str | None = None,
        providers: list[str] | None = None,
    ) -> dict:
        """동일 장면을 여러 provider로 생성하여 비교"""
        if providers is None:
            providers = list(self.PROVIDERS.keys())

        results = {}
        for provider in providers:
            result = self.generate_consistent_image_direct(
                consistency_prompt=consistency_prompt,
                scene_description=scene_description,
                character_ref_b64=character_ref_b64,
                provider=provider,
                seed=42,
            )
            results[provider] = result
        return {"comparison": results, "scene": scene_description}

    def save_character_files(
        self, user_id: int, extracted_b64: str, thumbnail_b64: str | None = None
    ) -> dict:
        """캐릭터 이미지 파일을 디스크에 저장"""
        char_uuid = uuid.uuid4().hex
        char_dir = Path(settings.CHARACTER_UPLOAD_DIR) / str(user_id) / char_uuid
        char_dir.mkdir(parents=True, exist_ok=True)

        # 추출 이미지 저장
        extracted_path = char_dir / "extracted.png"
        extracted_path.write_bytes(base64.b64decode(extracted_b64))

        # 썸네일 저장
        thumb_path = None
        if thumbnail_b64:
            thumb_path = char_dir / "thumbnail.png"
            thumb_path.write_bytes(base64.b64decode(thumbnail_b64))

        return {
            "extracted_image_path": str(extracted_path),
            "thumbnail_path": str(thumb_path) if thumb_path else None,
            "character_uuid": char_uuid,
        }
