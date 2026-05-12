# Polymarket Trade Engine

A lifecycle-based trading engine skeleton for Polymarket 5-minute BTC up/down
markets. This is the blueprint described in
[Aleiah Lock's article](https://x.com/aleiahlock/status/2052400685468057632)
built as a runnable starting point. The original open-source reference engine
lives at
[KaustubhPatange/polymarket-trade-engine](https://github.com/KaustubhPatange/polymarket-trade-engine);
this version is an independent re-implementation of the same architecture.

> **This is educational code, not a production trading bot.** The CLOB client
> here is a paper-wallet simulator. There is no real Polymarket connectivity.
> Read the architecture doc, write your own strategy, simulate it, then decide
> whether to wire it into the real CLOB yourself.

## What's in here

```
src/
├── engine/
│   ├── Engine.ts           # Top-level "early-bird" orchestrator
│   ├── MarketLifecycle.ts  # start -> run -> end -> settled per market
│   └── types.ts            # Market, Order, Position, etc.
├── strategy/
│   ├── Strategy.ts         # Strategy interface + StrategyContext API
│   └── examples/
│       ├── HoldToResolutionStrategy.ts
│       └── LateEntryStrategy.ts
├── clob/
│   ├── ClobClient.ts       # Abstraction over Polymarket's hybrid CLOB
│   └── PaperClobClient.ts  # Paper wallet with matched -> mined -> confirmed
├── feeds/
│   ├── PriceFeed.ts        # Price feed interface
│   └── SimulatedFeed.ts    # Random-walk feed for backtests
├── indicators/
│   └── indicators.ts       # RSI, ATR, cross-source price divergence
├── logging/
│   └── Logger.ts           # JSONL logger for chart visualisation
└── index.ts                # CLI entrypoint
```

## Quick start

```bash
npm install
npm run typecheck

# Default: late-entry strategy, 4 windows of 30 simulated seconds each.
npm run simulate

# Buy-and-hold baseline.
npm run simulate:hold

# Late-entry with longer windows / different starting price.
npx tsx src/index.ts simulate \
    --strategy late-entry \
    --windows 8 \
    --window-seconds 60 \
    --start-price 67000 \
    --starting-usdc 2000
```

Every run produces a JSONL log file in `logs/simulate-<timestamp>.jsonl`. Pipe
it into your favourite chart tool to visualise entries, exits, and PnL per
market window — this is the "chart visualization tool" hook from the article.

## Lifecycle, briefly

The engine is a state machine on top of market windows:

```
scheduled  ─►  starting  ─►  running  ─►  ending  ─►  settled
              (onStart)     (onTick…)    (onEnd)
```

Key invariants:

- The engine always schedules the **next** window, never the current one
  (`early-bird`). This guarantees every strategy sees its `onStart` before any
  tick arrives.
- Exactly one strategy instance per market window. Spawn it fresh in `start`;
  it dies in `end`.
- Orders flow through the same three-stage settlement as real Polymarket:
  `matched → mined → confirmed`. Until `confirmed`, your shares can't be sold.
  The paper client enforces this with configurable latencies.

The full state machine and event flow are in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Writing a strategy

A strategy is a class with three hooks and access to a `StrategyContext`:

```ts
import type { Strategy, StrategyContext } from "../Strategy.js";
import type { PriceTick } from "../../engine/types.js";

export class MyStrategy implements Strategy {
  readonly name = "my-strategy";

  onStart(ctx: StrategyContext) { /* set up indicators */ }

  async onTick(ctx: StrategyContext, tick: PriceTick) {
    const book = ctx.orderBook("UP");
    if (/* edge */) {
      await ctx.buy("UP", 25, book.asks[0].price);
    }
  }

  onEnd(ctx: StrategyContext) { /* cleanup, log final state */ }
}
```

Then register it in `src/index.ts` next to `late-entry` and `hold-to-resolution`.

The two reference strategies show the contrast the article highlights:

- **`HoldToResolutionStrategy`** — the early version. One buy, hold to
  resolution. Wins ~95% of the time and gives back too much on the other 5%.
- **`LateEntryStrategy`** — the late-entry buy-and-sell version. Skips the
  first 40% of the window, only enters when RSI extremes line up, takes
  profit on small moves, and stops out before resolution. Trades less, holds
  less, gives up less.

## Going from paper to real

There are two real-component slots wired up behind feature flags, both off by
default:

| Slot       | Default      | Real option        | How to enable                       |
|------------|--------------|--------------------|-------------------------------------|
| Price feed | `simulated`  | `binance` (live WS)| `--feed binance` or `POLYMARKET_FEED=binance`           |
| CLOB       | `paper`      | `polymarket` (stub)| `--clob polymarket` or `POLYMARKET_CLOB=polymarket`     |

### BinanceFeed (already functional)

```bash
npm run simulate -- --feed binance --strategy hold-to-resolution --windows 2 --window-seconds 60
```

This connects to Binance's public spot trade websocket — no API key required.
The feed auto-reconnects with exponential backoff. Cross-source divergence
needs at least one more source (Coinbase, Chainlink); add another `PriceFeed`
implementation and fan-in.

### PolymarketClobClient (stub, opt-in)

The Polymarket client has two modes, both gated:

```bash
# Dry-run: real config flow, fake orders. Safe to leave running.
POLYMARKET_CLOB=polymarket POLYMARKET_MODE=dry-run \
  npm run simulate -- --feed binance --windows 2

# Live: explicitly throws "not implemented" because actually sending orders
# requires you to fill in the @polymarket/clob-client integration yourself.
POLYMARKET_CLOB=polymarket \
  POLYMARKET_MODE=live POLYMARKET_LIVE=1 \
  POLYMARKET_PRIVATE_KEY=0x... \
  POLYMARKET_API_KEY=... POLYMARKET_API_SECRET=... POLYMARKET_API_PASSPHRASE=... \
  npm run simulate -- --feed binance --windows 2
```

Safety controls baked in:

- `POLYMARKET_MODE` defaults to `dry-run`; live needs both `MODE=live` **and**
  `POLYMARKET_LIVE=1` to start.
- `POLYMARKET_MAX_NOTIONAL` (default `25` USDC) is a hard ceiling on a single
  order's notional, enforced before any network call.
- `live` mode currently throws `notImplemented` for every method — by
  design. Enabling real trading requires you to:
  1. `npm install @polymarket/clob-client ethers`
  2. Replace each `notImplemented(...)` in `PolymarketClobClient.ts` with the
     real `@polymarket/clob-client` call.
  3. Pre-approve USDC + CTF spending on the CTF Exchange contract from your
     wallet, off-engine.
  4. Test on Polymarket's Amoy testnet before mainnet.

This is deliberate friction. The other items on the path to live trading
(real market-id discovery via Gamma API, on-chain settlement watching,
crash-recovery persistence, daily loss-limit kill switch) are still TODO and
should land before any real money moves.

### What's still missing for real trading

- Wallet management and EIP-712 signing wired to the CLOB client.
- Polymarket Gamma API queries to resolve the actual 5-minute market IDs and
  token IDs per window (currently the Engine fabricates them locally).
- Real order-book subscription (the paper client and the stub both fake
  books).
- A persistence layer so a crash mid-window doesn't lose state.
- Daily loss limit + kill switch at the engine level.
- Backtesting against captured historical order book data, not just a random
  walk feed.

## References

- Original article: <https://x.com/aleiahlock/status/2052400685468057632>
- Reference open-source engine: <https://github.com/KaustubhPatange/polymarket-trade-engine>
- Polymarket docs: <https://docs.polymarket.com/>
- UMA Optimistic Oracle: <https://docs.uma.xyz/>
- Chainlink price feeds: <https://docs.chain.link/data-feeds>
