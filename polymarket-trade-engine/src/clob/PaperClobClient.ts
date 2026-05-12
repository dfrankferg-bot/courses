import type { Logger } from "../logging/Logger.js";
import type {
  Order,
  OrderBookLevel,
  OrderBookSnapshot,
  Outcome,
  Position,
} from "../engine/types.js";
import type { ClobClient, PlaceOrderRequest } from "./ClobClient.js";

export interface PaperClobOptions {
  startingBalanceUsdc: number;
  logger: Logger;
  /** ms before a matched order is "mined". */
  miningLatencyMs?: number;
  /** ms between mined -> confirmed. */
  confirmLatencyMs?: number;
  /** Bid/ask spread expressed as a fraction of mid (e.g. 0.01 = 1c on a $1 market). */
  spread?: number;
  /** Depth at each side of the book, in shares. */
  depth?: number;
}

interface MarketBook {
  upMid: number;
  downMid: number;
}

export class PaperClobClient implements ClobClient {
  private balance: number;
  private readonly positions = new Map<string, Position>();
  private readonly orders = new Map<string, Order>();
  private readonly listeners = new Map<string, Set<(o: Order) => void>>();
  private readonly books = new Map<string, MarketBook>();
  private readonly realizedByMarket = new Map<string, number>();
  private readonly logger: Logger;
  private readonly miningLatency: number;
  private readonly confirmLatency: number;
  private readonly spread: number;
  private readonly depth: number;
  private orderSeq = 0;

  constructor(opts: PaperClobOptions) {
    this.balance = opts.startingBalanceUsdc;
    this.logger = opts.logger.child("paper-clob");
    this.miningLatency = opts.miningLatencyMs ?? 1500;
    this.confirmLatency = opts.confirmLatencyMs ?? 1500;
    this.spread = opts.spread ?? 0.02;
    this.depth = opts.depth ?? 500;
  }

  get usdcBalance(): number {
    return this.balance;
  }

  /** Set or update the mid price for both outcomes in a market. */
  setMid(marketId: string, upMid: number) {
    const clamped = clamp(upMid, 0.01, 0.99);
    this.books.set(marketId, { upMid: clamped, downMid: 1 - clamped });
  }

