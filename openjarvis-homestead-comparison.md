# OpenJarvis vs. Homestead (Jarvis) — Architecture Comparison

**Date:** 2026-07-26

Comparison of Stanford's [OpenJarvis](https://github.com/open-jarvis/OpenJarvis) against the
Homestead "Jarvis" house-manager build, with prioritized recommendations.

> **Note on repo placement.** This document lives in a fork of `anthropics/courses`, which is
> unrelated to both systems described. It is filed here only because this branch was the
> designated workspace. It belongs in the `house-manager` repo.

---

## 1. Provenance — what was actually verified

Sources are separated by how they were obtained, because network egress in the analysis
environment blocked most hosts and several widely-repeated figures could not be confirmed.

### Read directly

| Source | Method | Notes |
|---|---|---|
| Blog post, "OpenJarvis: Personal AI, On Personal Devices" | Uploaded PDF, 8pp | Print-to-PDF; **0 link annotations** — all hyperlinks flattened |
| Docs landing page, `open-jarvis.github.io/OpenJarvis/` | Uploaded PDF, 16pp | Print-to-PDF; **0 link annotations** |
| `github.com/open-jarvis/OpenJarvis` | `git clone --depth 1` | 146 MB working tree |

### Not obtainable

| Source | Reason |
|---|---|
| `arxiv.org/abs/2605.17172` (the OpenJarvis paper) | Egress policy denied CONNECT |
| `intelligence-per-watt.ai` | Not fetched |
| `scalingintelligence.stanford.edu`, `ollama.com`, project site | Egress policy denied CONNECT |

### Claim status

| Claim | Status |
|---|---|
| Local LMs service **88.7%** of single-turn chat/reasoning queries at interactive latencies | **Verified in repo** — `README.md`, `docs/index.md` |
| Intelligence efficiency improved **5.3×**, 2023→2025 | **Verified in repo** — same files |
| Within **3.2 percentage points** of best cloud model | **UNVERIFIED** — absent from blog, docs, and all 146 MB of source |
| **~800×** lower marginal API cost per query | **UNVERIFIED** — same |
| **~4×** lower latency | **UNVERIFIED** — same |

The three unverified figures are attributable only to arXiv:2605.17172, which could not be
read. They circulate widely in secondary coverage and were incorrectly attributed to the blog
post by search engines. **Do not cite them without checking the paper.**

### Source-to-source discrepancies

**Author lists disagree.** The blog byline lists 9 authors including **John Hennessy**. The
BibTeX in both the docs site and the repo `README.md` lists 13 — adding Tanvir Bhathal, Andrew
Park, Matthew Hart, Caia Costello, and Chuan Li, and **omitting Hennessy**.

**Engine backend lists disagree across all three sources:**

| Source | Claimed backends |
|---|---|
| Blog | Ollama, vLLM, SGLang, llama.cpp, Apple Foundation Models, Exo, Nexa, Mirai Uzu |
| Docs | "10+" — Ollama, vLLM, SGLang, llama.cpp, MLX, Exo, LiteLLM, cloud |
| Code (`src/openjarvis/engine/`) | `ollama.py`, `cloud.py`, `litellm.py`, `apple_fm_shim.py`, `nexa_shim.py`, `gemma_cpp.py`, `openai_compat_engines.py`, `multi.py` |

vLLM, SGLang, and llama.cpp have no dedicated modules. They are most likely reached through the
OpenAI-compatible path, since vLLM and SGLang both serve OpenAI-shaped endpoints — *inferred
from file layout, not confirmed*. "Mirai Uzu" appears in the blog and nowhere else.

---

## 2. OpenJarvis — what it actually is

Apache 2.0. Research framework from Hazy Research + Scaling Intelligence Lab (Stanford SAIL),
part of the Intelligence Per Watt initiative. Stated ambition: "a research platform and
production foundation for local AI, in the spirit of PyTorch."

**Scale:** 664 Python files, 124 Rust files, 629 test files. The Rust workspace — 17 crates —
is not mentioned in the blog post at all.

```
rust/crates/  openjarvis-{core,engine,agents,learning,mcp,a2a,telemetry,traces,
              skills,scheduler,security,sessions,tools,workflow,recipes,
              templates,python}
```

