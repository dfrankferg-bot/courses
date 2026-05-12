# Architecture

This engine is built around two ideas:

1. **Lifecycles, not loops.** Each market window owns its own state machine —
   the engine never runs business logic inline. The lifecycle handles
   subscribing/unsubscribing to ticks, calling strategy hooks, translating
   underlying prices to market mids, and settling at the end.
2. **A single strategy contract.** A strategy is a class with three hooks
   (`onStart`, `onTick`, `onEnd`) and access to a `StrategyContext` that
   exposes `buy`, `sell`, `orderBook`, and indicators. The engine can host any
   strategy without changing.

## Component graph

```
                          ┌──────────────────────┐
                          │       Engine         │
                          │  (early-bird sched.) │
                          └──────────┬───────────┘
                                     │ spawns one per window
                                     ▼
                          ┌──────────────────────┐       ┌────────────────┐
                          │   MarketLifecycle    │──────▶│   Strategy     │
                          │  scheduled→started→  │       │  (onStart,     │
                          │   running→ending→    │       │   onTick,      │
                          │      settled         │       │   onEnd)       │
                          └─────────┬────────────┘       └──────┬─────────┘
                                    │ ticks                     │ buy/sell
                                    ▼                           ▼
                          ┌──────────────────────┐    ┌────────────────────┐
                          │      PriceFeed       │    │    ClobClient      │
                          │  (Simulated / real)  │    │ (Paper / real CLOB)│
                          └──────────────────────┘    └────────────────────┘
                                    │                           │
                                    ▼                           ▼
                          ┌──────────────────────┐    ┌────────────────────┐
                          │       Indicators     │    │ matched→mined→     │
                          │  (RSI, ATR, divrg.)  │    │   confirmed lifecyc│
                          └──────────────────────┘    └────────────────────┘
```

## Market lifecycle states

```
scheduled
   │  Engine.scheduleNextWindow created the market; ticks not yet wired.
   ▼
starting
   │  strategy.onStart(ctx) called. The strategy can pre-allocate indicators
   │  and pre-stage orders here.
   ▼
running
   │  Lifecycle subscribed to priceFeed. Every tick:
   │    1. Update internal lastUnderlying.
   │    2. Translate price → market mid via pricer().
   │    3. Push mid into PaperClobClient so order books reprice.
   │    4. Call strategy.onTick(ctx, tick).
   ▼
ending
   │  Wall-clock window has elapsed. Lifecycle unsubscribes from the feed,
   │  determines resolution from lastUnderlying vs priceToBeat, and calls
   │  strategy.onEnd(ctx).
   ▼
settled
   │  PaperClobClient.settleMarket() pays out remaining open positions and
   │  returns the realized PnL (round-trip closes + settlement payouts).
   ▼
```

## Order lifecycle

This mirrors Polymarket's hybrid CLOB:

```
placeOrder(...)
     │
     ▼
  matched           Off-chain match. Order id assigned. Funds reserved but
     │              shares NOT yet in the position.
     │ miningLatencyMs
     ▼
   mined            Trade has gone on-chain. filledSize / filledPrice set.
     │              Still not safely sellable in case of reorg.
     │ confirmLatencyMs
     ▼
  confirmed         Final. applyFill() updates balance + position. This is
                    when the position becomes visible via getPosition().
```

Strategies that try to sell shares before `confirmed` will get rejected at the
order-book layer — same constraint as live Polymarket.

## Why an "early-bird" scheduler

The engine always schedules the *next* window, never the current one. Two
reasons:

1. **Determinism for `onStart`.** Strategies can rely on running setup code
   before any tick lands. Setting up indicators, reading historical state, or
   placing pre-positioned orders happens cleanly.
2. **No partial windows.** If the engine started in the middle of a window,
   `priceToBeat` would be the price at startup, not the price at window open
   — and the strategy would be racing to catch up against an unknown amount
   of elapsed time.

The scheduler aligns window boundaries to the wall clock (`Math.ceil(now /
windowMs) * windowMs`), so back-to-back windows are contiguous.

## Pricing model

The paper CLOB doesn't have a real counterparty, so the engine fakes a market
mid from the underlying price. `MarketLifecycle.defaultPricer` does:

```
z = (price - priceToBeat) / max(1, priceToBeat * slope)
timeFactor = 1 + (1 - remainingMs/totalMs) * 2
upMid = sigmoid(z * timeFactor)
```

As the window approaches resolution, `timeFactor` rises and the mid snaps
toward 0 or 1 — same convexity you see on real Polymarket short-duration
markets. The pricer is pluggable; pass a custom one to `MarketLifecycle` if
you want a different shape.

## Logging

`Logger` writes JSONL records that look like:

```json
{"ts":1715478123456,"level":"info","scope":"app:engine:market[BTC-... late-entry]:late-entry","msg":"entered","data":{"outcome":"UP","price":0.21,"rsi":67.4,"atr":42.1}}
```

These records are designed to be replayed into a chart tool. Each tick the
strategy makes a decision on, every order state transition, and every
settlement appear as separate records. Group by `scope` containing the market
id to slice by window.

## Plugging in real components

| Slot          | Paper implementation       | What to replace it with                                          |
|---------------|----------------------------|------------------------------------------------------------------|
| `PriceFeed`   | `SimulatedFeed`            | Binance/Coinbase websocket + Chainlink polling feed              |
| `ClobClient`  | `PaperClobClient`          | `@polymarket/clob-client` wrapper with EIP-712 signing           |
| Pricer        | `defaultPricer` sigmoid    | Real Polymarket order-book snapshots (subscribe via CLOB client) |
| Logger sink   | JSONL file                 | Whatever you use for production logs (Loki, Datadog, ...)        |

The `Engine`, `MarketLifecycle`, and `Strategy` contract stay the same in all
cases. That's the point.
