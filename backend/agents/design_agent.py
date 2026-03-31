"""
Design Agent — UI 레이아웃 제안, CSS 테마, 페이지 컴포넌트 구조 생성 전담
스토리 데이터를 분석해 최적의 전시 레이아웃과 스타일을 제안
"""
from agents.base_agent import BaseAgent

SYSTEM_PROMPT = """<role>
당신은 KidArt Gallery의 UI/UX 디자인(Design) 전담 에이전트입니다.
어린이가 좋아하는 색·레이아웃·애니메이션을 자동으로 제안합니다.
</role>

<context>
프로젝트: 어린이 그림을 AI로 분석해 동화를 생성하는 플랫폼.
현재 앱 디자인 시스템 (다크 글래스모피즘):
- Primary: #7c5cfc (보라), Accent: #f472b6 (핑크)
- Background: #0e0e1a, Surface: rgba(30,30,55,0.7)
- Font: Outfit (영문), Noto Sans KR (한글)
- 스타일: Dark mode, Glassmorphism, Gradient
</context>

<instructions>
1. 동화 장르(template)·페이지 수·삽화 유무에 맞는 레이아웃 패턴 제안
2. 장르별 CSS 색상 팔레트 생성 (4가지 프리셋: default/fantasy/adventure/nature)
3. 페이지별 컴포넌트 구조 제안 (text-left/right/bottom/full-image)
4. 어린이 친화적 디자인 가이드라인 준수 (가독성, 명도 대비, 애니메이션 속도)
5. 결과는 반드시 JSON으로 반환 (layouts, theme, animation 포함)
</instructions>

<guardrails>
- MAX_TURNS 초과 시 즉시 기본 레이아웃(text-bottom) 반환
- 재시도 전 반성: "레이아웃 계산이 실패했나? 같은 로직을 반복하고 있지 않나?"
- 존재하지 않는 template 값은 "default"로 폴백 처리
</guardrails>

<default_to_action>
명시적 지시가 없으면 제안이 아닌 실행을 기본으로 합니다.
</default_to_action>"""

TOOLS = [
    {
        "name": "suggest_story_layout",
        "description": "동화 내용 분석 후 최적 레이아웃 구조를 제안합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "page_count": {"type": "integer"},
                "template": {"type": "string", "description": "default|fantasy|adventure|nature"},
                "has_images": {"type": "boolean"}
            },
            "required": ["title", "page_count", "template"]
        }
    },
    {
        "name": "generate_color_theme",
        "description": "동화 장르에 맞는 색상 테마를 생성합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "template": {"type": "string", "description": "default|fantasy|adventure|nature"},
                "mood": {"type": "string", "description": "동화 분위기 (예: warm, magical, adventurous)"}
            },
            "required": ["template"]
        }
    },
    {
        "name": "create_page_template",
        "description": "개별 동화 페이지 HTML 컴포넌트 구조를 생성합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "layout": {"type": "string", "description": "text-left | text-right | text-bottom | full-image"},
                "has_image": {"type": "boolean"},
                "page_number": {"type": "integer"},
                "total_pages": {"type": "integer"}
            },
            "required": ["layout", "has_image"]
        }
    },
    {
        "name": "suggest_animation",
        "description": "페이지 전환 애니메이션 및 인터랙션 효과를 제안합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "template": {"type": "string"},
                "target_age": {"type": "string", "description": "5-8 (기본값)"}
            },
            "required": ["template"]
        }
    }
]

# 장르별 기본 테마
THEME_PRESETS: dict[str, dict] = {
    "default": {
        "primary": "#7c5cfc", "accent": "#f472b6",
        "bg": "#1a1a2e", "surface": "rgba(40,40,70,0.8)",
        "font_size": "1.1rem", "line_height": "1.9",
        "mood": "warm and friendly"
    },
    "fantasy": {
        "primary": "#a855f7", "accent": "#60a5fa",
        "bg": "#0d0d2b", "surface": "rgba(30,20,60,0.85)",
        "font_size": "1.1rem", "line_height": "1.9",
        "mood": "magical and mysterious"
    },
    "adventure": {
        "primary": "#f59e0b", "accent": "#ef4444",
        "bg": "#1a1000", "surface": "rgba(50,35,10,0.85)",
        "font_size": "1.1rem", "line_height": "1.9",
        "mood": "exciting and dynamic"
    },
    "nature": {
        "primary": "#22c55e", "accent": "#84cc16",
        "bg": "#0a1a0a", "surface": "rgba(15,40,15,0.85)",
        "font_size": "1.1rem", "line_height": "1.9",
        "mood": "peaceful and natural"
    },
}

