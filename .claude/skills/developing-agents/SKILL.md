---
name: developing-agents
description: >-
  Playbook for designing agents and the loops that run them. Use when building,
  scheduling, or hardening an autonomous or long-running agent — anything that
  discovers its own work, runs on a timer, spawns sub-agents, verifies its own
  output, or runs while you sleep. Covers the five moves of a loop, the six parts
  that implement them, the generator/evaluator split, the anti-patterns to avoid,
  and the costs to cap. Based on the Loop Engineering playbook (Osmani,
  Rajasekaran, Kaliski; June 2026).
---

# Developing Agents: Loop Engineering

## The core shift

Stop prompting the agent line by line. Design the **system that prompts it**.

A single agent run is a *harness* problem (tools, actions, what counts as done).
Making that run repeat — on its own, unattended, feeding its own output back in —
is a *loop* problem, one floor above. This skill is about the loop floor.

The one sentence to keep: **build the loop, but build it like someone who intends
to stay the engineer, not just the one who presses go.** A loop makes generation
nearly free; judgment stays scarce. The same loop, built by two people, can yield
opposite outcomes — the difference is one or two checkpoints, not the code.

**Why this is high-stakes:** the cost of a mistake scales with the number of turns
it survives before someone catches it, and a loop is, by construction, a machine
for maximizing turns. A bad assumption gets written to the state file, read back
as fact, and built upon for days. Everything below exists to shorten the distance
between a mistake and its discovery.

---

## The four-layer stack (know which layer you're on)

| Layer | Minds | Core question |
|-------|-------|---------------|
| Prompt | The words for the model | What do I say? |
| Context | What's in the window now | What to retrieve / summarize / clear? |
| Harness | Arming a single run | Which tools, which actions, what is "done"? |
| **Loop** | **Scheduling the harness** | **How does it run itself, over and over?** |

If the work is "make one run succeed," you're below the loop layer — fix it there.
You're doing loop engineering only when the agent **runs on a timer, spawns
helpers, and feeds its own output back as next round's input.**

---

## The five moves (drop one and the loop won't turn)

Every turn of a loop does five concrete things. Missing any one is an anti-pattern
(see below).

1. **Discovery** — the loop finds its *own* work (reads CI failures, open issues,
   recent commits, an inbox). Don't hand it a list; let it surface work.
   Discovery sets the ceiling on the whole loop's quality. **Put discovery logic
   in a skill, not a wall of text glued into a cron job nobody will update.**
2. **Handoff** — pass each task to the agent that does it, **isolated**. One git
   worktree per finding so parallel agents don't collide. Cut tasks cleanly →
   verification and merging stay easy.
3. **Verification** — swap in a *different* agent to say "no" (see next section).
   This is the move people cut corners on and the one least affordable to skip.
   A loop without a real check is an agent nodding at itself.
4. **Persistence** — land results where they survive the conversation: a PR, an
   updated ticket, an inbox for what can't be handled, a **state file on disk**.
   The agent forgets; the repo does not.
5. **Scheduling** — a real trigger (timer or event) that doesn't depend on a human
   remembering. This is what makes one run into a loop. The state file lets
   unfinished work carry to the next turn.

---

## The six parts (what implements the moves)

| Part | What it is | Implements |
|------|-----------|------------|
| Automations | Runs off a schedule / trigger; should invoke a named skill | Scheduling |
| Worktrees | Isolated git working dirs for parallel agents | Handoff |
| Skills | Project knowledge made permanent in `SKILL.md`; pays off intent debt | Discovery |
| Connectors (MCP) | Hook the loop to issue trackers, DBs, Slack, staging APIs | Persistence / Discovery |
| Sub-agents | Generator separated from judge | Verification |
| Memory | Persistent state on disk (markdown / board), distinct from context | Persistence |

Memory ≠ context. Context is what the agent sees this round and is flushed on
refresh; memory persists across rounds and days.

