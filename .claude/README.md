# Multi-agent task execution setup

This directory wires Claude Code / Cowork for the orchestrator fan-out
pattern: one coordinating Claude kicks off N tasks, and each task runs
through **implementer → verifiers → fixer** before results roll back up.

```
                 claude (orchestrator — your session)
              /            |             \
          task 1        task 2   ...   task N
             |             |              |
        implementer   implementer    implementer
           /   \         /   \          /   \
       verifier verifier ...  (2 adversarial lenses each)
           \   /
           fixer  (only if verifiers found real issues)
              \            |             /
                 returns results when done
```

## What's here

- `agents/implementer.md` — builds one well-scoped task end-to-end.
- `agents/verifier.md` — read-only skeptic; tries to refute that the task is
  done. Run 2+ per task with different lenses.
- `agents/fixer.md` — applies fixes for confirmed findings only.
- `workflows/fanout.js` — deterministic orchestration script that pipelines
  every task through the three roles with no idle barriers between tasks.

## How to run it

**Deterministic fan-out (the diagram, exactly):** in a Claude Code or Cowork
session say something like:

> Use a workflow: run the `fanout` workflow with these tasks:
> ["task one...", "task two...", "task three..."]

Workflows require that explicit opt-in ("use a workflow" / "run the fanout
workflow") because they can spawn many agents and burn a lot of tokens.
Watch live progress with `/workflows`.

**Ad-hoc fan-out (lighter weight):** just ask Claude to parallelize and name
the roles — e.g. "spawn an implementer subagent for each of these three
tasks, then verify each with the verifier agent." Claude uses the Agent tool
with these same role definitions, deciding the structure itself instead of
following the script.

## Practical guardrails (why the video calls this "dangerous")

- **Cost scales with N × roles.** Each task spawns 3–4 agents minimum. N in
  the hundreds is possible but is real money; start with single digits.
- **Verification is the point.** Fan-out without adversarial verifiers
  produces confident, unreviewed slop at scale. Keep verifiers read-only and
  skeptical.
- **Keep tasks file-disjoint.** Implementers run concurrently in one working
  tree. If tasks overlap, give each implementer `isolation: 'worktree'` and
  merge branches afterward.
- **Concurrency is capped** (~10–16 agents at once); extra tasks queue
  automatically, so passing a long list is safe — it just takes longer.
- **Scheduled runs:** in Cowork / Claude Code on the web you can attach a
  Routine (scheduled trigger) that fires a prompt like "run the fanout
  workflow over any open TODOs" on a cron schedule.
