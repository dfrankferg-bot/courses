import type { ClobClient } from "../clob/ClobClient.js";
import type { PriceFeed } from "../feeds/PriceFeed.js";
import type { Logger } from "../logging/Logger.js";
import type { Strategy, StrategyContext } from "../strategy/Strategy.js";
import type {
  FillResult,
  Market,
  Order,
  Outcome,
  PriceTick,
} from "./types.js";

export interface MarketLifecycleDeps {
  market: Market;
  strategy: Strategy;
  clob: ClobClient;
  priceFeed: PriceFeed;
  logger: Logger;
  /**
   * Maps an asset price to a market mid for the UP outcome (0..1). Defaults to
   * a simple sigmoid centered on `priceToBeat`.
   */
  pricer?: (price: number, market: Market) => number;
}

/**
 * Owns one market window from start -> run -> end -> settled. Wires the
 * strategy to the price feed and translates underlying ticks into market mids
 * for the paper CLOB.
 */
export class MarketLifecycle {
  private readonly market: Market;
  private readonly strategy: Strategy;
  private readonly clob: ClobClient;
  private readonly priceFeed: PriceFeed;
  private readonly logger: Logger;
  private readonly pricer: (price: number, market: Market) => number;

  private unsubscribe?: () => void;
  private endTimer?: NodeJS.Timeout;
  private stopped = false;
  private lastUnderlying?: number;

  constructor(deps: MarketLifecycleDeps) {
    this.market = deps.market;
    this.strategy = deps.strategy;
    this.clob = deps.clob;
    this.priceFeed = deps.priceFeed;
    this.logger = deps.logger.child(
      `market[${deps.market.id} ${deps.strategy.name}]`,
    );
    this.pricer = deps.pricer ?? defaultPricer;
  }

  async run(): Promise<FillResult> {
    await this.start();
    await this.waitForEnd();
    return this.end();
  }

  private async start(): Promise<void> {
    this.market.state = "starting";
    this.logger.info("market starting", {
      windowStart: this.market.windowStart,
      windowEnd: this.market.windowEnd,
      priceToBeat: this.market.priceToBeat,
    });

    await this.strategy.onStart(this.context());

    this.market.state = "running";
    this.unsubscribe = this.priceFeed.subscribe(this.market.asset, (tick) =>
      this.handleTick(tick),
    );
  }

  private handleTick(tick: PriceTick) {
    if (this.stopped || this.market.state !== "running") return;
    this.lastUnderlying = tick.price;
    if (this.clob.setMid) {
      const upMid = this.pricer(tick.price, this.market);
      this.clob.setMid(this.market.id, upMid);
    }

    const result = this.strategy.onTick(this.context(), tick);
    if (result && typeof (result as Promise<void>).then === "function") {
      (result as Promise<void>).catch((err) =>
        this.logger.error("strategy onTick threw", { err: String(err) }),
      );
    }
  }

  private waitForEnd(): Promise<void> {
    return new Promise((resolve) => {
      const wait = Math.max(0, this.market.windowEnd - Date.now());
      this.endTimer = setTimeout(resolve, wait);
    });
  }

  private async end(): Promise<FillResult> {
    this.stopped = true;
    this.unsubscribe?.();
    this.market.state = "ending";

    const settlePrice =
      this.lastUnderlying ?? this.priceFeed.latest(this.market.asset)?.price;
    const resolution: Outcome =
      settlePrice !== undefined && settlePrice >= this.market.priceToBeat
        ? "UP"
        : "DOWN";

    this.market.resolution = resolution;
    this.market.resolutionPrice = settlePrice;
    this.logger.info("market resolving", { resolution, settlePrice });

    await this.strategy.onEnd(this.context());

    const realized = this.clob.settleMarket
      ? this.clob.settleMarket(this.market.id, resolution)
      : 0;
    this.market.state = "settled";

    this.logger.info("market settled", { realized });
    return { pnl: realized, realized, resolution };
  }

  private context(): StrategyContext {
    const market = this.market;
    const clob = this.clob;
    const logger = this.logger.child(this.strategy.name);
    return {
      market,
      priceFeed: this.priceFeed,
      clob,
      logger,
      buy(outcome, size, limitPrice): Promise<Order> {
        return clob.placeOrder({
          marketId: market.id,
          outcome,
          side: "BUY",
          size,
          limitPrice,
        });
      },
      sell(outcome, size, limitPrice): Promise<Order> {
        return clob.placeOrder({
          marketId: market.id,
          outcome,
          side: "SELL",
          size,
          limitPrice,
        });
      },
      orderBook(outcome) {
        return clob.getOrderBook(market.id, outcome);
      },
      done: () => {
        this.stopped = true;
        this.unsubscribe?.();
      },
    };
  }
}

/**
 * Sigmoid pricer: maps the distance between current price and priceToBeat to a
 * 0..1 implied probability for UP. The slope controls how aggressively the
 * market reprices as the window closes.
 */
function defaultPricer(price: number, market: Market): number {
  const slope = 0.0008;
  const z = (price - market.priceToBeat) / Math.max(1, market.priceToBeat * slope);
  const remainingMs = Math.max(1, market.windowEnd - Date.now());
  const totalMs = Math.max(1, market.windowEnd - market.windowStart);
  const timeFactor = 1 + (1 - remainingMs / totalMs) * 2;
  return sigmoid(z * timeFactor);
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}
