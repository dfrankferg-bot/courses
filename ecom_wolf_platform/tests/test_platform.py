"""Tests for the automated platform. Run offline (no API key required):

    python -m pytest ecom_wolf_platform/tests -q
    # or, without pytest:
    python ecom_wolf_platform/tests/test_platform.py
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ecom_platform import demand, tools
from ecom_platform.agents import (
    AdvertisingAgent,
    LogisticsAgent,
    ProductResearchAgent,
    ReviewerAgent,
    WebsiteOptimizationAgent,
)
from ecom_platform.llm import LLM
from ecom_platform.orchestrator import Orchestrator
from ecom_platform.schemas import ProductBrief, SharedContext


def test_profit_margin():
    assert abs(tools.profit_margin(150, 50) - 0.6667) < 1e-3


def test_evaluate_product_winner():
    r = tools.evaluate_product("Massager", 150, 50, True, True)
    assert r["is_winner"] is True
    assert r["verdict"] == "GREENLIGHT"


def test_evaluate_product_reject_low_margin():
    r = tools.evaluate_product("Cheap", 120, 90, True, True)  # 25% margin
    assert r["is_winner"] is False
    assert any(c["name"] == "margin_>=_50%" and not c["passed"] for c in r["checks"])


def test_evaluate_product_reject_low_price():
    r = tools.evaluate_product("Trinket", 40, 10, True, True)  # under $100
    assert r["is_winner"] is False


def test_virality_check():
    r = tools.virality_check(views=1_000_000, follower_count=5_000)
    assert r["viral_threshold"] == 200_000
    assert r["is_viral"] is True
    assert tools.virality_check(500_000, 300_000)["is_viral"] is False


def test_units_for_monthly_profit():
    r = tools.units_for_monthly_profit(6000, 45)
    assert round(r["units_per_day"], 1) == 4.4


def test_logistics_rejects_aliexpress():
    r = tools.evaluate_logistics(delivery_days=10, orders_per_day=5, source="AliExpress")
    assert r["passes"] is False


def test_logistics_recommends_bulk():
    r = tools.evaluate_logistics(delivery_days=8, orders_per_day=20, source="Zendrop")
    assert r["passes"] is True
    assert r["recommend_private_label"] is True


def test_ad_structure_322():
    assert tools.evaluate_ad_structure(3, 2, 2)["follows_3_2_2"] is True
    assert tools.evaluate_ad_structure(4, 2, 2)["follows_3_2_2"] is False


def _brief(**kw):
    base = dict(name="Test", niche="wellness", selling_price=150, cogs=50)
    base.update(kw)
    return ProductBrief(**base)


def test_reviewer_approves_winner():
    llm = LLM()  # offline unless key present
    agent = ProductResearchAgent(llm)
    result = agent.run(_brief())
    review = ReviewerAgent(llm).review(result)
    assert review.approved is True
    assert review.score == 100


def test_reviewer_rejects_loser():
    llm = LLM()
    agent = ProductResearchAgent(llm)
    result = agent.run(_brief(selling_price=120, cogs=90))  # 25% margin
    review = ReviewerAgent(llm).review(result)
    assert review.approved is False
    assert review.required_fixes


def test_all_specialists_produce_recommendations():
    llm = LLM()
    for cls in (ProductResearchAgent, WebsiteOptimizationAgent, AdvertisingAgent, LogisticsAgent):
        result = cls(llm).run(_brief())
        assert result.recommendations, f"{cls.__name__} produced no recommendations"


def test_orchestrator_go():
    plan = Orchestrator(verbose=False).run(_brief())
    assert plan.go_no_go == "GO"
    assert set(plan.results) == {
        "product_selection", "website_optimization",
        "online_advertising", "logistics_brand_building",
    }


def test_orchestrator_no_go_on_bad_product():
    plan = Orchestrator(verbose=False).run(_brief(selling_price=120, cogs=90))
    assert plan.go_no_go == "NO-GO"


# --- Collaboration ---------------------------------------------------------
def test_advertising_publishes_projection_to_context():
    ctx = SharedContext(brief=_brief())
    AdvertisingAgent(LLM()).run(_brief(), ctx=ctx)
    assert "projected_units_per_day" in ctx.signals


def test_logistics_consumes_ad_projection():
    """Logistics should size fulfillment from the ad team's shared projection."""
    ctx = SharedContext(brief=_brief())
    ctx.signals["projected_units_per_day"] = 25  # simulate high projected volume
    result = LogisticsAgent(LLM()).run(_brief(), ctx=ctx)
    assert result.computed["projected_orders_per_day"] == 25
    assert result.computed["evaluation"]["recommend_private_label"] is True


def test_consensus_flags_ads_on_failed_product():
    """The ad agent must raise a HALT flag if the product failed selection."""
    plan = Orchestrator(verbose=False).run(_brief(selling_price=120, cogs=90))
    assert any("HALT" in f for f in plan.consensus)
    assert plan.go_no_go == "NO-GO"


def test_product_publishes_margin_signal():
    ctx = SharedContext(brief=_brief())
    ProductResearchAgent(LLM()).run(_brief(), ctx=ctx)
    assert "profit_margin" in ctx.signals and "net_per_unit" in ctx.signals


# --- Demand integration (offline / graceful fallback) ----------------------
def test_demand_classify_rising_shows_demand():
    r = demand._classify([10, 20, 30, 40, 55, 70])
    assert r["has_data"] is True
    assert r["trend"] == "rising"
    assert r["shows_demand"] is True


def test_demand_classify_declining_no_demand():
    r = demand._classify([80, 70, 40, 20, 10, 5])
    assert r["trend"] == "declining"
    assert r["shows_demand"] is False


def test_demand_signal_never_raises_offline():
    # Live signals disabled -> agent must not touch the network and must fall back.
    ctx = SharedContext(brief=_brief(), enable_live_signals=False)
    result = ProductResearchAgent(LLM()).run(_brief(), ctx=ctx)
    assert result.computed["is_winner"] is True
    assert "demand" not in ctx.signals  # no fetch attempted


# --- HTML report -----------------------------------------------------------
def test_report_renders_go_plan():
    from ecom_platform.report import render_report

    plan = Orchestrator(verbose=False).run(_brief(name="Massager <Pro>"))
    doc = render_report(plan)
    assert doc.startswith("<!doctype html>")
    assert "DECISION: GO" in doc
    assert "Massager &lt;Pro&gt;" in doc  # HTML-escaped product name
    assert all(t in doc for t in ("Product Selection", "Website Optimization",
                                  "Online Advertising", "Logistics"))


def test_report_renders_nogo_with_fixes():
    from ecom_platform.report import render_report

    plan = Orchestrator(verbose=False).run(_brief(selling_price=120, cogs=90))
    doc = render_report(plan)
    assert "DECISION: NO-GO" in doc
    assert "NEEDS WORK" in doc
    assert "Required:" in doc


def test_write_report(tmp_path=None):
    import os
    import tempfile
    from ecom_platform.report import write_report

    plan = Orchestrator(verbose=False).run(_brief())
    with tempfile.TemporaryDirectory() as d:
        path = write_report(plan, os.path.join(d, "r.html"))
        with open(path, encoding="utf-8") as fh:
            assert "DECISION: GO" in fh.read()


if __name__ == "__main__":
    funcs = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    passed = 0
    for fn in funcs:
        fn()
        print(f"  ok  {fn.__name__}")
        passed += 1
    print(f"\n{passed}/{len(funcs)} tests passed.")
