"""The agents that make up the platform.

Four *specialist* agents (one per playbook pillar) each produce a grounded
recommendation, a *reviewer* agent audits each one against the playbook's hard
rules, and — because the decision layer is collaborative — every agent shares a
common :class:`SharedContext` blackboard:

  * downstream agents read upstream results (product -> ads -> logistics), so
    e.g. the logistics plan is driven by the ad team's projected order volume;
  * after the pipeline, every agent joins a **consensus round** (``peer_review``)
    where it inspects the whole plan and raises cross-pillar concerns.

Each agent works in two modes:
  * online  -> Claude reasons over the playbook and calls the deterministic tools
  * offline -> the agent falls back to rule-based logic driven by tools.py

Either way, the numeric verdicts come from tools.py, so they are consistent.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from . import tools
from .demand import fetch_demand_signal
from .llm import LLM
from .schemas import AgentResult, ProductBrief, Review, SharedContext

_PLAYBOOK_PATH = Path(__file__).resolve().parent.parent / "playbook" / "playbook.json"


def load_playbook() -> dict[str, Any]:
    return json.loads(_PLAYBOOK_PATH.read_text())


PLAYBOOK = load_playbook()


def _pillar_spec(pillar_id: str) -> dict[str, Any]:
    for p in PLAYBOOK["pillars"]:
        if p["id"] == pillar_id:
            return p
    raise KeyError(pillar_id)


class Agent:
    """Base agent: a persona + playbook context + an LLM (optional)."""

    pillar_id: str = ""
    role: str = ""

    def __init__(self, llm: LLM | None = None):
        self.llm = llm or LLM()
        self.spec = _pillar_spec(self.pillar_id) if self.pillar_id else {}

    @property
    def system_prompt(self) -> str:
        return (
            f"You are the {self.role} for an e-commerce operation. You strictly "
            f"follow The Million Dollar E-Commerce Playbook. Your pillar spec:\n"
            f"{json.dumps(self.spec, indent=2)}\n"
            "Use the provided tools for any numeric decision. Be concrete and "
            "actionable. Never recommend anything that violates the playbook's rules."
        )

    def _llm_summary(self, task: str) -> str | None:
        return self.llm.complete(
            system=self.system_prompt,
            user=task,
            tools=tools.as_anthropic_tools(),
            max_tokens=900,
        )

    def run(self, brief: ProductBrief, ctx: SharedContext | None = None,
            feedback: list[str] | None = None) -> AgentResult:
        """Produce this pillar's recommendation. Subclasses implement."""
        raise NotImplementedError

    def peer_review(self, ctx: SharedContext) -> list[str]:
        """Consensus round: inspect the whole plan, raise cross-pillar concerns.

        Default: no concerns. Specialists override to flag inconsistencies with
        other pillars' work.
        """
        return []


