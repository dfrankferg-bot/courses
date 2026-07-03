#!/usr/bin/env python3
"""CLI entrypoint for the Ecom Wolf automated platform.

Examples
--------
Run the built-in demo product (works offline, no API key needed):

    python run.py --demo

Evaluate your own product:

    python run.py --name "Shiatsu Neck Massager" --niche wellness \\
        --price 129.99 --cogs 38 --target-profit 6000

Emit the full launch plan as JSON:

    python run.py --demo --json
"""

from __future__ import annotations

import argparse
import json
import sys

from ecom_platform.llm import LLM
from ecom_platform.orchestrator import Orchestrator
from ecom_platform.schemas import ProductBrief


def build_brief(args: argparse.Namespace) -> ProductBrief:
    if args.demo:
        return ProductBrief(
            name="Shiatsu Neck & Back Massager",
            niche="wellness",
            selling_price=129.99,
            cogs=38.00,
            solves_problem=True,
            shows_demand=True,
            target_monthly_profit=6000.0,
        )
    if not args.name:
        print("error: provide --demo or --name/--price/--cogs", file=sys.stderr)
        sys.exit(2)
    return ProductBrief(
        name=args.name,
        niche=args.niche or "general",
        selling_price=args.price,
        cogs=args.cogs,
        solves_problem=not args.no_problem,
        shows_demand=not args.no_demand,
        aov=args.aov,
        target_monthly_profit=args.target_profit,
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Automated e-commerce launch platform.")
    parser.add_argument("--demo", action="store_true", help="run the built-in demo product")
    parser.add_argument("--name", help="product name")
    parser.add_argument("--niche", help="product niche")
    parser.add_argument("--price", type=float, default=0.0, help="selling price")
    parser.add_argument("--cogs", type=float, default=0.0, help="cost of goods")
    parser.add_argument("--aov", type=float, default=None, help="average order value (optional)")
    parser.add_argument("--target-profit", type=float, default=6000.0, help="monthly profit target")
    parser.add_argument("--no-problem", action="store_true", help="product does NOT solve a real problem")
    parser.add_argument("--no-demand", action="store_true", help="product has NO proven demand")
    parser.add_argument("--json", action="store_true", help="print the full plan as JSON")
    parser.add_argument("--quiet", action="store_true", help="suppress step-by-step logging")
    args = parser.parse_args(argv)

    brief = build_brief(args)
    llm = LLM()
    orch = Orchestrator(llm=llm, verbose=not args.quiet and not args.json)
    plan = orch.run(brief)

    if args.json:
        print(json.dumps(plan.to_dict(), indent=2))
    return 0 if plan.go_no_go == "GO" else 1


if __name__ == "__main__":
    raise SystemExit(main())
