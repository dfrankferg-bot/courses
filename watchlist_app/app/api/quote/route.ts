import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type Quote = {
  symbol: string;
  price: number | null;
  previousClose: number | null;
  currency: string | null;
  shortName: string | null;
};

async function fetchQuote(symbol: string): Promise<Quote> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?interval=1d&range=1d`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; WatchlistApp/1.0; +https://vercel.com)",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return {
      symbol,
      price: null,
      previousClose: null,
      currency: null,
      shortName: null,
    };
  }

  const data = (await res.json()) as {
    chart?: {
      result?: Array<{
        meta?: {
          regularMarketPrice?: number;
          chartPreviousClose?: number;
          previousClose?: number;
          currency?: string;
          shortName?: string;
          symbol?: string;
        };
      }>;
      error?: unknown;
    };
  };

  const meta = data.chart?.result?.[0]?.meta;
  if (!meta) {
    return {
      symbol,
      price: null,
      previousClose: null,
      currency: null,
      shortName: null,
    };
  }

  return {
    symbol: meta.symbol ?? symbol,
    price: meta.regularMarketPrice ?? null,
    previousClose: meta.previousClose ?? meta.chartPreviousClose ?? null,
    currency: meta.currency ?? null,
    shortName: meta.shortName ?? null,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get("symbols") ?? "";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 25);

  if (symbols.length === 0) {
    return NextResponse.json({ quotes: [] });
  }

  const quotes = await Promise.all(symbols.map(fetchQuote));
  return NextResponse.json({ quotes });
}
