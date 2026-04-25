"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadTickers, saveTickers } from "@/lib/storage";

type Quote = {
  symbol: string;
  price: number | null;
  previousClose: number | null;
  currency: string | null;
  shortName: string | null;
};

function formatPrice(price: number | null, currency: string | null): string {
  if (price == null) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency ?? "USD",
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return price.toFixed(2);
  }
}

function changePct(price: number | null, prev: number | null): number | null {
  if (price == null || prev == null || prev === 0) return null;
  return ((price - prev) / prev) * 100;
}

export default function Watchlist() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTickers(loadTickers());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveTickers(tickers);
  }, [tickers, hydrated]);

  const refresh = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) {
      setQuotes({});
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/quote?symbols=${encodeURIComponent(symbols.join(","))}`,
      );
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = (await res.json()) as { quotes: Quote[] };
      const next: Record<string, Quote> = {};
      for (const q of data.quotes) next[q.symbol.toUpperCase()] = q;
      setQuotes(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load quotes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    refresh(tickers);
  }, [hydrated, tickers, refresh]);

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const symbol = input.trim().toUpperCase();
    if (!symbol) return;
    if (tickers.includes(symbol)) {
      setInput("");
      return;
    }
    setTickers([...tickers, symbol]);
    setInput("");
  };

  const onRemove = (symbol: string) => {
    setTickers(tickers.filter((t) => t !== symbol));
  };

  const rows = useMemo(
    () =>
      tickers.map((t) => {
        const q = quotes[t];
        const pct = q ? changePct(q.price, q.previousClose) : null;
        return { ticker: t, quote: q, pct };
      }),
    [tickers, quotes],
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Stock Watchlist</h1>
        <button
          type="button"
          onClick={() => refresh(tickers)}
          disabled={loading || tickers.length === 0}
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800 disabled:opacity-40"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <form onSubmit={onAdd} className="mb-6 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add ticker (e.g. AAPL, MSFT, NVDA)"
          className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
        >
          Add
        </button>
      </form>

      {error && (
        <div className="mb-4 rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {hydrated && tickers.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No tickers yet. Add one above to get started.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-left text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-3 py-2">Symbol</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2 text-right">Price</th>
                <th className="px-3 py-2 text-right">Change</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.map(({ ticker, quote, pct }) => (
                <tr key={ticker} className="hover:bg-zinc-900/60">
                  <td className="px-3 py-2 font-medium">{ticker}</td>
                  <td className="px-3 py-2 text-zinc-400">
                    {quote?.shortName ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {quote ? formatPrice(quote.price, quote.currency) : "—"}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      pct == null
                        ? "text-zinc-500"
                        : pct >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                    }`}
                  >
                    {pct == null
                      ? "—"
                      : `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onRemove(ticker)}
                      className="text-xs text-zinc-500 hover:text-red-400"
                      aria-label={`Remove ${ticker}`}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-xs text-zinc-500">
        Quotes via Yahoo Finance. Watchlist saved in your browser.
      </p>
    </div>
  );
}
