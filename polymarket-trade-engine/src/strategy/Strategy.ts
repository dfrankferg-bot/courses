import type { ClobClient } from "../clob/ClobClient.js";
import type { PriceFeed } from "../feeds/PriceFeed.js";
import type { Logger } from "../logging/Logger.js";
import type {
  Market,
  Order,
  OrderBookSnapshot,
  Outcome,
  PriceTick,
} from "../engine/types.js";

export interface StrategyContext {
  readonly market: Market;
  readonly priceFeed: PriceFeed;
  readonly clob: ClobClient;
  readonly logger: Logger;

  buy(outcome: Outcome, size: number, limitPrice: number): Promise<Order>;
  sell(outcome: Outcome, size: number, limitPrice: number): Promise<Order>;
  orderBook(outcome: Outcome): OrderBookSnapshot;
  /** Stop receiving onTick after the current invocation completes. */
  done(): void;
}

export interface Strategy {
  readonly name: string;
  onStart(ctx: StrategyContext): Promise<void> | void;
  onTick(ctx: StrategyContext, tick: PriceTick): Promise<void> | void;
  onEnd(ctx: StrategyContext): Promise<void> | void;
}

export type StrategyFactory = () => Strategy;