# --------------------------------------------------------------------------- #
# Pillar 1 — Product research (owns the shared demand signal)
# --------------------------------------------------------------------------- #
class ProductResearchAgent(Agent):
    pillar_id = "product_selection"
    role = "Product Research Specialist"

    def _resolve_demand(self, brief: ProductBrief, ctx: SharedContext | None) -> tuple[bool, str]:
        """Validate demand with a live Google Trends signal when enabled.

        Returns (shows_demand, note) and publishes the signal to the blackboard.
        """
        shows_demand = brief.shows_demand
        if ctx is None or not ctx.enable_live_signals:
            return shows_demand, "Demand from brief (live validation disabled)."

        signal = ctx.signals.get("demand")
        if signal is None:
            keyword = brief.name or brief.niche
            signal = fetch_demand_signal(keyword)
            ctx.signals["demand"] = signal

        if signal.get("available") and signal.get("has_data"):
            shows_demand = bool(signal["shows_demand"])
            return shows_demand, (
                f"Google Trends: avg interest {signal['avg_interest']}, "
                f"trend {signal['trend']} -> demand "
                f"{'CONFIRMED' if shows_demand else 'WEAK'}."
            )
        reason = signal.get("reason", "unavailable")
        return shows_demand, f"Live demand unavailable ({reason}); used brief value."

    def run(self, brief: ProductBrief, ctx: SharedContext | None = None,
            feedback: list[str] | None = None) -> AgentResult:
        shows_demand, demand_note = self._resolve_demand(brief, ctx)

        evaluation = tools.evaluate_product(
            name=brief.name,
            selling_price=brief.selling_price,
            cogs=brief.cogs,
            solves_problem=brief.solves_problem,
            shows_demand=shows_demand,
            aov=brief.aov,
        )
        recs: list[str] = [demand_note]
        for check in evaluation["checks"]:
            if not check["passed"]:
                recs.append(f"FIX: {check['detail']}")
        if evaluation["is_winner"]:
            recs.append(
                f"GREENLIGHT: {brief.name} passes all 4 criteria "
                f"(margin {evaluation['profit_margin']:.0%}). Reverse-engineer "
                "top Shopify competitors' offers and price competitively."
            )
        else:
            recs.append("Do not proceed until all 4 winner criteria pass.")

        # Publish shared facts other agents depend on.
        if ctx is not None:
            ctx.signals["profit_margin"] = evaluation["profit_margin"]
            ctx.signals["net_per_unit"] = round(
                (brief.aov or brief.selling_price) - brief.cogs, 2
            )

        summary = self._llm_summary(
            f"Evaluate this product brief and give a go/no-go with reasoning:\n"
            f"{json.dumps(brief.to_dict(), indent=2)}\nDemand note: {demand_note}"
        ) or (
            f"{brief.name} ({brief.niche}): margin {evaluation['profit_margin']:.0%}, "
            f"verdict {evaluation['verdict']}. {demand_note}"
        )
        return AgentResult(
            pillar=self.pillar_id,
            summary=summary,
            recommendations=recs,
            computed=evaluation,
        )

    def peer_review(self, ctx: SharedContext) -> list[str]:
        signal = ctx.signals.get("demand", {})
        if ctx.enable_live_signals and signal.get("available") and not signal.get("has_data"):
            return ["Product: no independent demand data found — validate before scaling ad spend."]
        return []


# --------------------------------------------------------------------------- #
# Pillar 2 — Website optimization
# --------------------------------------------------------------------------- #
class WebsiteOptimizationAgent(Agent):
    pillar_id = "website_optimization"
    role = "Conversion / Website Optimization Specialist"

    def run(self, brief: ProductBrief, ctx: SharedContext | None = None,
            feedback: list[str] | None = None) -> AgentResult:
        checklist = self.spec["conversion_checklist"]
        recs = [f"Apply: {item}" for item in checklist]
        recs.insert(0, "Start on the Debut theme; build the product page from a "
                       "proven competitor link via an AI page builder.")

        # Collaboration: tailor guidance to the product team's margin finding.
        margin = (ctx.signals.get("profit_margin") if ctx else None)
        if margin is not None and margin < 0.6:
            recs.append(
                f"Margin is thin ({margin:.0%}); prioritize funnel/AOV boosters "
                "(bundles, upsells) so ad spend stays profitable."
            )

        computed = {
            "target_conversion_rate": self.spec["thresholds"],
            "checklist_items": len(checklist),
        }
        summary = self._llm_summary(
            f"Produce a conversion-optimized store setup plan for '{brief.name}' "
            f"in the {brief.niche} niche, following the checklist exactly."
        ) or (
            f"Store plan for {brief.name}: simple Debut-theme store, max 3 colors, "
            "no pop-ups, add-to-cart -> cart page, benefit-led copy. "
            "Target 3-8% conversion vs 1% industry average."
        )
        return AgentResult(self.pillar_id, summary, recs, computed)


