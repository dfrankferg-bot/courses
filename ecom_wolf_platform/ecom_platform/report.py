"""Render a LaunchPlan as a self-contained HTML report.

No external assets, fonts, or scripts — the file opens offline in any browser
and adapts to light/dark mode. Used by ``run.py --report`` and by the local
web UI in ``serve.py``.
"""

from __future__ import annotations

import html
from typing import Any

from .schemas import LaunchPlan

PILLAR_TITLES = {
    "product_selection": "Product Selection",
    "website_optimization": "Website Optimization",
    "online_advertising": "Online Advertising",
    "logistics_brand_building": "Logistics & Brand Building",
}

_CSS = """
:root {
  --bg: #f7f6f3; --card: #ffffff; --ink: #1f2430; --muted: #6b7280;
  --line: #e4e2dc; --go: #1a7f4e; --go-bg: #e3f4ea; --nogo: #b3382c;
  --nogo-bg: #fbe9e6; --warn: #8a6d1a; --warn-bg: #faf3dc; --accent: #2f5d8a;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #16181d; --card: #1f232b; --ink: #e8e9ec; --muted: #9aa1ad;
    --line: #2e333d; --go: #4cc38a; --go-bg: #16301f; --nogo: #e5786a;
    --nogo-bg: #33201c; --warn: #d9b64a; --warn-bg: #2e2914; --accent: #7aa7d1;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0; padding: 2rem 1rem; background: var(--bg); color: var(--ink);
  font: 16px/1.55 Georgia, 'Times New Roman', serif;
}
.wrap { max-width: 880px; margin: 0 auto; }
h1 { font-size: 1.7rem; margin: 0 0 .25rem; }
h2 { font-size: 1.15rem; margin: 0 0 .5rem; }
.sub { color: var(--muted); margin: 0 0 1.5rem; font-size: .95rem; }
.banner {
  border-radius: 10px; padding: 1rem 1.25rem; margin: 0 0 1.5rem;
  font-size: 1.2rem; font-weight: bold; border: 1px solid var(--line);
}
.banner.go { background: var(--go-bg); color: var(--go); }
.banner.nogo { background: var(--nogo-bg); color: var(--nogo); }
.banner small { display: block; font-weight: normal; font-size: .85rem; margin-top: .3rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; }
.card {
  background: var(--card); border: 1px solid var(--line); border-radius: 10px;
  padding: 1rem 1.15rem;
}
.card .score { float: right; font-size: .85rem; color: var(--muted); }
.badge {
  display: inline-block; font-size: .75rem; padding: .1rem .55rem;
  border-radius: 999px; vertical-align: middle; margin-left: .4rem;
}
.badge.ok { background: var(--go-bg); color: var(--go); }
.badge.bad { background: var(--nogo-bg); color: var(--nogo); }
.card p.summary { color: var(--muted); font-size: .92rem; margin: .4rem 0 .6rem; }
ul { margin: .4rem 0 0; padding-left: 1.2rem; }
li { margin: .25rem 0; font-size: .92rem; }
li.fix { color: var(--nogo); }
.section { margin-top: 1.75rem; }
.flag {
  background: var(--warn-bg); color: var(--warn); border: 1px solid var(--line);
  border-radius: 8px; padding: .6rem .9rem; margin: .4rem 0; font-size: .92rem;
}
table.facts { width: 100%; border-collapse: collapse; margin-top: .5rem; }
table.facts td { padding: .35rem .5rem; border-bottom: 1px solid var(--line); font-size: .92rem; }
table.facts td:first-child { color: var(--muted); width: 45%; }
footer { margin-top: 2.5rem; color: var(--muted); font-size: .8rem; }
"""


def _e(value: Any) -> str:
    return html.escape(str(value))


def _fact_rows(pairs: list[tuple[str, str]]) -> str:
    rows = "".join(
        f"<tr><td>{_e(k)}</td><td>{_e(v)}</td></tr>" for k, v in pairs
    )
    return f'<table class="facts">{rows}</table>'