### The five primitives

1. **Intelligence** — unified catalog over Qwen, GPT-OSS, Gemma, Granite, GLM, Kimi. Declare
   the capability needed; it resolves what the hardware supports.
2. **Engine** — inference runtime abstraction. `jarvis init` auto-detects hardware,
   `jarvis doctor` validates the setup.
3. **Agents** — 8 built-in types: `morning_digest`, `deep_research`, `monitor_operative`,
   `orchestrator`, `native_react`, `operative`, `native_openhands`, `simple`. Across three
   execution modes (on-demand, scheduled, continuous). Novel roles are **Orchestrator**
   (decompose + delegate) and **Operative** (lightweight recurring executor).
4. **Tools & Memory** — native MCP, Google A2A for inter-agent comms, local semantic indexing,
   26+ messaging channels.
5. **Learning** — traces drive closed-loop optimization.

### Efficiency instrumentation — the genuinely differentiated part

Hardware-agnostic telemetry profiling energy across NVIDIA (NVML), AMD, and Apple Silicon
(powermetrics) at **50 ms sampling**. `jarvis bench` standardizes latency, throughput, and
energy-per-query. Energy and dollar cost are design constraints from the start rather than
reporting added later.

### Four-layer optimization

| Layer | Techniques |
|---|---|
| Model weights | SFT, GRPO, DPO, RLHF |
| LM prompts | DSPy |
| Agentic logic | GEPA — task decomposition, tool selection, sub-agent coordination |
| Inference engine | Quantization selection, batch scheduling, kernel config |

Explicitly targets the trace signatures that distinguish personal AI: long-horizon sessions,
persistent cross-session context, non-stationary user preferences.

### Findings not present in the blog or docs

**`src/openjarvis/agents/claude_code.py`** wraps the Claude Agent SDK, spawning a Node
subprocess against `@anthropic-ai/claude-code` over JSON stdin/stdout. Its docstring states the
engine parameter is ignored because "inference is handled entirely by the Claude Agent SDK."
There is also `opencode.py`.

**`src/openjarvis/agents/hybrid/`** is a local-vs-cloud comparison harness — `baseline_local.py`,
`baseline_cloud.py`, `_energy.py`, `_prices.py` — with six paradigms (`minions`, `conductor`,
`archon`, `advisors`, `skillorchestra`, `toolorchestra`) benchmarked on GAIA and
SWE-bench-Verified. This is almost certainly the machinery behind the unverified headline
numbers.

Its README is candid: these ports are **inference-only**, none modify weights, trained variants
"stay TODOs," and prompted lower-bounds reach "80-90% of the headline accuracy." Published
figures may therefore reflect trained variants the shipped code does not implement.

**Consequence:** between `claude_code.py`, `cloud.py`, `litellm.py`, and the hybrid harness, the
accurate description is **local-first with first-class cloud paths** — not "runs entirely
on-device." The marketing framing is directional, not literal.

---

## 3. Homestead (Jarvis) — as described

> Source: handoff notes, not code review. The repo was not accessible from the analysis
> environment. Items below are unverified against the source.

**Stack:** npm workspaces — `services/api` (Fastify), `apps/mobile` (Expo/React Native),
`packages/shared`. TypeScript end to end.

**Working:**
- Chat + voice assistant, streamed replies with live "thinking" status, data cards grounded in
  the household store, TTS out, butler personality
- Inference: Groq free tier (Llama 3.3 70B) default; Anthropic Claude via `ASSISTANT_PROVIDER=anthropic`
- Aurora Nocturne theme app-wide; design tokens in `apps/mobile/src/theme.ts`
- Photo capture → home-server OCR (tesseract.js: auto-orient, upscale, grayscale, normalize,
  sharpen) → model classification → **preview-before-commit** → files a calendar event or
  memory note. Endpoints `/v1/ingestion/analyze` and `/v1/ingestion/analyze-text`
- 34 backend tests passing; backend + mobile typecheck clean

**Open:** native on-device OCR; let Jarvis reference filed documents; bearer-token auth per
family member + Tailscale + TestFlight.

---

## 4. Side by side