# --------------------------------------------------------------------------- #
# Pillar 3 — Advertising (projects order volume for the logistics team)
# --------------------------------------------------------------------------- #
class AdvertisingAgent(Agent):
    pillar_id = "online_advertising"
    role = "Paid Media / Facebook Ads Specialist"

    def run(self, brief: ProductBrief, ctx: SharedContext | None = None,
            feedback: list[str] | None = None) -> AgentResult:
        structure = tools.evaluate_ad_structure(videos=3, ad_copies=2, headlines=2)
        budget = tools.evaluate_ad_budget(40.0)

        # Collaboration: reuse the product team's net-per-unit if available.
        gross = ctx.signals.get("net_per_unit") if ctx else None
        if gross is None:
            gross = (brief.aov or brief.selling_price) - brief.cogs
        net = max(gross - 50.0, 1.0)  # ~$50 CAC per the playbook
        unit_math = tools.units_for_monthly_profit(brief.target_monthly_profit, net)

        # Publish the projected order volume so logistics can size fulfillment.
        if ctx is not None:
            ctx.signals["projected_units_per_day"] = unit_math["units_per_day"]

        computed = {
            "launch": self.spec["launch_method"],
            "structure_valid": structure,
            "budget_check": budget.__dict__,
            "kpis": self.spec["kpis"],
            "unit_economics": unit_math,
        }
        recs = [
            "Launch with the 3-2-2 ABO method: 1 campaign, 1 broad ad set, 3 viral videos.",
            f"Start at $30-$50/day; scale only on KPIs ({', '.join(self.spec['kpis'])}).",
            "Source already-viral creatives (virality check: views/5 > creator followers).",
            f"Need ~{unit_math['units_per_day']} units/day to hit "
            f"${brief.target_monthly_profit:,.0f}/mo at ~${net:.0f} net/unit.",
            "Add Google ads only after sustaining $1k/day on Facebook.",
        ]
        summary = self._llm_summary(
            f"Draft a Facebook launch plan for '{brief.name}' using the 3-2-2 "
            f"method and a ${brief.target_monthly_profit:,.0f}/mo profit target."
        ) or (
            f"Facebook 3-2-2 launch for {brief.name}: 3 videos / 2 copies / 2 "
            f"headlines, $40/day start, scale on ROAS/CPA. ~{unit_math['units_per_day']} units/day to target."
        )
        return AgentResult(self.pillar_id, summary, recs, computed)

    def peer_review(self, ctx: SharedContext) -> list[str]:
        product = ctx.upstream("product_selection")
        if product and not product.computed.get("is_winner", False):
            return ["Ads: HALT — product failed selection criteria; do not spend on ads until fixed."]
        return []


# --------------------------------------------------------------------------- #
# Pillar 4 — Logistics & brand building (sized by the ad team's projection)
# --------------------------------------------------------------------------- #
class LogisticsAgent(Agent):
    pillar_id = "logistics_brand_building"
    role = "Logistics & Fulfillment Specialist"

    def run(self, brief: ProductBrief, ctx: SharedContext | None = None,
            feedback: list[str] | None = None) -> AgentResult:
        # Collaboration: size fulfillment to the ad team's projected volume.
        projected = 5
        if ctx is not None:
            projected = max(1, round(ctx.signals.get("projected_units_per_day", 5)))

        logistics = tools.evaluate_logistics(
            delivery_days=10, orders_per_day=projected, source="Zendrop"
        )
        computed = {
            "suppliers": self.spec["suppliers"],
            "evaluation": logistics,
            "projected_orders_per_day": projected,
            "bulk_switch_orders_per_day": self.spec["thresholds"]["bulk_switch_orders_per_day"],
        }
        recs = [
            f"At the projected ~{projected} orders/day: {logistics['detail']}",
            "Start dropshipping via Zendrop/CJ/DSers/AutoDS to de-risk inventory.",
            "Keep delivery <= 12 days; never fulfill from AliExpress.",
            "For bulk: Alibaba supplier >1yr in business, always order samples, use a 3PL.",
        ]
        summary = self._llm_summary(
            f"Recommend a fulfillment strategy for '{brief.name}' at ~{projected} "
            "orders/day, from launch through the private-label transition."
        ) or (
            f"Fulfillment for {brief.name}: dropship via Zendrop (<=12d delivery); "
            f"{logistics['detail']}"
        )
        return AgentResult(self.pillar_id, summary, recs, computed)

    def peer_review(self, ctx: SharedContext) -> list[str]:
        me = ctx.upstream("logistics_brand_building")
        if me and me.computed.get("evaluation", {}).get("recommend_private_label"):
            return ["Logistics: projected volume crosses 15-20 orders/day — "
                    "coordinate with product team on bulk/private-label sourcing."]
        return []


