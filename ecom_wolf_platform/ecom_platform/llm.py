"""Thin Anthropic SDK wrapper with a deterministic offline fallback.

If ``ANTHROPIC_API_KEY`` is set and the ``anthropic`` package is installed, the
agents reason with Claude (and can call the deterministic tools). Otherwise the
platform runs in *offline mode*: the LLM calls return ``None`` and each agent
falls back to its rule-based logic, so the full workflow is still demonstrable
end-to-end without a key or network.
"""

from __future__ import annotations

import os
from typing import Any

DEFAULT_MODEL = os.environ.get("ECOM_MODEL", "claude-haiku-4-5-20251001")


class LLM:
    def __init__(self, model: str = DEFAULT_MODEL):
        self.model = model
        self._client = None
        self.online = False
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if api_key:
            try:
                import anthropic  # imported lazily so offline mode needs no dep

                self._client = anthropic.Anthropic(api_key=api_key)
                self.online = True
            except Exception:
                self._client = None
                self.online = False

    def complete(
        self,
        system: str,
        user: str,
        tools: list[dict[str, Any]] | None = None,
        max_tokens: int = 1024,
    ) -> str | None:
        """Return Claude's text response, or ``None`` in offline mode.

        Runs a small tool-use loop so agents can call the deterministic tools in
        ``tools.py`` when a schema list is supplied.
        """
        if not self.online:
            return None

        from . import tools as toolmod

        messages: list[dict[str, Any]] = [{"role": "user", "content": user}]
        for _ in range(6):  # bounded tool-use loop
            resp = self._client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                system=system,
                tools=tools or [],
                messages=messages,
            )
            if resp.stop_reason == "tool_use":
                messages.append({"role": "assistant", "content": resp.content})
                tool_results = []
                for block in resp.content:
                    if getattr(block, "type", None) == "tool_use":
                        try:
                            out = toolmod.run_tool(block.name, dict(block.input))
                            content = str(out)
                        except Exception as exc:  # surface tool errors to the model
                            content = f"ERROR: {exc}"
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": content,
                        })
                messages.append({"role": "user", "content": tool_results})
                continue
            # normal completion
            return "".join(
                b.text for b in resp.content if getattr(b, "type", None) == "text"
            ).strip()
        return None  # exhausted loop
