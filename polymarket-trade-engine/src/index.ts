import { Engine } from "./engine/Engine.js";
import { PaperClobClient } from "./clob/PaperClobClient.js";
import { PolymarketClobClient } from "./clob/PolymarketClobClient.js";
import type { ClobClient } from "./clob/ClobClient.js";
import { SimulatedFeed } from "./feeds/SimulatedFeed.js";
import { BinanceFeed } from "./feeds/BinanceFeed.js";
import type { PriceFeed } from "./feeds/PriceFeed.js";
import { Logger } from "./logging/Logger.js";
import { HoldToResolutionStrategy } from "./strategy/examples/HoldToResolutionStrategy.js";
import { LateEntryStrategy } from "./strategy/examples/LateEntryStrategy.js";
import type { StrategyFactory } from "./strategy/Strategy.js";
import { loadRuntimeConfig, type ClobKind, type FeedKind } from "./config.js";

interface CliArgs {
  command: "simulate";
  strategy: "late-entry" | "hold-to-resolution";
  windows: number;
  windowSeconds: number;
  startingUsdc: number;
  startPrice: number;
  feed?: FeedKind;
  clob?: ClobKind;
}

function parseArgs(argv: string[]): CliArgs {
  const args: Partial<CliArgs> = {
    command: "simulate",
    strategy: "late-entry",
    windows: 4,
    windowSeconds: 30,
    startingUsdc: 1_000,
    startPrice: 67_000,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "simulate":
        args.command = "simulate";
        break;
      case "--strategy":
        args.strategy = argv[++i] as CliArgs["strategy"];
        break;
      case "--windows":
        args.windows = Number(argv[++i]);
        break;
      case "--window-seconds":
        args.windowSeconds = Number(argv[++i]);
        break;
      case "--starting-usdc":
        args.startingUsdc = Number(argv[++i]);
        break;
      case "--start-price":
        args.startPrice = Number(argv[++i]);
        break;
      case "--feed":
        args.feed = argv[++i] as FeedKind;
        break;
      case "--clob":
        args.clob = argv[++i] as ClobKind;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith("--")) {
          console.error(`Unknown flag: ${arg}`);
          printHelp();
          process.exit(1);
        }
    }
  }
  return args as CliArgs;
}

function printHelp() {
  console.log(`Polymarket Trade Engine

Usage:
  npm run simulate -- [options]

Options:
  --strategy <name>        late-entry | hold-to-resolution (default: late-entry)
  --windows <n>            Number of market windows to run (default: 4)
  --window-seconds <n>     Seconds per market window (default: 30 — real Polymarket is 300)
  --starting-usdc <n>      Starting paper balance (default: 1000)
  --start-price <n>        Starting BTC price for simulated feed (default: 67000)
  --feed <name>            simulated | binance (default: simulated; can also set POLYMARKET_FEED)
  --clob <name>            paper | polymarket (default: paper; can also set POLYMARKET_CLOB)

Real components (opt-in, see README):
  POLYMARKET_CLOB=polymarket POLYMARKET_MODE=dry-run npm run simulate -- --feed binance
`);
}

const strategies: Record<CliArgs["strategy"], StrategyFactory> = {
  "late-entry": () => new LateEntryStrategy(),
  "hold-to-resolution": () => new HoldToResolutionStrategy(),
};

async function main() {
  const args = parseArgs(process.argv);
  const env = loadRuntimeConfig();
  const feedKind: FeedKind = args.feed ?? env.feed;
  const clobKind: ClobKind = args.clob ?? env.clob;

  const logger = new Logger({
    scope: "app",
    file: `simulate-${Date.now()}.jsonl`,
    minLevel: "info",
  });

  const factory = strategies[args.strategy];
  if (!factory) {
    logger.error("unknown strategy", { strategy: args.strategy });
    process.exit(1);
  }

  logger.info("runtime config", {
    feed: feedKind,
    clob: clobKind,
    polymarketMode: clobKind === "polymarket" ? env.polymarketMode : "n/a",
    maxOrderNotionalUsdc: env.maxOrderNotionalUsdc,
  });

  const feed: PriceFeed = buildFeed(feedKind, args, logger);
  const clob: ClobClient = buildClob(clobKind, env, args, logger);

  let getBalance: () => number;
  if (clob instanceof PaperClobClient) {
    getBalance = () => clob.usdcBalance;
  } else {
    getBalance = () => args.startingUsdc;
  }

  const startingBalance = args.startingUsdc;
  let totalPnl = 0;

  const engine = new Engine({
    asset: "BTC",
    windowMs: args.windowSeconds * 1_000,
    maxWindows: args.windows,
    strategyFactory: factory,
    clob,
    priceFeed: feed,
    logger,
    onWindowSettled: (market, result) => {
      totalPnl += result.pnl;
      logger.info("window summary", {
        market: market.id,
        resolution: market.resolution,
        priceToBeat: market.priceToBeat,
        resolutionPrice: market.resolutionPrice,
        pnl: round(result.pnl, 4),
        cumulativePnl: round(totalPnl, 4),
        balance: round(getBalance(), 4),
      });
    },
  });

  process.on("SIGINT", async () => {
    logger.warn("SIGINT received, stopping");
    await engine.stop();
    process.exit(0);
  });

  await engine.start();

  logger.info("final summary", {
    strategy: args.strategy,
    windows: args.windows,
    startingBalance,
    finalBalance: round(getBalance(), 4),
    totalPnl: round(totalPnl, 4),
    returnPct: round(((getBalance() - startingBalance) / startingBalance) * 100, 2),
  });
}

function buildFeed(
  kind: FeedKind,
  args: CliArgs,
  logger: Logger,
): PriceFeed {
  if (kind === "binance") {
    return new BinanceFeed({ assets: ["BTC"], logger });
  }
  return new SimulatedFeed({
    source: "sim-binance",
    assets: ["BTC"],
    startPrice: { BTC: args.startPrice, ETH: 0, SOL: 0, XRP: 0 },
    volatility: 0.0025,
    intervalMs: 250,
    seed: 42,
  });
}

function buildClob(
  kind: ClobKind,
  env: ReturnType<typeof loadRuntimeConfig>,
  args: CliArgs,
  logger: Logger,
): ClobClient {
  if (kind === "polymarket") {
    return new PolymarketClobClient({
      mode: env.polymarketMode,
      maxOrderNotional: env.maxOrderNotionalUsdc,
      privateKey: process.env.POLYMARKET_PRIVATE_KEY,
      apiCredentials:
        process.env.POLYMARKET_API_KEY &&
        process.env.POLYMARKET_API_SECRET &&
        process.env.POLYMARKET_API_PASSPHRASE
          ? {
              key: process.env.POLYMARKET_API_KEY,
              secret: process.env.POLYMARKET_API_SECRET,
              passphrase: process.env.POLYMARKET_API_PASSPHRASE,
            }
          : undefined,
      logger,
    });
  }
  return new PaperClobClient({
    startingBalanceUsdc: args.startingUsdc,
    logger,
    miningLatencyMs: 400,
    confirmLatencyMs: 400,
    spread: 0.02,
  });
}

function round(n: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