def _pillar_card(plan: LaunchPlan, pillar_id: str) -> str:
    result = plan.results[pillar_id]
    review = plan.reviews[pillar_id]
    badge = (
        '<span class="badge ok">APPROVED</span>'
        if review.approved
        else '<span class="badge bad">NEEDS WORK</span>'
    )
    recs = "".join(f"<li>{_e(r)}</li>" for r in result.recommendations)
    fixes = "".join(
        f'<li class="fix">Required: {_e(f)}</li>' for f in review.required_fixes
    )
    return (
        '<div class="card">'
        f'<span class="score">{review.score:.0f}/100</span>'
        f"<h2>{_e(PILLAR_TITLES.get(pillar_id, pillar_id))}{badge}</h2>"
        f'<p class="summary">{_e(result.summary)}</p>'
        f"<ul>{recs}{fixes}</ul>"
        "</div>"
    )


def render_report(plan: LaunchPlan) -> str:
    """Return the full HTML document for a launch plan."""
    p = plan.product
    is_go = plan.go_no_go == "GO"
    notes = " ".join(plan.notes)
    banner = (
        f'<div class="banner {"go" if is_go else "nogo"}">'
        f"DECISION: {_e(plan.go_no_go)}<small>{_e(notes)}</small></div>"
    )

    product_eval = plan.results["product_selection"].computed
    facts: list[tuple[str, str]] = [
        ("Niche", p.niche),
        ("Selling price", f"${p.selling_price:,.2f}"),
        ("Cost of goods", f"${p.cogs:,.2f}"),
        ("Profit margin", f"{product_eval.get('profit_margin', 0):.0%} (playbook floor: 50%)"),
        ("Monthly profit target", f"${p.target_monthly_profit:,.0f}"),
    ]
    ads = plan.results.get("online_advertising")
    if ads:
        units = ads.computed.get("unit_economics", {}).get("units_per_day")
        if units is not None:
            facts.append(("Units/day needed for target", str(units)))
    demand = plan.signals.get("demand")
    if demand:
        if demand.get("available") and demand.get("has_data"):
            facts.append((
                "Live demand (Google Trends)",
                f"avg interest {demand['avg_interest']}, trend {demand['trend']}",
            ))
        else:
            facts.append((
                "Live demand (Google Trends)",
                f"unavailable ({demand.get('reason', 'no data')}) — used brief value",
            ))

    cards = "".join(_pillar_card(plan, pid) for pid in plan.results)

    if plan.consensus:
        flags = "".join(f'<div class="flag">⚑ {_e(f)}</div>' for f in plan.consensus)
    else:
        flags = '<div class="flag" style="background:var(--go-bg);color:var(--go)">✓ No cross-pillar conflicts raised in the consensus round.</div>'

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Launch Plan — {_e(p.name)}</title>
<style>{_CSS}</style>
</head>
<body>
<div class="wrap">
  <h1>Launch Plan: {_e(p.name)}</h1>
  <p class="sub">Generated by the Ecom Wolf automated platform — four specialist
  agents, one reviewer, one consensus round.</p>
  {banner}
  <div class="card">
    <h2>Product Brief</h2>
    {_fact_rows(facts)}
  </div>
  <div class="section">
    <h2>Pillar Verdicts</h2>
    <div class="grid">{cards}</div>
  </div>
  <div class="section">
    <h2>Consensus Round</h2>
    {flags}
  </div>
  <footer>Rules and thresholds from “The Million Dollar E-Commerce Playbook”
  (structured in playbook/playbook.json). Numeric verdicts computed by
  deterministic tools, not model guesses.</footer>
</div>
</body>
</html>
"""


def write_report(plan: LaunchPlan, path: str) -> str:
    """Render and write the report; returns the path."""
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(render_report(plan))
    return path
