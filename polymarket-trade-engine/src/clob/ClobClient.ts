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
}