---

## The hardest part: generator vs. evaluator

An agent asked to grade its own output **praises it**, even when quality is plainly
mediocre. This is structural, not a smarts problem: the context that wrote the code
is full of the reasons it was written that way, so the author sees its own chain of
self-persuasion, not the result. Inside a loop this compounds every round.

The fix is structural, four steps:

1. **Separate generation from judgment.** A *different* agent reviews — different
   instructions, ideally a **different model** (same model + new instructions keeps
   its blind spots). Tuning a standalone skeptic is far more tractable than making
   an author critical of its own work.
2. **Default the evaluator to doubt.** Tell it to *assume the code is broken until
   proven otherwise. Do not praise. Find what fails.*
3. **Make the evaluator act, not just read.** Run it, run the tests and paste real
   output, hit the page via Playwright/MCP (click, screenshot, inspect the DOM).
   Judge *behavior*, not "this looks right."
4. **Hand the final say to a fresh model** on an explicit stop condition (the
   maker–checker principle — the one entering a transfer and the one approving it
   must differ).

In Claude Code this is `/goal <condition>`: a small fast model checks the condition
after each turn; if unmet, another turn runs. (Don't confuse `/goal` with `/loop`,
which merely reruns on an interval.) A representative evaluator agent:

```
# .claude/agents/reviewer.md
ROLE: Adversarial code reviewer.
ASSUME: this code is BROKEN until proven otherwise. DO NOT praise. Find what fails.
CHECK, in order:
  1. Does it run? (execute, don't read)
  2. Tests: run them, paste real output.
  3. Edge cases the author skipped.
  4. Does behavior match the ticket?
USE Playwright MCP: open the page, click, screenshot, inspect the DOM.
VERDICT: PASS only if every check holds. Otherwise REJECT + list each reason.
```

**A loop's floor is its evaluator.** The generator decides what a loop *can*
produce; the evaluator decides what it *won't*.

---

## The five anti-patterns (each = one move skipped)

Audit any loop against these:

- **Nodding loop** (verification skipped) — agent grades its own work; never once
  says "no" across hundreds of turns. Fix: generator/evaluator split.
- **Amnesiac loop** (persistence skipped) — results live only in a flushed context
  window; each morning starts from zero. Fix: a state file on disk.
- **Manual loop** (scheduling skipped) — impressive the day it's built, silently
  stops the day attention wanders. Fix: a real timer/event trigger.
- **Blind loop** (discovery skipped) — human still hands it the work each morning;
  only the doing is automated, not the finding (often the expensive part). Fix:
  teach discovery into a skill.
- **Tangled loop** (handoff skipped) — parallel agents share one directory and
  their edits collide. Looks fine with one agent; breaks the first morning five run
  at once. Fix: one isolated worktree per task.

The hasty loop installs only discovery and handoff (the two that produce *visible*
output) and skips the three that produce *safety*.

---

## First-loop checklist (start small — all six, even tiny)

The first two decide whether the loop *runs*; the last four decide whether it gets
into *trouble*. Most beginners ship with only the first two.

| Element | Ask yourself |
|---------|--------------|
| Discovery source | What does it read on a timer? (CI / issues / commits / inbox) |
| State file | Which disk file holds the cross-round memory? |
| Evaluator | Is there an independent check that can say "no"? |
| Isolation | Does each parallel agent get its own worktree? |
| Token cap | Did you set a spending ceiling? Who stops it if it runs off? |
| Human review | Which step pauses for a human, rather than auto-ing all the way through? |

**Grow safely:** add parallelism *last*, after the checks are proven. Increase what
the loop *discovers* before increasing how much it does in *parallel*. A loop earns
the right to run more agents by first demonstrating it can stop a single bad one.

### A complete, annotated first loop

