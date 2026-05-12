import { randomUUID } from "node:crypto";
import type { Logger } from "../logging/Logger.js";
import type {
  Order,
  OrderBookLevel,
  OrderBookSnapshot,
  Outcome,
  Position,
} from "../engine/types.js";
import type { ClobClient, PlaceOrderRequest } from "./ClobClient.js";

export type PolymarketMode = "dry-run" | "live";

export interface PolymarketClobConfig {
  /** Polymarket CLOB host. Defaults to the public production endpoint. */
  host?: string;
  /** Chain ID. Polygon mainnet is 137. */
  chainId?: number;
  /** Private key for the funder/maker wallet. Required for `live`. */
  privateKey?: string;
  /** Pre-generated CLOB API credentials (key, secret, passphrase). */
  apiCredentials?: { key: string; secret: string; passphrase: string };
  /** dry-run logs and returns synthetic orders; live actually places them. */
  mode: PolymarketMode;
  /** Hard ceiling on a single order's USDC notional. */
  maxOrderNotional: number;
  logger: Logger;
}

/**
 * Real Polymarket CLOB client wrapper. This is intentionally a STUB:
 *
 *   - In `dry-run` mode it logs orders and returns synthetic confirmations,
 *     so you can run the engine end-to-end against a real price feed without
 *     touching real money.
 *
 *   - In `live` mode it throws a guard error unless you:
 *       1. Install the runtime deps:
 *            npm install @polymarket/clob-client ethers
 *       2. Replace each `notImplemented(...)` call below with a real call to
 *          the CLOB client.
 *       3. Pre-approve USDC + Conditional Tokens spending on the CTF
 *          Exchange contract from your wallet.
 *       4. Test on Polymarket's mumbai/amoy testnet before mainnet.
 *
 * Keeping this as a stub is deliberate: a typo here moves real USDC. The
 * extra friction is the safety feature.
 */
export class PolymarketClobClient implements ClobClient {
  private readonly mode: PolymarketMode;
  private readonly host: string;
  private readonly chainId: number;
  private readonly maxOrderNotional: number;
  private readonly logger: Logger;

  private readonly orders = new Map<string, Order>();
  private readonly listeners = new Map<string, Set<(o: Order) => void>>();

  constructor(config: PolymarketClobConfig) {
    this.mode = config.mode;
    this.host = config.host ?? "https://clob.polymarket.com";
    this.chainId = config.chainId ?? 137;
    this.maxOrderNotional = config.maxOrderNotional;
    this.logger = config.logger.child(`polymarket-clob[${this.mode}]`);

    if (this.mode === "live") {
      if (!config.privateKey) {
        throw new Error(
          "PolymarketClobClient: live mode requires POLYMARKET_PRIVATE_KEY",
        );
      }
      if (!config.apiCredentials) {
        throw new Error(
          "PolymarketClobClient: live mode requires API credentials",
        );
      }
      this.logger.warn("LIVE MODE — orders will move real USDC", {
        host: this.host,
        chainId: this.chainId,
      });
    } else {
      this.logger.info("dry-run mode — orders will not be sent");
    }
  }

  async placeOrder(req: PlaceOrderRequest): Promise<Order> {
    const notional = req.size * req.limitPrice;
    if (notional > this.maxOrderNotional) {
      this.logger.error("order exceeds maxOrderNotional, refusing", {
        notional,
        max: this.maxOrderNotional,
      });
      return this.rejected(req, "exceeds risk limit");
    }

    if (this.mode === "dry-run") {
      return this.dryRunFill(req);
    }

    return this.notImplemented("placeOrder");
  }

  async cancelOrder(orderId: string): Promise<void> {
    if (this.mode === "dry-run") {
      const order = this.orders.get(orderId);
      if (!order || order.status === "confirmed") return;
      order.status = "rejected";
      this.notify(order);
      return;
    }
    this.notImplemented("cancelOrder");
  }

  getOrderBook(marketId: string, outcome: Outcome): OrderBookSnapshot {
    if (this.mode === "dry-run") {
      const mid = 0.5;
      const bids: OrderBookLevel[] = [{ price: mid - 0.01, size: 100 }];
      const asks: OrderBookLevel[] = [{ price: mid + 0.01, size: 100 }];
      return { marketId, outcome, bids, asks, timestamp: Date.now() };
    }
    return this.notImplemented("getOrderBook");
  }

  getPosition(_marketId: string, _outcome: Outcome): Position | undefined {
    if (this.mode === "dry-run") return undefined;
    return this.notImplemented("getPosition");
  }

  onOrderUpdate(orderId: string, listener: (o: Order) => void): () => void {
    if (!this.listeners.has(orderId)) this.listeners.set(orderId, new Set());
    this.listeners.get(orderId)!.add(listener);
    return () => this.listeners.get(orderId)?.delete(listener);
  }

  private dryRunFill(req: PlaceOrderRequest): Order {
    const order: Order = {
      id: `dryrun-${randomUUID()}`,
      marketId: req.marketId,
      outcome: req.outcome,
      side: req.side,
      size: req.size,
      limitPrice: req.limitPrice,
      status: "confirmed",
      filledSize: req.size,
      filledPrice: req.limitPrice,
      createdAt: Date.now(),
      settledAt: Date.now(),
    };
    this.orders.set(order.id, order);
    this.logger.info("dry-run order accepted", {
      id: order.id,
      market: req.marketId,
      outcome: req.outcome,
      side: req.side,
      size: req.size,
      price: req.limitPrice,
    });
    return order;
  }

  private rejected(req: PlaceOrderRequest, reason: string): Order {
    const order: Order = {
      id: `rejected-${randomUUID()}`,
      marketId: req.marketId,
      outcome: req.outcome,
      side: req.side,
      size: req.size,
      limitPrice: req.limitPrice,
      status: "rejected",
      filledSize: 0,
      createdAt: Date.now(),
    };
    this.logger.warn("order rejected", { id: order.id, reason });
    return order;
  }

  private notify(order: Order) {
    const set = this.listeners.get(order.id);
    if (!set) return;
    for (const l of set) l(order);
  }

  private notImplemented(method: string): never {
    throw new Error(
      `PolymarketClobClient.${method} is not implemented for live mode. ` +
        "Install @polymarket/clob-client and ethers, then wire the real call. " +
        "See docs/ARCHITECTURE.md and the inline comment at the top of PolymarketClobClient.ts.",
    );
  }
}
