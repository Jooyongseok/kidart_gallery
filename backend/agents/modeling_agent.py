"""
Modeling Agent — VLM 이미지 분석, 스토리 생성, 삽화 프롬프트 생성 전담
story-test.html의 buildPrompt/parseStory 로직을 Python으로 이식
"""
import re
import json
import base64
import httpx
import logging
from agents.base_agent import BaseAgent

logger = logging.getLogger(__name__)

SCENE_INSTRUCTION = """

[IMPORTANT - Illustration Prompt] At the end of EACH paragraph, you MUST write an illustration description in English using this exact format:
[SCENE: a detailed English description of the illustration for this page]

Rules for SCENE tags:
- MUST be in English
- Start EVERY scene with the EXACT same character description (same hair color/style, same clothing colors/type, same features) — characters must look IDENTICAL across all pages
- Describe the specific action and setting for THIS paragraph
- Use the SAME art style as the original drawing (e.g., "crayon drawing", "colored pencil sketch", "marker illustration") — do NOT say "watercolor" or "professional illustration" unless the original drawing actually uses that style
- End with: "children's drawing style, maintaining original art style, bright colors"
- Do NOT change character appearance between scenes"""

TEMPLATES: dict[str, str] = {
    "default": """Carefully observe this drawing in great detail.

Step 1 — ANALYZE THE DRAWING:
- Identify every character (appearance, hair, clothing, expression, pose)
- Identify every object, animal, plant
- Describe the background, setting, colors, and overall mood
- Note any text, symbols, or unique details

Step 2 — CREATE A STORY:
Based STRICTLY on what you see in the drawing, create a children's story (ages 5-8).

Rules:
- Write in Korean
- Title in 【제목】 format
- 3~5 paragraphs separated by blank lines (each = one storybook page)
- 400~600 characters
- The main character MUST look exactly like the character in the drawing
- Every object and animal in the drawing MUST appear in the story
- Do NOT invent characters or objects that are not in the drawing
- Warm, positive message""",

    "fantasy": """Carefully observe this drawing in great detail.

Step 1 — ANALYZE THE DRAWING:
- Identify every character, object, animal, color, and background detail

Step 2 — CREATE A FANTASY STORY:
Based on the EXACT characters and objects in the drawing, create a magical children's story.

Rules:
- Write in Korean
- Title in 【제목】 format
- 3~5 paragraphs (each = one page)
- The main character MUST match the drawing exactly
- Add magical elements but keep the original characters
- All objects from the drawing must appear
- 400~600 characters
- Message about courage and imagination""",

    "adventure": """Carefully observe this drawing in great detail.

Step 1 — ANALYZE THE DRAWING:
- Identify every character, object, animal, color, and background detail

Step 2 — CREATE AN ADVENTURE STORY:
Based on the EXACT characters and objects in the drawing, create an exciting adventure story.

Rules:
- Write in Korean
- Title in 【제목】 format
- 3~5 paragraphs (each = one page)
- The main character MUST match the drawing exactly
- All objects from the drawing must play a role
- 400~600 characters
- Message about curiosity and perseverance""",

    "nature": """Carefully observe this drawing in great detail.

Step 1 — ANALYZE THE DRAWING:
- Identify every animal, plant, natural element, color, and background detail

Step 2 — CREATE A NATURE STORY:
Based on the EXACT elements in the drawing, create a nature/animal story.

Rules:
- Write in Korean
- Title in 【제목】 format
- 3~5 paragraphs (each = one page)
- Personify the animals/plants from the drawing
- 400~600 characters
- Message about nature and friendship""",
}

# 지원 VLM 모델
VLM_MODELS = {
    "qwen":    "Qwen/Qwen2.5-VL-7B-Instruct",
    "llama":   "meta-llama/Llama-3.2-11B-Vision-Instruct",
    "mistral": "mistralai/Pixtral-12B-2409",
}

