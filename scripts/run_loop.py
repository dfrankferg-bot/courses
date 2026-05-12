"""Iterative eval loop for skill development.

For each eval case, calls the model with the skill loaded as a (cached) system
prompt, grades the response with a separate model-graded eval, and if the
response fails, feeds the grader's feedback back to the model for another
attempt — up to `--max-iterations` per case. Prints per-case results and a
final summary.

Example:
    python -m scripts.run_loop \\
        --eval-set options-trading-evals.json \\
        --skill-path ~/.claude/skills/options-trading \\
        --model claude-opus-4-7 \\
        --max-iterations 5 \\
        --verbose
"""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


GRADER_MODEL = "claude-haiku-4-5"

GRADER_SYSTEM = """You grade an assistant's response against expected criteria.

Reply with JSON only, no prose, no code fences:
{"pass": true|false, "feedback": "specific, actionable reason if failed; 'meets criteria' if passed"}

Be strict on numerical answers (allow small rounding) and on whether required elements are present."""


@dataclass
class EvalCase:
    id: str
    prompt: str
    expected_criteria: str


@dataclass
class CaseResult:
    case_id: str
    passed: bool
    iterations: int
    final_response: str
    feedback_history: list[str] = field(default_factory=list)


def load_eval_set(path: Path) -> list[EvalCase]:
    data = json.loads(path.read_text())
    return [EvalCase(**c) for c in data["cases"]]


def load_skill(skill_dir: Path) -> str:
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        raise FileNotFoundError(f"SKILL.md not found in {skill_dir}")
    return skill_md.read_text()


def _extract_text(message: Any) -> str:
    return "".join(block.text for block in message.content if block.type == "text")


def _parse_grader_verdict(text: str) -> tuple[bool, str]:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    try:
        verdict = json.loads(text)
    except json.JSONDecodeError:
        return False, f"grader returned non-JSON: {text[:200]}"
    return bool(verdict.get("pass")), str(verdict.get("feedback", ""))


def grade(client: Any, case: EvalCase, response: str) -> tuple[bool, str]:
    user = (
        f"Prompt:\n{case.prompt}\n\n"
        f"Assistant response:\n{response}\n\n"
        f"Expected criteria:\n{case.expected_criteria}"
    )
    msg = client.messages.create(
        model=GRADER_MODEL,
        max_tokens=512,
        system=GRADER_SYSTEM,
        messages=[{"role": "user", "content": user}],
    )
    return _parse_grader_verdict(_extract_text(msg))


def run_case(
    client: Any,
    model: str,
    skill: str,
    case: EvalCase,
    max_iterations: int,
    verbose: bool,
) -> CaseResult:
    history: list[dict] = [{"role": "user", "content": case.prompt}]
    feedback_history: list[str] = []
    response_text = ""

    for iteration in range(1, max_iterations + 1):
        if verbose:
            print(f"  [{case.id}] iteration {iteration}/{max_iterations}")

        msg = client.messages.create(
            model=model,
            max_tokens=4096,
            thinking={"type": "adaptive"},
            output_config={"effort": "high"},
            system=[
                {
                    "type": "text",
                    "text": skill,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=history,
        )
        response_text = _extract_text(msg)
        history.append({"role": "assistant", "content": msg.content})

        passed, feedback = grade(client, case, response_text)
        feedback_history.append(feedback)

        if verbose:
            preview = feedback.replace("\n", " ")[:140]
            print(f"    pass={passed} feedback={preview}")

        if passed:
            return CaseResult(case.id, True, iteration, response_text, feedback_history)

        history.append(
            {
                "role": "user",
                "content": (
                    "Your previous answer did not meet the criteria.\n"
                    f"Grader feedback: {feedback}\n\n"
                    "Revise your answer to address the feedback. Re-state the full answer."
                ),
            }
        )

    return CaseResult(case.id, False, max_iterations, response_text, feedback_history)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run iterative skill eval loop.")
    parser.add_argument("--eval-set", required=True, type=Path)
    parser.add_argument("--skill-path", required=True, type=Path)
    parser.add_argument("--model", default="claude-opus-4-7")
    parser.add_argument("--max-iterations", type=int, default=5)
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args(argv)

    skill_path = args.skill_path.expanduser()
    cases = load_eval_set(args.eval_set)
    skill = load_skill(skill_path)

    try:
        from anthropic import Anthropic
    except ImportError:
        print("error: anthropic SDK is not installed. Run: pip install anthropic", file=sys.stderr)
        return 2

    client = Anthropic()

    print(f"Eval set: {args.eval_set} ({len(cases)} cases)")
    print(f"Skill:    {skill_path}")
    print(f"Model:    {args.model}")
    print(f"Grader:   {GRADER_MODEL}")
    print(f"Max iter: {args.max_iterations}")
    print()

    results: list[CaseResult] = []
    for case in cases:
        print(f"Running {case.id}...")
        result = run_case(client, args.model, skill, case, args.max_iterations, args.verbose)
        results.append(result)
        status = "PASS" if result.passed else "FAIL"
        print(f"  -> {status} after {result.iterations} iter(s)")
        if args.verbose and not result.passed:
            print(f"     final response (truncated): {result.final_response[:300]}")

    passed_count = sum(1 for r in results if r.passed)
    avg_iters = sum(r.iterations for r in results) / len(results) if results else 0.0
    print()
    print(f"Summary: {passed_count}/{len(results)} passed, avg {avg_iters:.2f} iterations")
    return 0 if passed_count == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
