import type {
  Order,
  OrderBookSnapshot,
  OrderSide,
  Outcome,
  Position,
} from "../engine/types.js";

export interface PlaceOrderRequest {
  marketId: string;
  outcome: Outcome;
  side: OrderSide;
  size: number;
  limitPrice: number;
}

/**
 * Abstraction over Polymarket's hybrid CLOB. Real implementations route to the
 * off-chain matching engine and wait for on-chain settlement; the paper client
 * simulates the same lifecycle locally.
 */
export interface ClobClient {
  placeOrder(req: PlaceOrderRequest): Promise<Order>;
  cancelOrder(orderId: string): Promise<void>;
  getOrderBook(marketId: string, outcome: Outcome): OrderBookSnapshot;
  getPosition(marketId: string, outcome: Outcome): Position | undefined;
  /** Subscribe to status changes for a single order. */
  onOrderUpdate(orderId: string, listener: (order: Order) => void): () => void;

  /**
   * Paper-only: push a synthetic UP-outcome mid into the simulated book. Real
   * implementations have a real book and should leave this undefined.
   */
  setMid?(marketId: string, upMid: number): void;
  /**
   * Paper-only: force settle open positions at resolution. Real Polymarket
   * markets settle automatically via Chainlink/UMA on-chain; implementations
   * against the real CLOB should return realized PnL from their own ledger
   * (or undefined to skip per-window PnL reporting).
   */
  settleMarket?(marketId: string, resolution: Outcome): number;
}