  getOrderBook(marketId: string, outcome: Outcome): OrderBookSnapshot {
    const book = this.books.get(marketId);
    const mid = book ? (outcome === "UP" ? book.upMid : book.downMid) : 0.5;
    const halfSpread = this.spread / 2;
    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];
    for (let i = 0; i < 5; i++) {
      bids.push({
        price: clamp(mid - halfSpread - i * 0.005, 0.01, 0.99),
        size: this.depth * (1 - i * 0.15),
      });
      asks.push({
        price: clamp(mid + halfSpread + i * 0.005, 0.01, 0.99),
        size: this.depth * (1 - i * 0.15),
      });
    }
    return {
      marketId,
      outcome,
      bids,
      asks,
      timestamp: Date.now(),
    };
  }

  async placeOrder(req: PlaceOrderRequest): Promise<Order> {
    const id = `paper-${++this.orderSeq}`;
    const now = Date.now();

    const book = this.getOrderBook(req.marketId, req.outcome);
    const refPrice = req.side === "BUY" ? book.asks[0].price : book.bids[0].price;
    const crosses =
      (req.side === "BUY" && req.limitPrice >= refPrice) ||
      (req.side === "SELL" && req.limitPrice <= refPrice);

    if (!crosses) {
      const rejected: Order = {
        id,
        marketId: req.marketId,
        outcome: req.outcome,
        side: req.side,
        size: req.size,
        limitPrice: req.limitPrice,
        status: "rejected",
        filledSize: 0,
        createdAt: now,
      };
      this.orders.set(id, rejected);
      this.logger.warn("order rejected: no crossing liquidity", {
        order: id,
        limit: req.limitPrice,
        ref: refPrice,
      });
      return rejected;
    }

    if (req.side === "BUY") {
      const cost = req.size * refPrice;
      if (cost > this.balance) {
        const rejected: Order = {
          id,
          marketId: req.marketId,
          outcome: req.outcome,
          side: req.side,
          size: req.size,
          limitPrice: req.limitPrice,
          status: "rejected",
          filledSize: 0,
          createdAt: now,
        };
        this.orders.set(id, rejected);
        this.logger.warn("order rejected: insufficient balance", {
          order: id,
          cost,
          balance: this.balance,
        });
        return rejected;
      }
    }

    const order: Order = {
      id,
      marketId: req.marketId,
      outcome: req.outcome,
      side: req.side,
      size: req.size,
      limitPrice: req.limitPrice,
      status: "matched",
      filledSize: 0,
      createdAt: now,
    };
    this.orders.set(id, order);
    this.notify(order);
    this.logger.info("order matched", {
      order: id,
      side: req.side,
      outcome: req.outcome,
      size: req.size,
      ref: refPrice,
    });

    setTimeout(() => this.mineOrder(id, refPrice), this.miningLatency);

    return order;
  }

  async cancelOrder(orderId: string): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order || order.status === "confirmed") return;
    order.status = "rejected";
    this.notify(order);
  }

  getPosition(marketId: string, outcome: Outcome): Position | undefined {
    return this.positions.get(key(marketId, outcome));
  }

  onOrderUpdate(orderId: string, listener: (o: Order) => void): () => void {
    if (!this.listeners.has(orderId)) this.listeners.set(orderId, new Set());
    this.listeners.get(orderId)!.add(listener);
    return () => this.listeners.get(orderId)?.delete(listener);
  }

  /**
   * Force settle every confirmed position at resolution. Returns total realized
   * PnL for the market (round-trip closes + final settlement payouts).
   */
  settleMarket(marketId: string, resolution: Outcome): number {
    let settlement = 0;
    for (const [k, position] of this.positions) {
      if (!k.startsWith(`${marketId}|`)) continue;
      const payout = position.outcome === resolution ? 1 : 0;
      const realized = (payout - position.averagePrice) * position.shares;
      settlement += realized;
      this.balance += payout * position.shares;
      this.positions.delete(k);
      this.logger.info("market settled position", {
        marketId,
        outcome: position.outcome,
        shares: position.shares,
        avg: position.averagePrice,
        payout,
        realized,
      });
    }
    const total = (this.realizedByMarket.get(marketId) ?? 0) + settlement;
    this.realizedByMarket.delete(marketId);
    return total;
  }

  private mineOrder(orderId: string, refPrice: number) {
    const order = this.orders.get(orderId);
    if (!order || order.status !== "matched") return;
    order.status = "mined";
    order.filledSize = order.size;
    order.filledPrice = refPrice;
    this.notify(order);
    setTimeout(() => this.confirmOrder(orderId), this.confirmLatency);
  }

  private confirmOrder(orderId: string) {
    const order = this.orders.get(orderId);
    if (!order || order.status !== "mined") return;
    order.status = "confirmed";
    order.settledAt = Date.now();
    this.applyFill(order);
    this.notify(order);
  }

  private applyFill(order: Order) {
    const price = order.filledPrice!;
    const k = key(order.marketId, order.outcome);
    const existing = this.positions.get(k);

    if (order.side === "BUY") {
      this.balance -= order.size * price;
      if (existing) {
        const newShares = existing.shares + order.size;
        const newAvg =
          (existing.shares * existing.averagePrice + order.size * price) /
          newShares;
        this.positions.set(k, {
          marketId: order.marketId,
          outcome: order.outcome,
          shares: newShares,
          averagePrice: newAvg,
        });
      } else {
        this.positions.set(k, {
          marketId: order.marketId,
          outcome: order.outcome,
          shares: order.size,
          averagePrice: price,
        });
      }
    } else {
      if (!existing || existing.shares < order.size) {
        this.logger.warn("oversold position, clamping", { orderId: order.id });
      }
      this.balance += order.size * price;
      if (existing) {
        const closed = Math.min(order.size, existing.shares);
        const realized = (price - existing.averagePrice) * closed;
        this.realizedByMarket.set(
          order.marketId,
          (this.realizedByMarket.get(order.marketId) ?? 0) + realized,
        );
      }
      const remaining = (existing?.shares ?? 0) - order.size;
      if (remaining <= 1e-9) {
        this.positions.delete(k);
      } else {
        this.positions.set(k, {
          marketId: order.marketId,
          outcome: order.outcome,
          shares: remaining,
          averagePrice: existing!.averagePrice,
        });
      }
    }
  }

  private notify(order: Order) {
    const set = this.listeners.get(order.id);
    if (!set) return;
    for (const l of set) l(order);
  }
}

function key(marketId: string, outcome: Outcome): string {
  return `${marketId}|${outcome}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