SYSTEM_PROMPT = """<role>
당신은 KidArt Gallery의 AI 모델링(Modeling) 전담 에이전트입니다.
그림 → 동화 변환의 AI 핵심 — VLM이 이야기를 보고, 읽고, 상상합니다.
</role>

<context>
프로젝트: 어린이 그림을 AI로 분석해 동화를 생성하는 플랫폼.
로컬 vLLM 서버(localhost:8100)에 Vision Language Model이 실행 중입니다.
삽화는 Pollinations.ai(무료, 토큰 불필요)로 생성합니다.
이미지는 base64 인코딩 문자열로 제공됩니다.
</context>

<instructions>
1. VLM을 통한 어린이 그림 세밀 분석
2. 그림 기반 한국어 동화 생성 (3~5페이지, 400~600자)
3. 각 페이지 말미에 영어 [SCENE: ...] 태그로 삽화 프롬프트 삽입
4. SCENE 태그 → Pollinations.ai URL 생성
5. 파싱 실패 시 {"error": "..."} 반환 (예외 발생 금지)
6. 모든 SCENE은 원본 그림 화풍(크레용, 색연필 등) 그대로 유지
</instructions>

<guardrails>
- MAX_TURNS 초과 시 즉시 중단하고 현재까지 파싱된 결과 반환
- 재시도 전 반성: "VLM 응답이 비었나? SCENE 태그가 없나? 같은 파싱을 반복하고 있지 않나?"
- 이미지 base64가 너무 클 경우 즉시 오류 반환 (처리 시도 금지)
</guardrails>

<default_to_action>
명시적 지시가 없으면 제안이 아닌 실행을 기본으로 합니다.
</default_to_action>"""

TOOLS = [
    {
        "name": "call_vlm",
        "description": "VLM(vLLM 로컬 서버)에 이미지+프롬프트를 보내 텍스트 응답을 받습니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "model_key": {"type": "string", "description": "qwen | llama | mistral"},
                "prompt": {"type": "string"},
                "image_b64": {"type": "string", "description": "base64 인코딩된 이미지"},
                "image_mime": {"type": "string", "description": "image/jpeg | image/png"}
            },
            "required": ["model_key", "prompt", "image_b64"]
        }
    },
    {
        "name": "parse_story",
        "description": "VLM 응답에서 제목, 페이지 텍스트, SCENE 태그를 파싱합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "raw_text": {"type": "string", "description": "VLM이 생성한 원본 텍스트"}
            },
            "required": ["raw_text"]
        }
    },
    {
        "name": "build_image_prompt",
        "description": "SCENE 태그 텍스트로 Pollinations.ai용 이미지 생성 프롬프트를 구성합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "scene": {"type": "string", "description": "SCENE 태그 내용 (영어)"}
            },
            "required": ["scene"]
        }
    },
    {
        "name": "generate_image",
        "description": "Pollinations.ai를 통해 이미지를 생성하고 URL을 반환합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "prompt": {"type": "string", "description": "영어 이미지 생성 프롬프트"},
                "seed": {"type": "integer", "description": "재현성을 위한 시드 (선택)"}
            },
            "required": ["prompt"]
        }
    }
]

# vLLM 로컬 서버 (test/run-vllm.sh 실행 필요)
VLLM_URL = "http://localhost:8100/v1/chat/completions"