```yaml
# 1. SCHEDULING — a real trigger (.github/workflows/triage.yml)
on:
  schedule:
    - cron: '0 6 * * *'        # 06:00 daily, in the cloud
```
```bash
# 2. DISCOVERY — a skill, not a wall of text
claude --skill morning-triage

# 3. PERSISTENCE — the skill writes ./state/triage.md and commits it back

# 4. HANDOFF — one worktree per finding
for finding in $(parse ./state/triage.md); do
  claude --worktree "fix/$finding" \
         --goal "tests pass and lint is clean" \
         "draft a fix for $finding"
done

# 5. VERIFICATION — /goal's stop check runs after each turn; a reviewer agent picks holes
# 6. HUMAN REVIEW — PRs are opened, never auto-merged; anything uncertain lands in ./inbox/
```

A loop with all six, even a tiny one, is a real loop. Missing any is one of the
five failures wearing a disguise.

---

## The four costs (silent while the loop runs — cap them up front)

| Cost | What accrues | Guard |
|------|--------------|-------|
| Verification debt | Unverified output in the gap between "runs" and "right" | Independent evaluator (a *different* agent) |
| Comprehension rot | Code ships faster than you understand it | Read a representative sample daily; force yourself to *explain* each change |
| Cognitive surrender | You stop having an opinion and just take what it hands back | Keep one rule: the loop can *execute*, it cannot *decide* |
| Token blowout | Helpers, retries, all-night idle spins → a surprise bill | Hard caps set *before* shipping: per-run budget, daily budget, max retries |

They reinforce one another — unverified output erodes understanding, which invites
surrender, which lets the loop run longer and spend more, which produces more
unverified output. The guard against all four is the same: **keep a human capable
of saying "no," and install a check the human doesn't have to be awake to run.**

---

## Scheduling: local vs. cloud (it's mechanical, not taste)

One question: is the work glued to the local machine, or can it leave?

| | Cloud (Routines / CI schedule) | Desktop scheduled task | Local `/loop` |
|---|---|---|---|
| Machine on? | no | yes | yes |
| Session open? | no | no | yes |
| Min interval | ~1 h | ~1 min | ~1 min |
| Sees local files? | no | yes | yes |

- Must watch a local dev server every minute → **local** `/loop` (machine stays on).
- Should scan issues at 3 AM and open PRs → **cloud** (laptops get their lids
  closed). A mature loop often uses both: local for tight inner checks, cloud for
  the overnight sweep. Local rerun is "a few extra rounds while I'm here"; cloud is
  "run even when I'm not" — don't conflate them.

---

## Same capabilities, two toolchains

Loop engineering is a set of capabilities, not a product. Ask whether all six are
present, not which brand of command provides them.

| Capability | Claude Code | Codex |
|---|---|---|
| Scheduling | `/loop` / worker | Automations tab |
| Run until met | `/goal` | automation rerun + judge |
| Parallel isolation | `--worktree` | background worktree |
| Sub-agents | `.claude/agents/` | `.codex/agents/` |
| External connection | MCP + plugins | MCP connector |
| Explicit skill | `SKILL.md` | `$skill-name` |
| Machine-off run | Cloud Routines | cloud (planned) |

---

## Standing disciplines

1. **Read a sample, always.** Not everything — a representative sample, every day,
   and explain each sampled change. Inability to explain = your mental map has
   fallen behind. Cheaper to find on a quiet morning than in a production incident.
2. **Cap before you ship.** Set per-run budget, daily budget, max retries *before*
   the first unattended run. Caps are circuit breakers that turn an open-ended risk
   into a bounded one — a loop without caps has delegated spending authority to its
   own bugs.
3. **Keep one door open.** Build at least one human checkpoint — not because the
   human always intervenes, but because the pause keeps them *able to*. Weld every
   door shut and on the day you must go in, you no longer hold the key.

The playbook is less about building loops (that part is easy now) and more about
remaining the kind of engineer who can still answer, on any morning, whether the
thing the loop just did was actually right.
