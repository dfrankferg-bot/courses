import type { PolymarketMode } from "./clob/PolymarketClobClient.js";

export type FeedKind = "simulated" | "binance";
export type ClobKind = "paper" | "polymarket";

export interface RuntimeConfig {
  feed: FeedKind;
  clob: ClobKind;
  polymarketMode: PolymarketMode;
  maxOrderNotionalUsdc: number;
}

/**
 * Load runtime config from the environment. Defaults are deliberately safe:
 * simulated feed + paper CLOB. Real components require explicit opt-in.
 *
 * Env vars:
 *   POLYMARKET_FEED            = simulated | binance        (default: simulated)
 *   POLYMARKET_CLOB            = paper | polymarket         (default: paper)
 *   POLYMARKET_MODE            = dry-run | live             (default: dry-run)
 *   POLYMARKET_LIVE            = 1 to enable live mode      (extra safety gate)
 *   POLYMARKET_MAX_NOTIONAL    = USDC cap per order         (default: 25)
 */
export function loadRuntimeConfig(): RuntimeConfig {
  const feed = (process.env.POLYMARKET_FEED ?? "simulated") as FeedKind;
  const clob = (process.env.POLYMARKET_CLOB ?? "paper") as ClobKind;

  let polymarketMode: PolymarketMode = "dry-run";
  if (process.env.POLYMARKET_MODE === "live") {
    if (process.env.POLYMARKET_LIVE !== "1") {
      throw new Error(
        "POLYMARKET_MODE=live also requires POLYMARKET_LIVE=1. " +
          "This is a deliberate double-gate to prevent accidental real trades.",
      );
    }
    polymarketMode = "live";
  }

  const maxOrderNotionalUsdc = Number(
    process.env.POLYMARKET_MAX_NOTIONAL ?? "25",
  );
  if (!Number.isFinite(maxOrderNotionalUsdc) || maxOrderNotionalUsdc <= 0) {
    throw new Error("POLYMARKET_MAX_NOTIONAL must be a positive number");
  }

  if (feed !== "simulated" && feed !== "binance") {
    throw new Error(`Unknown POLYMARKET_FEED: ${feed}`);
  }
  if (clob !== "paper" && clob !== "polymarket") {
    throw new Error(`Unknown POLYMARKET_CLOB: ${clob}`);
  }

  return { feed, clob, polymarketMode, maxOrderNotionalUsdc };
}
