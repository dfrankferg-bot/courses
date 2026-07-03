"""Shared data structures passed between agents, the reviewer, and the orchestrator."""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any


@dataclass
class ProductBrief:
    """The input to a launch run: the product an operator wants to evaluate."""

    name: str
    niche: str
    selling_price: float
    cogs: float
    solves_problem: bool = True
    shows_demand: bool = True
    aov: float | None = None
    target_monthly_profit: float = 6000.0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class AgentResult:
    """What a specialized (pillar) agent produces."""

    pillar: str
    summary: str
    recommendations: list[str] = field(default_factory=list)
    computed: dict[str, Any] = field(default_factory=dict)  # grounded tool output
    revision: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Review:
    """The reviewer agent's verdict on another agent's result."""

    pillar: str
    approved: bool
    score: float  # 0-100
    issues: list[str] = field(default_factory=list)
    required_fixes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class LaunchPlan:
    """The consolidated output of a full workflow run."""

    product: ProductBrief
    results: dict[str, AgentResult] = field(default_factory=dict)
    reviews: dict[str, Review] = field(default_factory=dict)
    go_no_go: str = "PENDING"
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "product": self.product.to_dict(),
            "go_no_go": self.go_no_go,
            "notes": self.notes,
            "results": {k: v.to_dict() for k, v in self.results.items()},
            "reviews": {k: v.to_dict() for k, v in self.reviews.items()},
        }
