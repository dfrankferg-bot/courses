"""The orchestrator: automates the full playbook workflow, collaboratively.

For each pillar it runs the specialist agent (which reads the shared blackboard
built up by earlier pillars), hands the result to the reviewer, and — if the
reviewer returns required fixes — feeds that feedback back to the specialist for
a revision (bounded loop).

After every pillar is done, all agents join a **consensus round**: each inspects
the whole plan and raises cross-pillar concerns. Those concerns, plus the
product verdict and reviewer approvals, decide the final GO / NO-GO.
"""

from __future__ import annotations

from .agents import ReviewerAgent, SPECIALISTS
from .llm import LLM
from .schemas import AgentResult, LaunchPlan, ProductBrief, Review, SharedContext


class Orchestrator:
    def __init__(self, llm: LLM | None = None, max_revisions: int = 2,
                 verbose: bool = True, enable_live_signals: bool = False):
        self.llm = llm or LLM()
        self.reviewer = ReviewerAgent(self.llm)
        self.max_revisions = max_revisions
        self.verbose = verbose
        self.enable_live_signals = enable_live_signals

    def _log(self, msg: str) -> None:
        if self.verbose:
            print(msg)

    def _run_pillar(self, agent, brief: ProductBrief,
                    ctx: SharedContext) -> tuple[AgentResult, Review]:
        result = agent.run(brief, ctx=ctx)
        review = self.reviewer.review(result)
        revision = 0
        while not review.approved and revision < self.max_revisions:
            revision += 1
            self._log(
                f"    ↳ reviewer requested {len(review.required_fixes)} fix(es); "
                f"revision {revision}…"
            )
            result = agent.run(brief, ctx=ctx, feedback=review.required_fixes)
            result.revision = revision
            review = self.reviewer.review(result)
        return result, review

    def run(self, brief: ProductBrief) -> LaunchPlan:
        mode = "ONLINE (Claude)" if self.llm.online else "OFFLINE (rule-based)"
        signals = "live signals ON" if self.enable_live_signals else "live signals off"
        self._log(f"\n=== Launch workflow for '{brief.name}' — {mode}, {signals} ===")

        plan = LaunchPlan(product=brief)
        ctx = SharedContext(brief=brief, enable_live_signals=self.enable_live_signals)

        # --- Sequential pillars, each building on the shared blackboard ---
        agents = []
        for agent_cls in SPECIALISTS:
            agent = agent_cls(self.llm)
            agents.append(agent)
            self._log(f"\n▶ {agent.role}")
            result, review = self._run_pillar(agent, brief, ctx)
            ctx.results[agent.pillar_id] = result  # publish for downstream agents
            plan.results[agent.pillar_id] = result
            plan.reviews[agent.pillar_id] = review
            status = "APPROVED" if review.approved else "NEEDS WORK"
            self._log(f"    {status} (score {review.score:.0f}/100)")
            for rec in result.recommendations[:3]:
                self._log(f"      • {rec}")
            if not review.approved:
                for fix in review.required_fixes:
                    self._log(f"      ✗ required: {fix}")

        # --- Consensus round: every agent cross-checks the whole plan ---
        self._log("\n▶ Consensus round (agents cross-check each other)")
        for agent in agents:
            for flag in agent.peer_review(ctx):
                if flag not in ctx.flags:
                    ctx.flags.append(flag)
        if ctx.flags:
            for flag in ctx.flags:
                self._log(f"      ⚑ {flag}")
        else:
            self._log("      ✓ no cross-pillar conflicts")
        plan.consensus = list(ctx.flags)
        plan.signals = dict(ctx.signals)

        # --- Final decision ---
        product_ok = plan.results["product_selection"].computed.get("is_winner", False)
        all_approved = all(r.approved for r in plan.reviews.values())
        blocking = [f for f in ctx.flags if "HALT" in f or "do not" in f.lower()]

        if product_ok and all_approved and not blocking:
            plan.go_no_go = "GO"
            plan.notes.append("All four pillars approved; product meets winner criteria.")
            if ctx.flags:
                plan.notes.append("Non-blocking consensus notes attached — review before launch.")
        else:
            plan.go_no_go = "NO-GO"
            if not product_ok:
                plan.notes.append("Product fails one or more winner criteria — do not launch.")
            if not all_approved:
                failed = [p for p, r in plan.reviews.items() if not r.approved]
                plan.notes.append(f"Pillars still needing work: {', '.join(failed)}.")
            if blocking:
                plan.notes.append(f"Blocking consensus flags: {len(blocking)}.")

        self._log(f"\n=== DECISION: {plan.go_no_go} ===")
        for note in plan.notes:
            self._log(f"  - {note}")
        return plan
