"""Deterministic playbook tools.

Every hard rule and formula in the playbook lives here as a pure function, so
agent recommendations (and the reviewer's checks) are grounded in real math
rather than the model's guesswork. These functions are also exposed to Claude as
tool definitions (see ``as_anthropic_tools``) so an LLM-backed agent computes
the same numbers a human would.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


# --- Thresholds pulled straight from the playbook ---------------------------
MIN_PROFIT_MARGIN = 0.50
MIN_PRICE_OR_AOV = 100.0
VIRAL_VIEWS_DIVISOR = 5
BULK_SWITCH_ORDERS_PER_DAY = 15
MAX_DELIVERY_DAYS = 12
START_DAILY_BUDGET = (30.0, 50.0)
GOOGLE_UNLOCK_DAILY_REVENUE = 1000.0
MAX_STORE_COLORS = 3
TARGET_CONVERSION_RATE = (0.03, 0.08)


@dataclass
class Check:
    """A single pass/fail evaluation with a human-readable reason."""

    name: str
    passed: bool
    detail: str
    value: Any = None


def profit_margin(selling_price: float, cogs: float) -> float:
    """(price - cogs) / price. Returns a fraction (0.66 == 66%)."""
    if selling_price <= 0:
        raise ValueError("selling_price must be > 0")
    return (selling_price - cogs) / selling_price


def evaluate_product(
    name: str,
    selling_price: float,
    cogs: float,
    solves_problem: bool,
    shows_demand: bool,
    aov: float | None = None,
) -> dict[str, Any]:
    """Score a product against the playbook's four winner criteria."""
    margin = profit_margin(selling_price, cogs)
    effective_aov = aov if aov is not None else selling_price
    checks = [
        Check("solves_real_problem", bool(solves_problem),
              "Product must solve a real problem." if not solves_problem
              else "Solves a real problem."),
        Check("shows_demand", bool(shows_demand),
              "No proven demand." if not shows_demand else "Demand validated."),
        Check("margin_>=_50%", margin >= MIN_PROFIT_MARGIN,
              f"Margin {margin:.0%} (need >= {MIN_PROFIT_MARGIN:.0%}).",
              round(margin, 4)),
        Check("price_or_aov_>=_100", effective_aov >= MIN_PRICE_OR_AOV,
              f"Price/AOV ${effective_aov:.2f} (need >= ${MIN_PRICE_OR_AOV:.0f}).",
              effective_aov),
    ]
    passed = all(c.passed for c in checks)
    return {
        "product": name,
        "profit_margin": round(margin, 4),
        "is_winner": passed,
        "checks": [c.__dict__ for c in checks],
        "verdict": "GREENLIGHT" if passed else "REJECT",
    }


def virality_check(views: int, follower_count: int) -> dict[str, Any]:
    """viral_threshold = views / 5; viral if creator has fewer followers."""
    threshold = views / VIRAL_VIEWS_DIVISOR
    is_viral = follower_count < threshold
    return {
        "views": views,
        "follower_count": follower_count,
        "viral_threshold": threshold,
        "is_viral": is_viral,
        "detail": (
            f"Threshold {threshold:,.0f} followers; creator has "
            f"{follower_count:,} -> {'VIRAL' if is_viral else 'not viral'}."
        ),
    }


def units_for_monthly_profit(target_profit: float, net_per_unit: float) -> dict[str, Any]:
    """How many units/day to hit a monthly profit target."""
    if net_per_unit <= 0:
        raise ValueError("net_per_unit must be > 0")
    per_month = target_profit / net_per_unit
    per_day = per_month / 30.0
    return {
        "target_profit": target_profit,
        "net_per_unit": net_per_unit,
        "units_per_month": round(per_month, 1),
        "units_per_day": round(per_day, 2),
    }


def evaluate_ad_budget(daily_budget: float) -> Check:
    lo, hi = START_DAILY_BUDGET
    ok = lo <= daily_budget <= hi
    return Check(
        "start_budget_in_range", ok,
        f"Start budget ${daily_budget:.0f} should be ${lo:.0f}-${hi:.0f}.",
        daily_budget,
    )


