"""The orchestrator: automates the full playbook workflow.

For each pillar it runs the specialist agent, hands the result to the reviewer,
and — if the reviewer returns required fixes — feeds that feedback back to the
specialist for a revision (bounded loop). Once every pillar is approved (or the
loop is exhausted) it computes an overall GO / NO-GO for the launch.
"""

from __future__ import annotations

from .agents import ReviewerAgent, SPECIALISTS
from .llm import LLM
from .schemas import AgentResult, LaunchPlan, ProductBrief, Review


class Orchestrator:
    def __init__(self, llm: LLM | None = None, max_revisions: int = 2, verbose: bool = True):
        self.llm = llm or LLM()
        self.reviewer = ReviewerAgent(self.llm)
        self.max_revisions = max_revisions
        self.verbose = verbose

    def _log(self, msg: str) -> None:
        if self.verbose:
            print(msg)

    def _run_pillar(self, agent, brief: ProductBrief) -> tuple[AgentResult, Review]:
        feedback: list[str] = []
        result = agent.run(brief)
        review = self.reviewer.review(result)
        revision = 0
        while not review.approved and revision < self.max_revisions:
            revision += 1
            self._log(
                f"    ↳ reviewer requested {len(review.required_fixes)} fix(es); "
                f"revision {revision}…"
            )
            feedback = review.required_fixes
            result = agent.run(brief, feedback=feedback)
            result.revision = revision
            review = self.reviewer.review(result)
        return result, review

    def run(self, brief: ProductBrief) -> LaunchPlan:
        mode = "ONLINE (Claude)" if self.llm.online else "OFFLINE (rule-based)"
        self._log(f"\n=== Launch workflow for '{brief.name}' — mode: {mode} ===")
        plan = LaunchPlan(product=brief)

        for agent_cls in SPECIALISTS:
            agent = agent_cls(self.llm)
            self._log(f"\n▶ {agent.role}")
            result, review = self._run_pillar(agent, brief)
            plan.results[agent.pillar_id] = result
            plan.reviews[agent.pillar_id] = review
            status = "APPROVED" if review.approved else "NEEDS WORK"
            self._log(f"    {status} (score {review.score:.0f}/100)")
            for rec in result.recommendations[:3]:
                self._log(f"      • {rec}")
            if not review.approved:
                for fix in review.required_fixes:
                    self._log(f"      ✗ required: {fix}")

        # Overall go/no-go: product must be a winner AND all pillars approved.
        product_ok = plan.results["product_selection"].computed.get("is_winner", False)
        all_approved = all(r.approved for r in plan.reviews.values())
        if product_ok and all_approved:
            plan.go_no_go = "GO"
            plan.notes.append("All four pillars approved; product meets winner criteria.")
        else:
            plan.go_no_go = "NO-GO"
            if not product_ok:
                plan.notes.append("Product fails one or more winner criteria — do not launch.")
            if not all_approved:
                failed = [p for p, r in plan.reviews.items() if not r.approved]
                plan.notes.append(f"Pillars still needing work: {', '.join(failed)}.")

        self._log(f"\n=== DECISION: {plan.go_no_go} ===")
        for note in plan.notes:
            self._log(f"  - {note}")
        return plan
