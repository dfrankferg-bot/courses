# Ecom Wolf — Automated E-Commerce Launch Platform

A multi-agent platform that turns *The Million Dollar E-Commerce Playbook* into
an automated workflow. Specialized agents each own one pillar of the playbook, a
reviewer agent independently checks their work against the playbook's hard rules,
and an orchestrator runs the whole launch pipeline and produces a **GO / NO-GO**
decision.

Built on the **Anthropic SDK** — the same one taught elsewhere in this `courses`
repo. It runs with an API key for full LLM reasoning, or **offline** with zero
dependencies so the workflow is demonstrable without a key.

```
User product brief
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│                          ORCHESTRATOR                             │
│  per pillar: specialist ─▶ reviewer ─▶ (revise loop)             │
│  then: consensus round (all agents cross-check the whole plan)   │
└──────────────────────────────────────────────────────────────────┘
        │  reads/writes the SHARED CONTEXT (blackboard)  │
        ▼                                                ▼
Product ──▶ Website ──▶ Advertising ──▶ Logistics    Reviewer / Auditor
Research     Optim.     (FB 3-2-2)      & Branding    (checks each result)
   │ demand    │ margin    │ order-vol     │
   │ signal    │ aware     │ projection ───┘ sizes fulfillment
   ▼
Google Trends (free, no key)
        │
        ▼
  GO / NO-GO launch plan + consensus notes
```

### Collaboration model

The decision layer is **collaborative**, not a set of isolated opinions:

- **Shared blackboard** (`SharedContext`) is threaded through every agent.
- **Downstream dependencies**: the product agent publishes margin & net-per-unit;
  the ads agent consumes them and publishes a projected orders/day; the logistics
  agent sizes fulfillment (dropship vs. private-label) from that projection.
- **Consensus round**: after all pillars run, each agent inspects the *whole*
  plan (`peer_review`) and raises cross-pillar flags — e.g. the ads agent issues
  a **HALT** if the product failed selection. Blocking flags force a NO-GO.

## Why it's structured this way

The playbook says a store fails if any one of four pillars is off. So the
platform models **one agent per pillar**, and adds a **reviewer agent** that
audits each specialist against the playbook's exact thresholds. That is the
"agents perform tasks separately and check each other's work" design:

- **ProductResearchAgent** — validates the 4 winner criteria (real problem,
  demand, ≥50% margin, $100+ price/AOV).
- **WebsiteOptimizationAgent** — builds a conversion-optimized store plan
  (Debut theme, ≤3 colors, no pop-ups, benefit-led copy; target 3–8% CR).
- **AdvertisingAgent** — Facebook 3-2-2 ABO launch, $30–50/day start, KPI-gated
  scaling, viral-creative sourcing, unit economics.
- **LogisticsAgent** — dropshipping → private-label plan (≤12-day delivery, no
  AliExpress fulfillment, bulk switch at 15–20 orders/day).
- **ReviewerAgent** — independently re-checks every result and returns required
  fixes; the orchestrator loops the specialist until it passes.

Every numeric verdict is computed by the **deterministic tools** in
[`ecom_platform/tools.py`](./ecom_platform/tools.py) (profit margin, virality
check, unit-economics, logistics rules), so results are grounded — not
hallucinated — in both online and offline modes.

## Quick start

```bash
cd ecom_wolf_platform

# Offline mode — no key, no install needed:
python run.py --demo

# Your own product:
python run.py --name "Shiatsu Neck Massager" --niche wellness --price 129.99 --cogs 38

# Full machine-readable plan:
python run.py --demo --json

# Validate demand with a live (free) Google Trends signal:
pip install pytrends
python run.py --demo --live

# Shareable HTML report (self-contained, opens offline, light/dark):
python run.py --demo --report          # writes launch_report.html

# Local web UI (stdlib only — no extra installs):
python serve.py                        # open http://127.0.0.1:8321
```

Enable **online mode** (Claude reasons over the playbook and calls the tools):

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...
export ECOM_MODEL=claude-haiku-4-5-20251001   # optional; this is the default
python run.py --demo
```

## Layout

| Path | Purpose |
|------|---------|
| `playbook/playbook.md` | Human-readable structured extraction of the PDF |
| `playbook/playbook.json` | Machine-readable playbook the agents reason over |
| `ecom_platform/tools.py` | Deterministic formulas & rule checks (the ground truth) |
| `ecom_platform/agents.py` | 4 collaborative specialists + reviewer + consensus |
| `ecom_platform/orchestrator.py` | Pipeline with review/revise loop + consensus round |
| `ecom_platform/demand.py` | **Free** Google Trends demand integration (no key) |
| `ecom_platform/llm.py` | Anthropic SDK wrapper + offline fallback |
| `ecom_platform/schemas.py` | Shared data structures incl. `SharedContext` blackboard |
| `ecom_platform/report.py` | Self-contained HTML launch-report renderer |
| `run.py` | CLI entrypoint (`--report` writes the HTML report) |
| `serve.py` | Local web UI (Python stdlib only, binds 127.0.0.1) |
| `tests/test_platform.py` | Tests for tools, agents, reviewer, orchestrator, report |

## Integrations

| Integration | Status | Cost |
|-------------|--------|------|
| **Google Trends** (demand validation) | ✅ wired up (`demand.py`, `--live`) | Free, no key, no account |
| Kalodata (product research) | ⛔ not wired | Paid subscription required |
| Shopify Admin API (store setup) | ⛔ not wired | Requires a (paid) store + app credentials |
| Meta Marketing API (ads) | ⛔ not wired | Requires Business Manager + ad account |
| Zendrop / CJ / DSers (fulfillment) | ⛔ not wired | Requires supplier accounts |

The **Google Trends** integration is the one live data source in the playbook's
stack that is genuinely free with no signup — so it's the one wired up. It
replaces the hand-entered "shows demand" boolean with a real interest-over-time
signal. Everything degrades gracefully: no `pytrends`, no network, or a rate
limit → the platform falls back to the brief's value and keeps running.

The remaining playbook tools all require paid subscriptions or vendor accounts,
so they're intentionally left as clean seams: add a client to `demand.py`-style
modules and expose it to the relevant agent. Per the request, nothing here needs
payment to run.

## Scope & honest caveats

This automates the **decision and planning** workflow of the playbook: it
validates products (now with live demand data), generates playbook-compliant
plans per pillar, and has the agents collaborate and cross-check each other. It
does **not** place real orders or spend real ad budget — those actions require
the paid vendor accounts above.

The playbook itself is third-party marketing material; this platform encodes its
stated rules without endorsing its financial claims.
