import { Engine } from "./engine/Engine.js";
import { PaperClobClient } from "./clob/PaperClobClient.js";
import { SimulatedFeed } from "./feeds/SimulatedFeed.js";
import { Logger } from "./logging/Logger.js";
import { HoldToResolutionStrategy } from "./strategy/examples/HoldToResolutionStrategy.js";
import { LateEntryStrategy } from "./strategy/examples/LateEntryStrategy.js";
import type { StrategyFactory } from "./strategy/Strategy.js";

interface CliArgs {
  command: "simulate";
  strategy: "late-entry" | "hold-to-resolution";
  windows: number;
  windowSeconds: number;
  startingUsdc: number;
  startPrice: number;
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
  console.log(`Polymarket Trade Engine — simulator

Usage:
  npm run simulate -- [options]

Options:
  --strategy <name>        late-entry | hold-to-resolution (default: late-entry)
  --windows <n>            Number of market windows to run (default: 4)
  --window-seconds <n>     Seconds per market window (default: 30 — real Polymarket is 300)
  --starting-usdc <n>      Starting paper balance (default: 1000)
  --start-price <n>        Starting BTC price (default: 67000)
`);
}

const strategies: Record<CliArgs["strategy"], StrategyFactory> = {
  "late-entry": () => new LateEntryStrategy(),
  "hold-to-resolution": () => new HoldToResolutionStrategy(),
};

async function main() {
  const args = parseArgs(process.argv);
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

  const feed = new SimulatedFeed({
    source: "sim-binance",
    assets: ["BTC"],
    startPrice: { BTC: args.startPrice, ETH: 0, SOL: 0, XRP: 0 },
    volatility: 0.0025,
    intervalMs: 250,
    seed: 42,
  });

  const clob = new PaperClobClient({
    startingBalanceUsdc: args.startingUsdc,
    logger,
    miningLatencyMs: 400,
    confirmLatencyMs: 400,
    spread: 0.02,
  });

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
        balance: round(clob.usdcBalance, 4),
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
    finalBalance: round(clob.usdcBalance, 4),
    totalPnl: round(totalPnl, 4),
    returnPct: round(((clob.usdcBalance - startingBalance) / startingBalance) * 100, 2),
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
