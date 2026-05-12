import { ATR, RSI } from "../../indicators/indicators.js";
import type { Strategy, StrategyContext } from "../Strategy.js";
import type { Order, Outcome, PriceTick } from "../../engine/types.js";

interface OpenPosition {
  outcome: Outcome;
  size: number;
  entryPrice: number;
  order: Order;
}

/**
 * Late-entry buy-and-sell strategy that mirrors the lessons from the blueprint:
 *   - Skip the first half of the window — entries are too noisy
 *   - Only enter when RSI extremes line up with the direction of momentum
 *   - Take profit as soon as the mid moves an ATR-scaled distance
 *   - Stop out before the window closes so we never sit through resolution
 *
 * Picks one side per window; will not flip during a window.
 */
export class LateEntryStrategy implements Strategy {
  readonly name = "late-entry";
  private readonly rsi = new RSI(14);
  private readonly atr = new ATR(14);
  private position?: OpenPosition;
  private exited = false;

  onStart(ctx: StrategyContext): void {
    ctx.logger.info("strategy ready", { priceToBeat: ctx.market.priceToBeat });
  }

  async onTick(ctx: StrategyContext, tick: PriceTick): Promise<void> {
    const rsi = this.rsi.push(tick.price);
    const atr = this.atr.push(tick.price);

    const elapsed = tick.timestamp - ctx.market.windowStart;
    const windowMs = ctx.market.windowEnd - ctx.market.windowStart;
    const elapsedFrac = elapsed / windowMs;
    const remainingMs = ctx.market.windowEnd - tick.timestamp;

    if (!this.position && !this.exited) {
      if (elapsedFrac < 0.4 || elapsedFrac > 0.75) return;
      if (rsi === undefined || atr === undefined) return;

      if (rsi > 65) await this.enter(ctx, "UP", tick);
      else if (rsi < 35) await this.enter(ctx, "DOWN", tick);
      return;
    }

    if (!this.position) return;

    const book = ctx.orderBook(this.position.outcome);
    const exitBid = book.bids[0].price;
    const grossProfit = exitBid - this.position.entryPrice;

    const stopOut = remainingMs <= 15_000;
    const takeProfit = grossProfit >= 0.04;
    const stopLoss = grossProfit <= -0.03;

    if (takeProfit || stopLoss || stopOut) {
      await this.exit(ctx, exitBid, { takeProfit, stopLoss, stopOut });
    }
  }

  onEnd(ctx: StrategyContext): void {
    ctx.logger.info("strategy finished", {
      stillOpen: !!this.position,
      exited: this.exited,
    });
  }

  private async enter(
    ctx: StrategyContext,
    outcome: Outcome,
    tick: PriceTick,
  ): Promise<void> {
    const book = ctx.orderBook(outcome);
    const price = book.asks[0].price;
    if (price >= 0.92) return; // too expensive, no edge
    const order = await ctx.buy(outcome, 25, price);
    if (order.status === "rejected") return;
    this.position = { outcome, size: 25, entryPrice: price, order };
    ctx.logger.info("entered", { outcome, price, rsi: this.rsi.value(), atr: this.atr.value(), tick: tick.price });
  }

  private async exit(
    ctx: StrategyContext,
    price: number,
    reason: { takeProfit: boolean; stopLoss: boolean; stopOut: boolean },
  ): Promise<void> {
    if (!this.position) return;
    const order = await ctx.sell(this.position.outcome, this.position.size, price);
    if (order.status === "rejected") {
      ctx.logger.warn("exit rejected, keeping position", { price });
      return;
    }
    ctx.logger.info("exited", { reason, price, entry: this.position.entryPrice });
    this.position = undefined;
    this.exited = true;
  }
}