| Primitive | OpenJarvis | Homestead |
|---|---|---|
| **Intelligence** | Local catalog, hardware-aware selection | Groq Llama 3.3 70B; Claude via flag — **cloud only** |
| **Engine** | 10+ backends, auto-detect, health check | Two cloud providers behind `ASSISTANT_PROVIDER` |
| **Agents** | 8 types, Orchestrator + Operative | Single assistant loop + classifier |
| **Tools & Memory** | MCP, A2A, semantic index, 26+ channels | Household store, memory notes, calendar events |
| **Learning** | Traces → SFT/GRPO/DPO, DSPy, GEPA | None |

**Not a competitive overlap.** OpenJarvis is a framework; Homestead is a working product with a
themed RN client, a document ingestion pipeline, and a household data model — none of which
OpenJarvis attempts. Two of the gaps above are not worth closing: 8 agent types and A2A are
framework generality a house manager would pay for and never use.

The one real divergence is that OpenJarvis treats **where inference runs** as a first-class,
swappable decision, and Homestead does not.

---

## 5. Central finding: the local/cloud seam sits in the wrong place

**OCR is local. Classification is not.**

tesseract.js on the home server, with a real preprocessing pipeline, is the local-first pattern
done correctly — the *image* never leaves the house. The extracted *text* is then sent to Groq
for classification.

For a house manager, that text is bills, medical letters, school forms, and insurance
documents. **The most sensitive artifact in the pipeline is the only part that leaves the
network.**

Two consequences:

1. Free-tier data-handling terms should be checked directly. Free tiers across the industry are
   commonly less protective than paid tiers regarding retention and training use. Groq's current
   terms were not reviewed for this document — verify rather than assume.
2. The planned native on-device OCR work is an **accuracy** improvement, not a privacy one. OCR
   was never the exposure.

---

## 6. Recommendations, in priority order

### 1. Move classification to a local model

Highest value, smallest diff. Classification is constrained structured extraction — is this
dated, what is the date, event or note — which is where small local models hold up best. This is
the 88.7% claim in its most favorable case.

Risk is low because **preview-before-commit already places a human check on every result**. The
failure mode is visible and cheap.

Mechanically this should be small: `ASSISTANT_PROVIDER` is already the right seam, and both Groq
and Ollama expose OpenAI-compatible APIs, so adding a `local` provider may approach a base-URL
swap in the existing client. Keep Groq/Claude for open-ended chat, where 70B earns its cost.

### 2. Start capturing traces now

Cheapest to add today, most expensive to retrofit. Every optimization loop is downstream of it.

Homestead has an advantage OpenJarvis lacks by default: **preview-before-commit produces a human
label on every ingestion** — accepted, edited, or rejected, with the correction attached. That is
a clean supervised dataset for the classifier accumulating at zero marginal cost. Log it now even
if unused for a year.

Worth logging per ingestion: input text, model + provider, raw output, user action, final
committed value, latency.

### 3. Reorder the open next steps → (2), (3), (1)

- **(2) Jarvis references filed documents** — highest user value. Filing only compounds if
  something reads back. This is the same work OpenJarvis calls semantic indexing.
- **(3) Auth + Tailscale + TestFlight** — the gate to a second real user. Tailscale is the same
  architectural bet: your data, your network.
- **(1) Native on-device OCR** — accuracy polish behind an EAS build. Least urgent.

### 4. Do not adopt OpenJarvis wholesale

Python plus a 17-crate Rust workspace against a TypeScript codebase. Rewriting is not
justifiable. If the engine layer is ever wanted, the integration path is `jarvis serve` — a
FastAPI server with SSE streaming, drop-in compatible with OpenAI clients. Point the existing
client at it; no agent logic changes.

### 5. Borrow the four-layer optimization taxonomy

Weights / prompts / agentic logic / engine. Homestead currently tunes prompts only, as most
builds do. Knowing the other three layers exist changes where to look when quality plateaus.

---

## 7. Open questions

- **arXiv:2605.17172** — do the headline comparison figures come from trained variants? The
  shipped hybrid harness is inference-only and its README says prompted lower-bounds reach
  80–90% of headline accuracy.
- **Groq free-tier terms** — retention and training-use policy for submitted text.
- **Homestead source review** — this comparison rests on handoff notes. A code review could
  change the recommendations, particularly around how tightly the provider seam is drawn.