LAYOUT_TEMPLATES = {
    "text-left": """<div class="page-spread">
  <div class="page-text">
    <p class="page-content">{text}</p>
  </div>
  <div class="page-image">
    <img src="{image_url}" alt="page illustration" />
  </div>
</div>""",

    "text-right": """<div class="page-spread">
  <div class="page-image">
    <img src="{image_url}" alt="page illustration" />
  </div>
  <div class="page-text">
    <p class="page-content">{text}</p>
  </div>
</div>""",

    "text-bottom": """<div class="page-vertical">
  <div class="page-image-large">
    <img src="{image_url}" alt="page illustration" />
  </div>
  <div class="page-text">
    <p class="page-content">{text}</p>
  </div>
</div>""",

    "full-image": """<div class="page-full">
  <div class="page-image-bg" style="background-image: url('{image_url}')"></div>
  <div class="page-text-overlay">
    <p class="page-content">{text}</p>
  </div>
</div>""",
}


class DesignAgent(BaseAgent):
    def __init__(self):
        super().__init__(system_prompt=SYSTEM_PROMPT, tools=TOOLS)
        self._tool_registry = {
            "suggest_story_layout": self._suggest_story_layout,
            "generate_color_theme": self._generate_color_theme,
            "create_page_template": self._create_page_template,
            "suggest_animation":    self._suggest_animation,
        }

    # ── tool 구현 ──────────────────────────────────────────────

    def _suggest_story_layout(self, inputs: dict, _ctx: dict) -> dict:
        template = inputs.get("template", "default")
        page_count = inputs["page_count"]
        has_images = inputs.get("has_images", True)

        # 페이지 수에 따라 레이아웃 패턴 결정
        if not has_images:
            layouts = ["text-bottom"] * page_count
        elif page_count <= 3:
            layouts = ["text-bottom"] * page_count
        else:
            # 홀수 페이지 left, 짝수 페이지 right 번갈아
            layouts = ["text-left" if i % 2 == 0 else "text-right" for i in range(page_count)]
            # 마지막 페이지는 text-bottom (엔딩)
            if page_count > 1:
                layouts[-1] = "text-bottom"

        return {
            "layouts": layouts,
            "cover_style": template,
            "page_transition": "slide" if template == "adventure" else "fade",
            "suggested_font_size": "1.1rem",
            "show_page_numbers": True,
        }

    def _generate_color_theme(self, inputs: dict, _ctx: dict) -> dict:
        template = inputs.get("template", "default")
        theme = THEME_PRESETS.get(template, THEME_PRESETS["default"]).copy()
        theme["template"] = template
        return theme

    def _create_page_template(self, inputs: dict, _ctx: dict) -> dict:
        layout = inputs.get("layout", "text-bottom")
        template_html = LAYOUT_TEMPLATES.get(layout, LAYOUT_TEMPLATES["text-bottom"])
        return {
            "layout": layout,
            "html_template": template_html,
            "css_classes": ["page-spread" if "spread" in template_html else "page-vertical"],
        }

    def _suggest_animation(self, inputs: dict, _ctx: dict) -> dict:
        template = inputs.get("template", "default")
        animations = {
            "default":   {"transition": "fadeIn", "duration": "0.5s", "easing": "ease-in-out"},
            "fantasy":   {"transition": "sparkle-fade", "duration": "0.8s", "easing": "ease-out"},
            "adventure": {"transition": "slide-in", "duration": "0.3s", "easing": "ease-in"},
            "nature":    {"transition": "float-up", "duration": "0.6s", "easing": "cubic-bezier(0.4,0,0.2,1)"},
        }
        return animations.get(template, animations["default"])

    # ── 편의 메서드 ───────────────────────────────────────────

    def get_layout_for_story(self, template: str, page_count: int, has_images: bool = True) -> dict:
        """오케스트레이터에서 직접 레이아웃 가져올 때 사용"""
        result = self._suggest_story_layout({
            "template": template,
            "page_count": page_count,
            "has_images": has_images,
            "title": "",
        }, {})
        theme = self._generate_color_theme({"template": template}, {})
        animation = self._suggest_animation({"template": template}, {})
        return {
            "layouts": result["layouts"],
            "theme": theme,
            "animation": animation,
            "page_transition": result["page_transition"],
        }
