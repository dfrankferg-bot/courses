export class RingBuffer<T> {
  private readonly buf: T[];
  private idx = 0;
  private full = false;

  constructor(public readonly capacity: number) {
    this.buf = new Array(capacity);
  }

  push(value: T) {
    this.buf[this.idx] = value;
    this.idx = (this.idx + 1) % this.capacity;
    if (this.idx === 0) this.full = true;
  }

  values(): T[] {
    if (!this.full) return this.buf.slice(0, this.idx);
    return this.buf.slice(this.idx).concat(this.buf.slice(0, this.idx));
  }

  size(): number {
    return this.full ? this.capacity : this.idx;
  }
}

/**
 * Wilder's RSI. Returns undefined until `period + 1` prices have been pushed.
 */
export class RSI {
  private prevPrice?: number;
  private avgGain = 0;
  private avgLoss = 0;
  private samples = 0;
  private current?: number;

  constructor(public readonly period = 14) {}

  push(price: number): number | undefined {
    if (this.prevPrice === undefined) {
      this.prevPrice = price;
      return undefined;
    }
    const change = price - this.prevPrice;
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    this.prevPrice = price;

    if (this.samples < this.period) {
      this.avgGain += gain;
      this.avgLoss += loss;
      this.samples++;
      if (this.samples === this.period) {
        this.avgGain /= this.period;
        this.avgLoss /= this.period;
        this.current = this.compute();
      }
      return this.current;
    }

    this.avgGain = (this.avgGain * (this.period - 1) + gain) / this.period;
    this.avgLoss = (this.avgLoss * (this.period - 1) + loss) / this.period;
    this.current = this.compute();
    return this.current;
  }

  value(): number | undefined {
    return this.current;
  }

  private compute(): number {
    if (this.avgLoss === 0) return 100;
    const rs = this.avgGain / this.avgLoss;
    return 100 - 100 / (1 + rs);
  }
}

/**
 * Simplified ATR over per-tick price changes. Real ATR uses OHLC, but for
 * sub-minute tick streams the absolute return per tick is a reasonable proxy.
 */
export class ATR {
  private prevPrice?: number;
  private buffer: RingBuffer<number>;
  private current?: number;

  constructor(public readonly period = 14) {
    this.buffer = new RingBuffer<number>(period);
  }

  push(price: number): number | undefined {
    if (this.prevPrice === undefined) {
      this.prevPrice = price;
      return undefined;
    }
    const tr = Math.abs(price - this.prevPrice);
    this.prevPrice = price;
    this.buffer.push(tr);

    if (this.buffer.size() < this.period) return undefined;
    const values = this.buffer.values();
    const sum = values.reduce((a, b) => a + b, 0);
    this.current = sum / values.length;
    return this.current;
  }

  value(): number | undefined {
    return this.current;
  }
}

/** Absolute divergence between two price sources, e.g. Binance vs Chainlink. */
export class PriceDivergence {
  private a?: number;
  private b?: number;

  pushA(price: number) {
    this.a = price;
  }
  pushB(price: number) {
    this.b = price;
  }

  /** Returns (a - b) / mid, or undefined if either side is missing. */
  value(): number | undefined {
    if (this.a === undefined || this.b === undefined) return undefined;
    const mid = (this.a + this.b) / 2;
    if (mid === 0) return 0;
    return (this.a - this.b) / mid;
  }
}