class ModelingAgent(BaseAgent):
    def __init__(self, vllm_url: str = VLLM_URL):
        super().__init__(system_prompt=SYSTEM_PROMPT, tools=TOOLS)
        self.vllm_url = vllm_url
        self._tool_registry = {
            "call_vlm":           self._call_vlm,
            "parse_story":        self._parse_story,
            "build_image_prompt": self._build_image_prompt,
            "generate_image":     self._generate_image,
        }

    # ── tool 구현 ──────────────────────────────────────────────

    def _call_vlm(self, inputs: dict, _ctx: dict) -> dict:
        model_id = VLM_MODELS.get(inputs["model_key"], inputs["model_key"])
        image_mime = inputs.get("image_mime", "image/jpeg")
        image_url = f"data:{image_mime};base64,{inputs['image_b64']}"

        payload = {
            "model": model_id,
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "text", "text": inputs["prompt"]},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ]
            }],
            "max_tokens": 2000,
            "temperature": 0.7,
        }

        try:
            with httpx.Client(timeout=120.0) as client:
                resp = client.post(self.vllm_url, json=payload)
                resp.raise_for_status()
                data = resp.json()
                text = data["choices"][0]["message"]["content"]
                return {"text": text, "model": model_id}
        except httpx.HTTPStatusError as e:
            return {"error": f"HTTP {e.response.status_code}: {e.response.text[:200]}"}
        except Exception as e:
            return {"error": str(e)}

    def _parse_story(self, inputs: dict, _ctx: dict) -> dict:
        raw: str = inputs["raw_text"]

        # 제목 추출: 【제목】, # Title, 첫 줄
        title = ""
        m_title = re.search(r"[【\[]([^\]】]+)[】\]]", raw)
        if m_title:
            title = m_title.group(1).strip()
            raw = raw.replace(m_title.group(0), "").strip()
        elif raw.startswith("#"):
            lines = raw.split("\n", 1)
            title = lines[0].lstrip("#").strip()
            raw = lines[1].strip() if len(lines) > 1 else ""
        else:
            lines = raw.split("\n", 1)
            title = lines[0].strip()
            raw = lines[1].strip() if len(lines) > 1 else ""

        # 단락 분리
        raw_pages = [p.strip() for p in re.split(r"\n{2,}", raw) if p.strip()]

        pages = []
        scenes = []
        for p in raw_pages:
            m_scene = re.search(r"\[SCENE:\s*(.+?)\]", p, re.IGNORECASE | re.DOTALL)
            if m_scene:
                scenes.append(m_scene.group(1).strip())
            else:
                scenes.append(None)
            clean = re.sub(r"\[SCENE:\s*[^\]]*\]", "", p, flags=re.IGNORECASE).strip()
            if clean:
                pages.append(clean)

        # 빈 title 방어
        if not title and pages:
            title = pages[0][:30] + "..."

        return {
            "title": title,
            "pages": pages,
            "scenes": scenes,
            "page_count": len(pages),
        }

    def _build_image_prompt(self, inputs: dict, _ctx: dict) -> dict:
        scene = inputs["scene"]
        prefix = "A cute children's storybook illustration, soft and warm colors. "
        prompt = prefix + scene
        # 최대 500자
        if len(prompt) > 500:
            prompt = prompt[:500]
        return {"prompt": prompt}

    def _generate_image(self, inputs: dict, _ctx: dict) -> dict:
        prompt = inputs["prompt"]
        seed = inputs.get("seed", 42)
        # Pollinations.ai — 무료, 토큰 불필요
        encoded = httpx.URL("").copy_with(
            raw_path=b"",
        )
        import urllib.parse
        encoded_prompt = urllib.parse.quote(prompt)
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=512&height=512&seed={seed}&nologo=true"
        return {"image_url": url, "prompt": prompt}

    # ── 편의 메서드 (오케스트레이터용) ──────────────────────────

    def build_prompt(self, template: str, custom_prompt: str = "") -> str:
        if template == "custom":
            return custom_prompt
        base = TEMPLATES.get(template, TEMPLATES["default"])
        return base + SCENE_INSTRUCTION

    def parse_story_direct(self, raw_text: str) -> dict:
        return self._parse_story({"raw_text": raw_text}, {})

    def build_image_prompt_direct(self, scene: str) -> str:
        return self._build_image_prompt({"scene": scene}, {})["prompt"]

    def get_image_url(self, scene: str, page_idx: int = 0) -> str:
        prompt = self.build_image_prompt_direct(scene)
        result = self._generate_image({"prompt": prompt, "seed": 42 + page_idx}, {})
        return result["image_url"]
