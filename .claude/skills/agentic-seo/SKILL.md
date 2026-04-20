---
name: agentic-seo
description: Audit documentation and websites for Agentic Engine Optimization (AEO) — how readable they are to AI coding agents (Claude Code, Cursor, Cline, Aider). Use when the user wants to score a site/docs for AI-agent readiness, generate llms.txt / AGENTS.md / skill.md scaffolds, fix low AEO scores, or wire AEO checks into CI. Triggers on phrases like "AEO", "agentic SEO", "llms.txt", "make my docs LLM-friendly", or "audit for AI agents".
---

# agentic-seo

Wraps the [`agentic-seo`](https://github.com/addyosmani/agentic-seo) CLI (by Addy Osmani) to audit a site or docs build for how well AI coding agents can consume it. Agents fetch single HTTP responses, strip HTML, count tokens, and either keep your content as context or silently discard it — this skill checks for that and fixes the gaps.

Requires Node.js >= 18. Run via `npx agentic-seo` (no install needed) or `npm install -g agentic-seo`.

## When to use

- User asks to audit a docs site / static site for AI agent readiness, AEO, or LLM-friendliness.
- User mentions `llms.txt`, `AGENTS.md`, `CLAUDE.md`, `skill.md`, or "copy for AI" buttons.
- User wants a CI gate on AI-readability of their published docs.
- User has a low score from another tool and wants to fix it.

Do NOT use for traditional SEO (Google ranking, keywords, backlinks) — this is purely about machine consumption by coding agents.

## Workflow

Make a todo list and work through it step by step.

### 1. Identify the target

Ask (or infer) what to audit:
- **Static build directory** (e.g. `./build`, `./dist`, `./_site`) — pass the path directly.
- **Live URL** — use `--url`.
- **Local dev server needed** (e.g. Next.js, Astro) — use `--serve <buildDir>` so the tool spins up an HTTP server and crawls it.

### 2. Run the audit

```bash
npx agentic-seo ./build                     # audit a static dir
npx agentic-seo --url https://docs.example.com
npx agentic-seo --serve ./out               # start server then audit
npx agentic-seo --json --threshold 80       # CI mode, exit 1 if < 80%
npx agentic-seo --checks llms-txt,robots-txt   # subset
npx agentic-seo --verbose                   # include info-level findings
```

Flags: `--url/-u`, `--serve/-s`, `--json`, `--verbose/-v`, `--threshold/-t`, `--checks`, `--output-dir`.

### 3. Read the report

Score is out of 100, graded A (90+) → F (<40), across five categories:

| Category | Pts | Checks |
|---|---|---|
| Discovery | 25 | `robots-txt` (10), `llms-txt` (10), `agents-md` (5) |
| Content Structure | 25 | `content-structure` (15), `markdown-availability` (10) |
| Token Economics | 25 | `token-budget` (15), `meta-tags` (10) |
| Capability Signaling | 15 | `skill-md` (10), `agent-permissions` (5) |
| UX Bridge | 10 | `copy-for-ai` (10) |

Walk the failing checks in priority order: Discovery → Content Structure → Token Economics → Capability Signaling → UX Bridge. Discovery failures are usually the cheapest fixes with the biggest score lift.

### 4. Fix gaps

For scaffolding missing files, run from the project root:

```bash
npx agentic-seo init      # creates llms.txt, AGENTS.md, skill.md, agent-permissions.json
```

Then customize the generated files — defaults are placeholders. Common manual fixes:

- **`robots-txt` failing**: add explicit `Allow` rules for `GPTBot`, `ClaudeBot`, `Claude-Web`, `PerplexityBot`, `Google-Extended` rather than relying on `User-agent: *`.
- **`llms-txt` failing**: at site root, list important pages with one-line descriptions and approximate token counts. See https://llmstxt.org for the spec.
- **`agents-md` failing**: add `AGENTS.md` (or `CLAUDE.md`) at repo root with project context, build/test commands, conventions.
- **`content-structure` failing**: enforce a single `<h1>`, sequential heading levels, semantic tags (`<article>`, `<section>`, `<nav>`), code blocks with language tags, real `<table>` markup over CSS grids.
- **`markdown-availability` failing**: serve a `.md` source for each rendered HTML page (e.g. `/docs/foo` AND `/docs/foo.md`), or expose a "View raw" link.
- **`token-budget` failing**: split pages above ~10k tokens; the report names the offenders.
- **`meta-tags` failing**: add `<meta name="ai-content-type">`, `<meta name="token-count">`, OpenGraph tags.
- **`skill-md` failing**: add a `skill.md` describing what an agent can do on this site (capabilities, inputs, constraints).
- **`agent-permissions` failing**: add `agent-permissions.json` with rate limits and allowed/denied actions.
- **`copy-for-ai` failing**: add a "Copy for AI" / "Copy as Markdown" button on doc pages, or link to the raw `.md`.

### 5. Re-audit and verify

Re-run the same command and confirm the score moved. For CI, commit a script like:

```bash
npx agentic-seo --url "$DOCS_URL" --json --threshold 80 > aeo-report.json
```

## Programmatic use

```js
import { audit, auditWithServer } from 'agentic-seo';

const report = await audit('./build');
console.log(report.grade, report.percentage);
```

Use this when wiring into a custom build step or test harness rather than CI shell.

## Configuration

Project-level config lives in `.aeorc.json` or an `"aeo"` key in `package.json`. Use it to pin `output-dir`, restrict `checks`, or set a default `threshold` so contributors get consistent results.

## Notes

- The tool is opinionated about agent consumption, not human readability — a high AEO score does not replace UX review.
- `init` only creates files that are missing; it won't overwrite existing ones, so re-running is safe.
- Scores can shift between runs if the target is a live URL with changing content; pin a build for reproducible CI.
