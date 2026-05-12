import { RSI } from "../../indicators/indicators.js";
import type { Strategy, StrategyContext } from "../Strategy.js";
import type { PriceTick } from "../../engine/types.js";

/**
 * Naive signal strategy from the early version described in the blueprint:
 *   - Wait for RSI to confirm a directional move
 *   - Buy a fixed size of the matching outcome at the top of the book
 *   - Hold until the market resolves
 *
 * This is intentionally simple — the article calls it out as the 95%/5%
 * approach that gives back too much on the bad windows. Use it as a baseline
 * to compare richer strategies against.
 */
export class HoldToResolutionStrategy implements Strategy {
  readonly name = "hold-to-resolution";
  private readonly rsi = new RSI(14);
  private placed = false;

  onStart(ctx: StrategyContext): void {
    ctx.logger.info("strategy ready", { priceToBeat: ctx.market.priceToBeat });
  }

  async onTick(ctx: StrategyContext, tick: PriceTick): Promise<void> {
    const rsi = this.rsi.push(tick.price);
    if (this.placed || rsi === undefined) return;

    const remainingMs = ctx.market.windowEnd - tick.timestamp;
    const windowMs = ctx.market.windowEnd - ctx.market.windowStart;
    if (remainingMs / windowMs < 0.6) return;

    if (rsi > 60) {
      const book = ctx.orderBook("UP");
      await ctx.buy("UP", 50, book.asks[0].price);
      this.placed = true;
    } else if (rsi < 40) {
      const book = ctx.orderBook("DOWN");
      await ctx.buy("DOWN", 50, book.asks[0].price);
      this.placed = true;
    }
  }

  onEnd(ctx: StrategyContext): void {
    ctx.logger.info("strategy finished", { placed: this.placed });
  }
}