# --------------------------------------------------------------------------- #
# The reviewer — checks every specialist's work against the playbook
# --------------------------------------------------------------------------- #
class ReviewerAgent(Agent):
    role = "Quality Reviewer / Playbook Auditor"

    @property
    def system_prompt(self) -> str:
        return (
            "You are a strict quality reviewer auditing another agent's work "
            "against The Million Dollar E-Commerce Playbook. You approve only if "
            "the work respects every hard rule and threshold. Otherwise you list "
            "the exact required fixes. Full playbook:\n"
            f"{json.dumps(PLAYBOOK, indent=2)}"
        )

    def review(self, result: AgentResult) -> Review:
        issues: list[str] = []
        fixes: list[str] = []

        # Deterministic, rule-based audit grounded in the computed tool output.
        if result.pillar == "product_selection":
            comp = result.computed
            if not comp.get("is_winner", False):
                for c in comp.get("checks", []):
                    if not c["passed"]:
                        issues.append(c["detail"])
                        fixes.append(f"Resolve failing criterion: {c['name']}.")
        elif result.pillar == "online_advertising":
            comp = result.computed
            if not comp.get("structure_valid", {}).get("follows_3_2_2", False):
                issues.append("Ad structure does not follow 3-2-2 ABO.")
                fixes.append("Use exactly 3 videos, 2 ad copies, 2 headlines.")
            if not comp.get("budget_check", {}).get("passed", False):
                issues.append("Start budget outside $30-$50/day.")
                fixes.append("Set starting daily budget to $30-$50.")
        elif result.pillar == "logistics_brand_building":
            ev = result.computed.get("evaluation", {})
            if not ev.get("passes", False):
                for c in ev.get("checks", []):
                    if not c["passed"]:
                        issues.append(c["detail"])
                        fixes.append(f"Fix logistics rule: {c['name']}.")
        elif result.pillar == "website_optimization":
            if result.computed.get("checklist_items", 0) < 5:
                issues.append("Conversion checklist incompletely applied.")
                fixes.append("Apply all conversion-checklist items.")

        # Generic completeness check applies to every pillar.
        if not result.recommendations:
            issues.append("No actionable recommendations produced.")
            fixes.append("Provide concrete, playbook-aligned recommendations.")

        approved = not fixes
        score = max(0.0, 100.0 - 20.0 * len(fixes))

        # If online, let Claude add qualitative critique on top of the rule audit.
        llm_note = self.llm.complete(
            system=self.system_prompt,
            user=(
                "Audit this agent result. Reply with any additional playbook "
                "violations not already listed, or 'OK'.\n"
                f"Result: {json.dumps(result.to_dict(), indent=2)}\n"
                f"Rule-based issues so far: {issues}"
            ),
            max_tokens=400,
        )
        if llm_note and llm_note.strip().upper() != "OK":
            issues.append(f"Reviewer note: {llm_note.strip()}")

        return Review(
            pillar=result.pillar,
            approved=approved,
            score=score,
            issues=issues,
            required_fixes=fixes,
        )


SPECIALISTS: list[type[Agent]] = [
    ProductResearchAgent,
    WebsiteOptimizationAgent,
    AdvertisingAgent,
    LogisticsAgent,
]
