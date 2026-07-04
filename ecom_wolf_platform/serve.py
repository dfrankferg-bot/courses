#!/usr/bin/env python3
"""Local web UI for the Ecom Wolf platform.

Zero dependencies — Python stdlib only. Start it and open the printed URL:

    python serve.py            # http://127.0.0.1:8321
    python serve.py --port 9000
    python serve.py --live     # enable Google Trends demand validation

Fill in the product form; the four specialist agents + reviewer + consensus
round run on submit and the full HTML launch report is rendered in place.
Binds to 127.0.0.1 only — this is a personal tool, not a public server.
"""

from __future__ import annotations

import argparse
import html
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs

from ecom_platform.llm import LLM
from ecom_platform.orchestrator import Orchestrator
from ecom_platform.report import render_report
from ecom_platform.schemas import ProductBrief

FORM_PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ecom Wolf — Evaluate a Product</title>
<style>
:root { --bg:#f7f6f3; --card:#fff; --ink:#1f2430; --muted:#6b7280;
        --line:#e4e2dc; --accent:#2f5d8a; }
@media (prefers-color-scheme: dark) {
  :root { --bg:#16181d; --card:#1f232b; --ink:#e8e9ec; --muted:#9aa1ad;
          --line:#2e333d; --accent:#7aa7d1; }
}
* { box-sizing: border-box; }
body { margin:0; padding:2rem 1rem; background:var(--bg); color:var(--ink);
       font:16px/1.55 Georgia, 'Times New Roman', serif; }
.wrap { max-width:560px; margin:0 auto; }
h1 { font-size:1.6rem; margin:0 0 .25rem; }
p.sub { color:var(--muted); margin:0 0 1.5rem; font-size:.95rem; }
form { background:var(--card); border:1px solid var(--line); border-radius:10px;
       padding:1.25rem; }
label { display:block; font-size:.9rem; margin:.9rem 0 .25rem; }
label:first-of-type { margin-top:0; }
input[type=text], input[type=number] {
  width:100%; padding:.55rem .7rem; border:1px solid var(--line);
  border-radius:8px; background:var(--bg); color:var(--ink); font:inherit; }
.row { display:flex; gap:1rem; } .row > div { flex:1; }
.check { margin-top:1rem; font-size:.9rem; }
.check label { display:inline; margin:0 1.25rem 0 .3rem; }
button { margin-top:1.25rem; width:100%; padding:.7rem; border:0;
         border-radius:8px; background:var(--accent); color:#fff;
         font:inherit; font-size:1.05rem; cursor:pointer; }
p.note { color:var(--muted); font-size:.8rem; margin-top:1rem; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Evaluate a Product</h1>
  <p class="sub">Four specialist agents score your product against the playbook,
  a reviewer audits them, and a consensus round cross-checks the plan.</p>
  <form method="post" action="/">
    <label for="name">Product name</label>
    <input type="text" id="name" name="name" required placeholder="Shiatsu Neck Massager">
    <label for="niche">Niche</label>
    <input type="text" id="niche" name="niche" placeholder="wellness">
    <div class="row">
      <div>
        <label for="price">Selling price ($)</label>
        <input type="number" id="price" name="price" step="0.01" min="0.01" required placeholder="129.99">
      </div>
      <div>
        <label for="cogs">Cost of goods ($)</label>
        <input type="number" id="cogs" name="cogs" step="0.01" min="0" required placeholder="38.00">
      </div>
    </div>
    <div class="row">
      <div>
        <label for="aov">Average order value ($, optional)</label>
        <input type="number" id="aov" name="aov" step="0.01" min="0">
      </div>
      <div>
        <label for="target">Monthly profit target ($)</label>
        <input type="number" id="target" name="target" step="1" min="1" value="6000">
      </div>
    </div>
    <div class="check">
      <input type="checkbox" id="problem" name="problem" checked>
      <label for="problem">Solves a real problem</label>
      <input type="checkbox" id="demand" name="demand" checked>
      <label for="demand">Shows demand</label>
    </div>
    <button type="submit">Run the agents →</button>
  </form>
  <p class="note">Runs locally. Offline mode is rule-based and free; set
  ANTHROPIC_API_KEY before starting the server for Claude-backed reasoning.</p>
</div>
</body>
</html>
"""


def _field(form: dict[str, list[str]], key: str, default: str = "") -> str:
    return form.get(key, [default])[0].strip() or default


class PlatformHandler(BaseHTTPRequestHandler):
    live_signals = False

    def _send_html(self, body: str, status: int = 200) -> None:
        data = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:  # noqa: N802 (http.server API)
        if self.path in ("/", "/index.html"):
            self._send_html(FORM_PAGE)
        else:
            self._send_html("<h1>404</h1><p><a href='/'>Back to the form</a></p>", 404)

    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get("Content-Length", 0))
        form = parse_qs(self.rfile.read(length).decode("utf-8"))
        try:
            brief = ProductBrief(
                name=_field(form, "name", "Unnamed product"),
                niche=_field(form, "niche", "general"),
                selling_price=float(_field(form, "price", "0")),
                cogs=float(_field(form, "cogs", "0")),
                aov=float(_field(form, "aov")) if _field(form, "aov") else None,
                target_monthly_profit=float(_field(form, "target", "6000")),
                solves_problem="problem" in form,
                shows_demand="demand" in form,
            )
            orch = Orchestrator(
                llm=LLM(), verbose=False, enable_live_signals=self.live_signals
            )
            plan = orch.run(brief)
        except Exception as exc:
            self._send_html(
                "<h1>Something went wrong</h1>"
                f"<p>{html.escape(str(exc))}</p><p><a href='/'>Back to the form</a></p>",
                400,
            )
            return

        report = render_report(plan)
        back = "<div style='max-width:880px;margin:0 auto 1rem'><a href='/'>← Evaluate another product</a></div>"
        self._send_html(report.replace('<div class="wrap">', back + '<div class="wrap">', 1))

    def log_message(self, fmt: str, *args) -> None:
        print(f"[serve] {fmt % args}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Local web UI for the launch platform.")
    parser.add_argument("--port", type=int, default=8321)
    parser.add_argument("--live", action="store_true",
                        help="validate demand via Google Trends (needs network + pytrends)")
    args = parser.parse_args()

    PlatformHandler.live_signals = args.live
    server = HTTPServer(("127.0.0.1", args.port), PlatformHandler)
    mode = "ONLINE (Claude)" if LLM().online else "OFFLINE (rule-based)"
    print(f"Ecom Wolf platform UI — {mode}")
    print(f"Open http://127.0.0.1:{args.port} in your browser (Ctrl+C to stop).")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
