"""
Base Claude agent with tool_use loop.
All specialized agents inherit from this class.
"""
import json
import logging
from typing import Any
import anthropic

logger = logging.getLogger(__name__)


class BaseAgent:
    MODEL = "claude-sonnet-4-6"
    MAX_TOKENS = 4096
    MAX_TURNS = 10  # 무한 루프 방지

    def __init__(self, system_prompt: str, tools: list[dict]):
        self.client = anthropic.Anthropic()
        self.system_prompt = system_prompt
        self.tools = tools

    async def run(self, user_message: str, context: dict | None = None) -> dict:
        """
        메시지를 보내고 tool_use 루프를 돌며 최종 텍스트 응답 반환.
        Returns: {"result": str, "context": dict, "tool_calls": list}
        """
        if context is None:
            context = {}

        messages = [{"role": "user", "content": user_message}]
        tool_calls_log = []

        for turn in range(self.MAX_TURNS):
            response = self.client.messages.create(
                model=self.MODEL,
                system=self.system_prompt,
                tools=self.tools,
                messages=messages,
                max_tokens=self.MAX_TOKENS,
            )

            if response.stop_reason == "end_turn":
                # 최종 텍스트 추출
                text = ""
                for block in response.content:
                    if hasattr(block, "text"):
                        text = block.text
                        break
                return {"result": text, "context": context, "tool_calls": tool_calls_log}

            if response.stop_reason == "tool_use":
                # tool_use 블록 처리
                assistant_message = {"role": "assistant", "content": response.content}
                messages.append(assistant_message)

                tool_results = []
                for block in response.content:
                    if block.type != "tool_use":
                        continue

                    tool_name = block.name
                    tool_input = block.input
                    logger.info("[%s] tool_use: %s(%s)", self.__class__.__name__, tool_name, tool_input)

                    try:
                        result = self._dispatch_tool(tool_name, tool_input, context)
                    except Exception as e:
                        result = {"error": str(e)}
                        logger.error("[%s] tool error %s: %s", self.__class__.__name__, tool_name, e)

                    tool_calls_log.append({"tool": tool_name, "input": tool_input, "result": result})
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result, ensure_ascii=False),
                    })

                messages.append({"role": "user", "content": tool_results})
            else:
                # max_tokens 등 예외 stop_reason
                logger.warning("[%s] unexpected stop_reason: %s", self.__class__.__name__, response.stop_reason)
                break

        return {"result": "에이전트 최대 턴 초과", "context": context, "tool_calls": tool_calls_log}

    def _dispatch_tool(self, name: str, inputs: dict, context: dict) -> Any:
        """
        서브클래스에서 등록된 tool 함수를 호출.
        각 에이전트는 self._tool_registry dict에 {tool_name: callable} 등록.
        """
        registry = getattr(self, "_tool_registry", {})
        if name not in registry:
            raise ValueError(f"Unknown tool: {name}")
        return registry[name](inputs, context)
