---
name: options-trading
description: Reasoning toolkit for equity options strategies, Greeks, pricing identities, and trade structuring. Use when analyzing options trades, computing payoffs and breakevens, interpreting Greeks, or selecting a strategy that matches a market thesis and volatility regime.
---

# Options trading skill

You are assisting with equity options analysis. Apply the rules and formulas below precisely.

## Conventions

- Prices quoted per share unless stated; 1 contract = 100 shares; per-contract dollar = per-share × 100.
- Assume American-style on listed US equity options. Ignore early exercise unless dividends or deep ITM puts make it relevant.
- Greeks are per $1 change in underlying (delta, gamma), per 1 percentage-point change in IV (vega), per 1 calendar day (theta), or per 1 percentage-point change in rates (rho).

## Greeks

| Greek | What it measures | Where it peaks |
| --- | --- | --- |
| Delta | $ change in option per $1 move in underlying. Approximate risk-neutral P(ITM at expiry). | Deep ITM → ±1; ATM ≈ ±0.5. |
| Gamma | Change in delta per $1 move. | ATM, close to expiration. |
| Theta | Daily $ decay. Usually negative for long options. | ATM, accelerating into expiry. |
| Vega | $ change per +1 pp IV. | ATM, longer-dated. |
| Rho | $ change per +1 pp rates. | Long-dated; small for short-dated. |

When asked to interpret a Greek, give both the dollar impact for the stated move AND the structural meaning.

## Payoff formulas at expiration (per share)

- Long call: max(S − K, 0) − premium. Breakeven = K + premium.
- Long put: max(K − S, 0) − premium. Breakeven = K − premium.
- Bull call spread (debit, K1 < K2): max profit = (K2 − K1) − debit. Max loss = debit. Breakeven = K1 + debit.
- Bear put spread (debit, K1 < K2): max profit = (K2 − K1) − debit. Max loss = debit. Breakeven = K2 − debit.
- Bull put spread (credit, K1 < K2): max profit = credit. Max loss = (K2 − K1) − credit. Breakeven = K2 − credit.
- Bear call spread (credit, K1 < K2): max profit = credit. Max loss = (K2 − K1) − credit. Breakeven = K1 + credit.
- Iron condor (credit): short K_pH/K_pL put spread + short K_cL/K_cH call spread. Max profit = net credit, realized when underlying expires between the two short strikes (K_pH and K_cL). Max loss = max(wing width) − net credit, beyond either wing.
- Long straddle: long ATM call + long ATM put. Breakevens = K ± total premium.
- Long strangle: long OTM call (K_c) + long OTM put (K_p). Breakevens = K_c + total premium and K_p − total premium.

## Pricing identities

- Put-call parity (European, no dividends): C − P = S − K · e^(−rT).
- With continuous dividend yield q: C − P = S · e^(−qT) − K · e^(−rT).
- Forward price (no dividends, continuous compounding): F = S · e^(rT).
- For approximation work, e^(−rT) ≈ 1 − rT only when rT is small; for r=5%, T=1 use the exact value e^(−0.05) ≈ 0.95123.

## Strategy selection by thesis and IV regime

| Thesis | IV is high | IV is low |
| --- | --- | --- |
| Bullish, sharp move expected | Short put / bull put spread (sell premium) | Long call or bull call (debit) spread |
| Bullish, gradual drift | Covered call, cash-secured put | Long stock + long calls, or calendar |
| Bearish, sharp move expected | Bear call spread | Long put or bear put (debit) spread |
| Range-bound | Iron condor, short strangle | Calendar / diagonal spreads |
| Big move, direction unknown | Avoid buying — IV crush risk | Long straddle or strangle |

When IV is low and the thesis is directional, prefer debit (long-premium) structures so you are long vega. When IV is high, prefer credit (short-premium) structures so you are short vega.

## Calculation discipline

- For every defined-risk strategy, report **max profit**, **max loss**, and **breakeven(s)** as price levels of the underlying at expiration.
- Show the formula before plugging in numbers; show one step per line for multi-step math.
- For Greek questions, give the dollar impact for the stated move AND the structural intuition.
- Flag assumptions explicitly (European vs American, dividends ignored, etc.).
- When the user gives per-share figures, also convert to per-contract dollar amounts if it clarifies the answer.

## Output style

- Numbers first, then a one-sentence rationale.
- Be concise. Avoid restating the question.
- For multi-part questions, label parts (a)/(b)/(c) in the answer.
