import type { Asset, PriceTick } from "../engine/types.js";

export type TickListener = (tick: PriceTick) => void;

export interface PriceFeed {
  readonly source: string;
  start(): Promise<void> | void;
  stop(): Promise<void> | void;
  subscribe(asset: Asset, listener: TickListener): () => void;
  latest(asset: Asset): PriceTick | undefined;
}
