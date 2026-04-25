# Stock Watchlist

A minimal Next.js stock watchlist. Add tickers, see live quotes, and persist your list in the browser.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Edge API route that proxies Yahoo Finance's public chart endpoint
- `localStorage` for the watchlist (no database required)

## Develop

```bash
cd watchlist_app
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

From inside `watchlist_app/`:

```bash
npx vercel        # first deploy / link
npx vercel --prod # production deploy
```

No environment variables are required.

## Notes

Quote data comes from Yahoo Finance's unofficial public chart endpoint (`query1.finance.yahoo.com/v8/finance/chart/<symbol>`). It is rate-limited and not guaranteed; if you outgrow it, swap `app/api/quote/route.ts` for a provider with an API key (Finnhub, Alpha Vantage, etc.).
