import type { ClobClient } from "../clob/ClobClient.js";
import type { PriceFeed } from "../feeds/PriceFeed.js";
import type { Logger } from "../logging/Logger.js";
import type { StrategyFactory } from "../strategy/Strategy.js";
import { MarketLifecycle } from "./MarketLifecycle.js";
import type { Asset, FillResult, Market } from "./types.js";

export interface EngineOptions {
  asset: Asset;
  windowMs?: number;
  /** How many windows to run before stopping. Defaults to infinite (`undefined`). */
  maxWindows?: number;
  strategyFactory: StrategyFactory;
  clob: ClobClient;
  priceFeed: PriceFeed;
  logger: Logger;
  /** Optional callback when a window settles. */
  onWindowSettled?: (market: Market, result: FillResult) => void;
}

/**
 * Top-level orchestrator. Inspired by the "early-bird" model described in the
 * blueprint: the engine schedules the *next* market window and never operates
 * inside the current one. This guarantees each `MarketLifecycle` sees its
 * `start` event before any ticks land.
 */
export class Engine {
  private readonly opts: EngineOptions;
  private readonly logger: Logger;
  private readonly windowMs: number;
  private running = false;
  private windowsRun = 0;

  constructor(opts: EngineOptions) {
    this.opts = opts;
    this.logger = opts.logger.child("engine");
    this.windowMs = opts.windowMs ?? 5 * 60_000;
  }

  async start(): Promise<void> {
    this.running = true;
    await this.opts.priceFeed.start();
    await this.waitForFirstTick();
    this.logger.info("engine started", {
      asset: this.opts.asset,
      windowMs: this.windowMs,
      maxWindows: this.opts.maxWindows ?? "infinite",
    });

    while (this.running) {
      if (
        this.opts.maxWindows !== undefined &&
        this.windowsRun >= this.opts.maxWindows
      ) {
        this.logger.info("max windows reached, stopping", {
          windowsRun: this.windowsRun,
        });
        break;
      }

      const market = this.scheduleNextWindow();
      const ttl = market.windowStart - Date.now();
      if (ttl > 0) {
        this.logger.info("waiting for next window", { ttlMs: ttl, market });
        await sleep(ttl);
      }
      if (!this.running) break;

      const strategy = this.opts.strategyFactory();
      const lifecycle = new MarketLifecycle({
        market,
        strategy,
        clob: this.opts.clob,
        priceFeed: this.opts.priceFeed,
        logger: this.logger,
      });

      const result = await lifecycle.run();
      this.opts.onWindowSettled?.(market, result);
      this.windowsRun++;
    }

    await this.stop();
  }

  private async waitForFirstTick(): Promise<void> {
    if (this.opts.priceFeed.latest(this.opts.asset)) return;
    await new Promise<void>((resolve) => {
      const unsubscribe = this.opts.priceFeed.subscribe(this.opts.asset, () => {
        unsubscribe();
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    await this.opts.priceFeed.stop();
    this.logger.info("engine stopped");
  }

  private scheduleNextWindow(): Market {
    const now = Date.now();
    const aligned = Math.ceil(now / this.windowMs) * this.windowMs;
    const windowStart = aligned === now ? aligned + this.windowMs : aligned;
    const windowEnd = windowStart + this.windowMs;
    const refTick = this.opts.priceFeed.latest(this.opts.asset);
    const priceToBeat = refTick?.price ?? 0;

    return {
      id: `${this.opts.asset}-${windowStart}`,
      asset: this.opts.asset,
      windowStart,
      windowEnd,
      priceToBeat,
      state: "scheduled",
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
