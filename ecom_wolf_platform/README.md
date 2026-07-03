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
┌─────────────────────────────────────────────────────────────┐
│                       ORCHESTRATOR                            │
│   for each pillar:  specialist ──▶ reviewer ──▶ (revise loop) │
└─────────────────────────────────────────────────────────────┘
   │            │              │                 │
   ▼            ▼              ▼                 ▼
Product     Website        Advertising       Logistics
Research    Optimization   (FB 3-2-2)        & Branding
   \            \              /                 /
    \────────────  Reviewer / Playbook Auditor ─┘   (checks each agent's work)
                        │
                        ▼
                  GO / NO-GO launch plan
```

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
| `ecom_platform/agents.py` | 4 specialist agents + the reviewer |
| `ecom_platform/orchestrator.py` | Runs the pipeline with the review/revise loop |
| `ecom_platform/llm.py` | Anthropic SDK wrapper + offline fallback |
| `ecom_platform/schemas.py` | Shared data structures |
| `run.py` | CLI entrypoint |
| `tests/test_platform.py` | Tests for tools, agents, reviewer, orchestrator |

## Scope & honest caveats

This automates the **decision and planning** workflow of the playbook: it
evaluates products, generates playbook-compliant plans per pillar, and
cross-checks them. It does **not** place real orders or connect to Kalodata,
Shopify, Meta, or suppliers — those integrations would need real accounts,
credentials, and API access, and each vendor's live workflow. The architecture
leaves a clean seam for them: give each agent real tool functions in `tools.py`
(e.g. a Shopify Admin API client) and the same orchestration runs against live
systems.

The playbook itself is third-party marketing material; this platform encodes its
stated rules without endorsing its financial claims.
