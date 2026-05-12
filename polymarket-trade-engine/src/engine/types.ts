export type Asset = "BTC" | "ETH" | "SOL" | "XRP";

export type Outcome = "UP" | "DOWN";

export type MarketState =
  | "scheduled"
  | "starting"
  | "running"
  | "ending"
  | "settled";

export interface Market {
  id: string;
  asset: Asset;
  windowStart: number;
  windowEnd: number;
  priceToBeat: number;
  state: MarketState;
  resolution?: Outcome;
  resolutionPrice?: number;
}

export interface PriceTick {
  source: string;
  asset: Asset;
  price: number;
  timestamp: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface OrderBookSnapshot {
  marketId: string;
  outcome: Outcome;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}

export type OrderSide = "BUY" | "SELL";
export type OrderStatus = "matched" | "mined" | "confirmed" | "rejected";

export interface Order {
  id: string;
  marketId: string;
  outcome: Outcome;
  side: OrderSide;
  size: number;
  limitPrice: number;
  status: OrderStatus;
  filledSize: number;
  filledPrice?: number;
  createdAt: number;
  settledAt?: number;
}

export interface Position {
  marketId: string;
  outcome: Outcome;
  shares: number;
  averagePrice: number;
}

export interface FillResult {
  pnl: number;
  realized: number;
  resolution?: Outcome;
}
