import type { Asset, PriceTick } from "../engine/types.js";
import type { PriceFeed, TickListener } from "./PriceFeed.js";

export interface SimulatedFeedOptions {
  source: string;
  assets: Asset[];
  startPrice: Record<Asset, number>;
  /** Approximate per-tick price drift as a fraction (e.g. 0.0001 = 0.01%). */
  drift?: number;
  /** Per-tick volatility as a fraction. */
  volatility?: number;
  /** Tick interval in ms. */
  intervalMs?: number;
  /** Optional seed for deterministic runs. */
  seed?: number;
}

export class SimulatedFeed implements PriceFeed {
  readonly source: string;
  private readonly assets: Asset[];
  private prices: Map<Asset, number>;
  private readonly drift: number;
  private readonly volatility: number;
  private readonly intervalMs: number;
  private readonly listeners = new Map<Asset, Set<TickListener>>();
  private timer?: NodeJS.Timeout;
  private rng: () => number;
  private lastTicks = new Map<Asset, PriceTick>();

  constructor(opts: SimulatedFeedOptions) {
    this.source = opts.source;
    this.assets = opts.assets;
    this.prices = new Map(this.assets.map((a) => [a, opts.startPrice[a]]));
    this.drift = opts.drift ?? 0;
    this.volatility = opts.volatility ?? 0.0008;
    this.intervalMs = opts.intervalMs ?? 1000;
    this.rng = makeRng(opts.seed ?? Date.now());
    for (const a of this.assets) this.listeners.set(a, new Set());
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tickAll(), this.intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  subscribe(asset: Asset, listener: TickListener): () => void {
    const set = this.listeners.get(asset);
    if (!set) throw new Error(`Feed ${this.source} not configured for ${asset}`);
    set.add(listener);
    return () => set.delete(listener);
  }

  latest(asset: Asset): PriceTick | undefined {
    return this.lastTicks.get(asset);
  }

  private tickAll() {
    const now = Date.now();
    for (const asset of this.assets) {
      const last = this.prices.get(asset)!;
      const shock = (this.rng() - 0.5) * 2 * this.volatility;
      const next = Math.max(0.01, last * (1 + this.drift + shock));
      this.prices.set(asset, next);
      const tick: PriceTick = {
        source: this.source,
        asset,
        price: next,
        timestamp: now,
      };
      this.lastTicks.set(asset, tick);
      const set = this.listeners.get(asset)!;
      for (const l of set) l(tick);
    }
  }
}

function makeRng(seed: number): () => number {
  let state = (seed >>> 0) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0xffffffff;
  };
}
