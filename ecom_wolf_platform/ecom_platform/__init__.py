"""Ecom Wolf automated platform.

A multi-agent system that operationalizes *The Million Dollar E-Commerce
Playbook*. Specialized agents each own one pillar of the playbook, a reviewer
agent checks their work against the playbook's rules, and an orchestrator runs
the full launch workflow.

Built on the Anthropic SDK (the same one taught in this ``courses`` repo). Runs
with an ``ANTHROPIC_API_KEY`` for full LLM reasoning, or in a deterministic
offline mode so the workflow is demonstrable without a key.
"""

from .schemas import AgentResult, Review, ProductBrief, LaunchPlan

__all__ = ["AgentResult", "Review", "ProductBrief", "LaunchPlan"]

__version__ = "0.1.0"
