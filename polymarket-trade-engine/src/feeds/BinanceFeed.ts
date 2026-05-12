import type { Asset, PriceTick } from "../engine/types.js";
import type { Logger } from "../logging/Logger.js";
import type { PriceFeed, TickListener } from "./PriceFeed.js";

const SYMBOL: Record<Asset, string> = {
  BTC: "btcusdt",
  ETH: "ethusdt",
  SOL: "solusdt",
  XRP: "xrpusdt",
};

export interface BinanceFeedOptions {
  assets: Asset[];
  logger: Logger;
  /** Optional override for testing. */
  endpoint?: string;
  /** Reconnect backoff cap in ms. */
  maxBackoffMs?: number;
}

interface TradeMessage {
  e: "trade";
  s: string;
  p: string;
  T: number;
}

/**
 * Live BTC/ETH/SOL/XRP trade feed off Binance's public spot websocket. Public
 * data, no API key required. Reconnects with exponential backoff.
 *
 * NOTE: Binance is the highest-volume reference, but if your strategy depends
 * on cross-source divergence, also add a Coinbase feed and the on-chain
 * Chainlink feed Polymarket uses for settlement.
 */
export class BinanceFeed implements PriceFeed {
  readonly source = "binance";
  private readonly assets: Asset[];
  private readonly logger: Logger;
  private readonly endpoint: string;
  private readonly maxBackoffMs: number;
  private readonly listeners = new Map<Asset, Set<TickListener>>();
  private readonly lastTicks = new Map<Asset, PriceTick>();
  private readonly symbolToAsset = new Map<string, Asset>();

  private ws?: WebSocket;
  private stopped = false;
  private backoffMs = 1_000;
  private connectTimer?: NodeJS.Timeout;

  constructor(opts: BinanceFeedOptions) {
    this.assets = opts.assets;
    this.logger = opts.logger.child("binance-feed");
    this.maxBackoffMs = opts.maxBackoffMs ?? 30_000;

    const streams = opts.assets
      .map((a) => `${SYMBOL[a]}@trade`)
      .join("/");
    this.endpoint = opts.endpoint ?? `wss://stream.binance.com:9443/stream?streams=${streams}`;

    for (const a of opts.assets) {
      this.listeners.set(a, new Set());
      this.symbolToAsset.set(SYMBOL[a].toUpperCase(), a);
    }
  }

  async start(): Promise<void> {
    if (typeof WebSocket === "undefined") {
      throw new Error(
        "BinanceFeed requires native WebSocket support (Node >= 22).",
      );
    }
    this.stopped = false;
    this.connect();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.ws?.close();
    this.ws = undefined;
  }

  subscribe(asset: Asset, listener: TickListener): () => void {
    const set = this.listeners.get(asset);
    if (!set) throw new Error(`Feed not configured for ${asset}`);
    set.add(listener);
    return () => set.delete(listener);
  }

  latest(asset: Asset): PriceTick | undefined {
    return this.lastTicks.get(asset);
  }

  private connect() {
    if (this.stopped) return;
    this.logger.info("connecting", { endpoint: this.endpoint });
    const ws = new WebSocket(this.endpoint);
    this.ws = ws;

    ws.addEventListener("open", () => {
      this.logger.info("connected");
      this.backoffMs = 1_000;
    });

    ws.addEventListener("message", (ev) => {
      this.handleMessage(ev.data);
    });

    ws.addEventListener("close", (ev) => {
      this.logger.warn("disconnected", { code: ev.code, reason: ev.reason });
      this.scheduleReconnect();
    });

    ws.addEventListener("error", () => {
      this.logger.warn("websocket error");
      try {
        ws.close();
      } catch {
        // ignore
      }
    });
  }

  private scheduleReconnect() {
    if (this.stopped) return;
    const wait = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs);
    this.logger.info("reconnect scheduled", { ms: wait });
    this.connectTimer = setTimeout(() => this.connect(), wait);
  }

  private handleMessage(data: unknown) {
    let parsed: { stream?: string; data?: TradeMessage } | TradeMessage;
    try {
      parsed = JSON.parse(typeof data === "string" ? data : String(data));
    } catch {
      return;
    }

    const trade: TradeMessage | undefined =
      "data" in parsed && parsed.data ? parsed.data : (parsed as TradeMessage);
    if (!trade || trade.e !== "trade") return;

    const asset = this.symbolToAsset.get(trade.s);
    if (!asset) return;

    const price = Number(trade.p);
    if (!Number.isFinite(price)) return;

    const tick: PriceTick = {
      source: this.source,
      asset,
      price,
      timestamp: trade.T,
    };
    this.lastTicks.set(asset, tick);
    const set = this.listeners.get(asset);
    if (!set) return;
    for (const l of set) l(tick);
  }
}