def evaluate_ad_structure(videos: int, ad_copies: int, headlines: int) -> dict[str, Any]:
    """Validate the 3-2-2 ABO structure."""
    checks = [
        Check("videos_==_3", videos == 3, f"3-2-2 needs 3 videos, got {videos}.", videos),
        Check("ad_copies_==_2", ad_copies == 2, f"3-2-2 needs 2 ad copies, got {ad_copies}.", ad_copies),
        Check("headlines_==_2", headlines == 2, f"3-2-2 needs 2 headlines, got {headlines}.", headlines),
    ]
    return {
        "follows_3_2_2": all(c.passed for c in checks),
        "checks": [c.__dict__ for c in checks],
    }


def evaluate_logistics(delivery_days: int, orders_per_day: int, source: str) -> dict[str, Any]:
    """Validate fulfillment against the playbook's logistics rules."""
    checks = [
        Check("delivery_<=_12d", delivery_days <= MAX_DELIVERY_DAYS,
              f"Delivery {delivery_days}d (max {MAX_DELIVERY_DAYS}d).", delivery_days),
        Check("not_aliexpress_fulfillment", "aliexpress" not in source.lower(),
              "Never fulfill from AliExpress." if "aliexpress" in source.lower()
              else f"Source '{source}' is acceptable for fulfillment.", source),
    ]
    should_go_bulk = orders_per_day >= BULK_SWITCH_ORDERS_PER_DAY
    return {
        "checks": [c.__dict__ for c in checks],
        "passes": all(c.passed for c in checks),
        "recommend_private_label": should_go_bulk,
        "detail": (
            f"{orders_per_day} orders/day -> "
            + ("consider private label / bulk." if should_go_bulk
               else "stay on dropshipping until 15-20/day.")
        ),
    }


# --- Anthropic tool schemas (used by the LLM-backed agents) -----------------
def as_anthropic_tools() -> list[dict[str, Any]]:
    """Return these functions as Anthropic tool-use definitions."""
    return [
        {
            "name": "evaluate_product",
            "description": "Score a product against the playbook's 4 winner criteria (real problem, demand, >=50% margin, $100+ price/AOV).",
            "input_schema": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "selling_price": {"type": "number"},
                    "cogs": {"type": "number"},
                    "solves_problem": {"type": "boolean"},
                    "shows_demand": {"type": "boolean"},
                    "aov": {"type": "number"},
                },
                "required": ["name", "selling_price", "cogs", "solves_problem", "shows_demand"],
            },
        },
        {
            "name": "virality_check",
            "description": "Check if a creative is viral: threshold = views/5, viral if creator followers < threshold.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "views": {"type": "integer"},
                    "follower_count": {"type": "integer"},
                },
                "required": ["views", "follower_count"],
            },
        },
        {
            "name": "units_for_monthly_profit",
            "description": "Units/day needed to reach a monthly profit target given net profit per unit.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "target_profit": {"type": "number"},
                    "net_per_unit": {"type": "number"},
                },
                "required": ["target_profit", "net_per_unit"],
            },
        },
        {
            "name": "evaluate_logistics",
            "description": "Validate fulfillment: delivery <=12 days, no AliExpress fulfillment, private-label trigger at 15-20 orders/day.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "delivery_days": {"type": "integer"},
                    "orders_per_day": {"type": "integer"},
                    "source": {"type": "string"},
                },
                "required": ["delivery_days", "orders_per_day", "source"],
            },
        },
    ]


# Dispatch table so the LLM tool-use loop can call these by name.
TOOL_DISPATCH = {
    "evaluate_product": evaluate_product,
    "virality_check": virality_check,
    "units_for_monthly_profit": units_for_monthly_profit,
    "evaluate_logistics": evaluate_logistics,
}


def run_tool(name: str, tool_input: dict[str, Any]) -> Any:
    """Execute a tool by name (used by the agent tool-use loop)."""
    if name not in TOOL_DISPATCH:
        raise KeyError(f"Unknown tool: {name}")
    return TOOL_DISPATCH[name](**tool_input)
