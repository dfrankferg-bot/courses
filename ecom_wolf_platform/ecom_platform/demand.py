"""Live demand validation via Google Trends (free, no API key, no subscription).

The playbook's Pillar 1 requires a product to "show demand." Instead of trusting
a hand-entered boolean, this module pulls a real interest-over-time signal from
Google Trends using ``pytrends`` (an unofficial, free client — no account, no
key, no cost).

Everything degrades gracefully: if ``pytrends`` isn't installed, the network is
unavailable, or Google rate-limits the request, ``fetch_demand_signal`` returns
``available: False`` and the caller falls back to the brief's own flag. This
keeps the platform fully runnable offline.
"""

from __future__ import annotations

import contextlib
import io
from typing import Any

# On a 0-100 relative Google Trends scale, treat sustained interest at/above this
# as real demand. Kept conservative because the scale is relative to the keyword.
DEMAND_INTEREST_THRESHOLD = 20.0


def _classify(values: list[float]) -> dict[str, Any]:
    """Turn an interest-over-time series into a demand verdict."""
    if not values:
        return {"has_data": False, "shows_demand": False}
    avg = sum(values) / len(values)
    peak = max(values)
    # Trend direction: last third vs first third of the window.
    third = max(1, len(values) // 3)
    early = sum(values[:third]) / third
    late = sum(values[-third:]) / third
    if late > early * 1.1:
        trend = "rising"
    elif late < early * 0.9:
        trend = "declining"
    else:
        trend = "steady"
    # Demand shows if interest is sustained and not in free-fall.
    shows_demand = (avg >= DEMAND_INTEREST_THRESHOLD or peak >= 60) and trend != "declining"
    return {
        "has_data": True,
        "avg_interest": round(avg, 1),
        "peak_interest": round(peak, 1),
        "trend": trend,
        "shows_demand": bool(shows_demand),
    }


def fetch_demand_signal(
    keyword: str,
    timeframe: str = "today 12-m",
    geo: str = "US",
) -> dict[str, Any]:
    """Return a Google Trends demand signal for ``keyword``.

    Always returns a dict with an ``available`` key; never raises.
    """
    result: dict[str, Any] = {"source": "google_trends", "keyword": keyword, "geo": geo}
    try:
        from pytrends.request import TrendReq  # optional dependency
    except Exception:
        result.update(available=False, reason="pytrends not installed")
        return result

    try:
        # pytrends prints its own retry chatter to stdout; keep it out of our output.
        with contextlib.redirect_stdout(io.StringIO()):
            pytrends = TrendReq(hl="en-US", tz=0, timeout=(5, 12))
            pytrends.build_payload([keyword], timeframe=timeframe, geo=geo)
            df = pytrends.interest_over_time()
    except Exception as exc:  # network error, rate limit, etc.
        result.update(available=False, reason=f"request failed: {type(exc).__name__}")
        return result

    if df is None or df.empty or keyword not in df:
        result.update(available=True, has_data=False, shows_demand=False,
                      reason="no trends data for keyword")
        return result

    values = [float(v) for v in df[keyword].tolist()]
    result.update(available=True, **_classify(values))
    return result
