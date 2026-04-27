# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project Overview

Anthropic course material — prompt engineering tutorials, API fundamentals,
tool use, prompt evaluations, and real-world prompting examples. Primarily
Python (Jupyter notebooks). The `everything-claude-code/` directory is a
downloaded copy of the ECC plugin source (reference only — not active code
for this repo).

## Active Conventions

The agents, skills, and slash commands under `.claude/` come from the
Everything Claude Code plugin. The rules below apply to all work in this
repository.

### Common Rules

- @.claude/rules/common/coding-style.md
- @.claude/rules/common/code-review.md
- @.claude/rules/common/security.md
- @.claude/rules/common/testing.md
- @.claude/rules/common/git-workflow.md
- @.claude/rules/common/development-workflow.md
- @.claude/rules/common/patterns.md
- @.claude/rules/common/performance.md
- @.claude/rules/common/agents.md
- @.claude/rules/common/hooks.md

### Python Rules (when editing .py / .ipynb)

- @.claude/rules/python/coding-style.md
- @.claude/rules/python/patterns.md
- @.claude/rules/python/security.md
- @.claude/rules/python/testing.md
- @.claude/rules/python/hooks.md

## Notes

- `everything-claude-code/` is a vendored copy of the ECC source repo
  (`https://github.com/affaan-m/everything-claude-code`). Don't edit files
  there as if they were owned by this repo.
- Hooks from ECC are NOT installed. Tool execution behavior is unmodified.
