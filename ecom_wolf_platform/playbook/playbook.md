# The Million Dollar E-Commerce Playbook — Structured Guide

> Source: *"THE MILLION DOLLAR E-COMMERCE PLAYBOOK"* by The Ecom Wolf.
> This file is a faithful, structured extraction of the playbook's actionable
> content. Marketing/testimonial copy has been condensed; the operational steps,
> rules, formulas, and thresholds are preserved verbatim in meaning.
>
> This guide is the single source of truth that the automated agents in
> `ecom_platform/` reason over. The machine-readable version is
> [`playbook.json`](./playbook.json).

## The 4 Pillars

A store fails if any one of these is off. Master them one at a time:

1. **Product Selection** — find products that actually sell.
2. **Website Optimization** — a site built to convert.
3. **Online Advertising** — ads people click that produce sales.
4. **Logistics & Brand Building** — reliable fulfillment, then private label.

---

## Pillar 1 — Product Selection

**Core method: Reverse Engineering** — research backwards from what is *already
proven to sell*. Don't reinvent the wheel.

### Steps
1. **Find demand.** Use Kalodata to see products in high demand, or reverse-
   engineer TikTok / TikTok Shop:
   - Search TikTok for `"TikTok made me buy it"`, `"TikTok finds"`, `"hot products"`.
   - Look for products with viral videos.
   - On TikTok Shop, find products with **10k+ units** sold.
2. **Validate pricing** — Google the product → **Shopping tab**.
   - ✅ Only consider Shopify brands / direct-to-consumer sites.
   - ❌ Ignore Amazon, eBay, Temu.
3. **Find cost of goods (COGS).**
   - First check **Zendrop**.
   - If not listed, cross-check **AliExpress** for an *estimate only* (do not source there).
4. **Calculate profit margin** (see formula below).

### Product selection criteria (a winner must hit all four)
1. Solves a **real problem**.
2. Shows **demand**.
3. Has a **≥ 50% profit margin**.
4. Can be sold for **$100+**, or the store has an **AOV of $100+**.

### Formula
- `profit_margin = (selling_price - cogs) / selling_price`
- Target: **≥ 50%** (covers ad spend, team, and still scales).
- Example: `($150 - $50) / $150 = 66%`.

---

## Pillar 2 — Website Optimization

Goal: conversion rate of **3–8%** (industry average is ~1%).

### Setup steps
1. Create the store on **Shopify**.
2. Buy a domain (e.g., GoDaddy).
3. Connect the domain to Shopify (Settings → Domains).
4. Configure shipping, collections, and other backend settings.
5. Build product pages with an AI page builder (e.g., PagePilot) by pasting a
   product link; build the home page inside Shopify (drag/drop, no code).

### Conversion checklist
- Not cluttered — keep it simple (start with the **Debut** theme).
- **No pop-ups** when starting out.
- Strong color coordination — **max 3 colors**.
- Easy checkout — "Add to cart" goes to the **cart page**, not straight to checkout.
- Crisp, clear product images.
- Copy focuses on **problems solved + benefits**, not features.

---

## Pillar 3 — Online Advertising (Facebook first)

Strategy: start on **Facebook** for fast scalability; add Google ads only once
doing **$1k/day** on Facebook ("Double Whammy Method"). This playbook covers
Facebook only.

### Before starting
- Create a **Meta Business Manager**.
- Set up the **Facebook Pixel** for tracking.

### Creative sourcing
- Leverage videos that are **already viral** for the product.
- Kalodata: download the top revenue-generating videos for the product; edit in CapCut or via a Fiverr editor.
- TikTok: find videos with **100k+ views**, apply the virality check, download with snaptik.com, edit in CapCut.
- **Virality check:** `viral_threshold = views / 5`. If the creator has **fewer
  followers** than this threshold, the video is viral.

### The 3-2-2 ABO launch method
- **3** videos
- **2** ad copies
- **2** headlines
- Structure: 1 campaign → 1 broad ad set → 3 videos in the ad set, optimized for conversions.

### KPIs to track
- **CPA** — Cost Per Acquisition
- **ROAS** — Return on Ad Spend
- **CTR** — Click Through Rate
- **CPM** — Cost Per 1,000 Impressions

### Budget & tips
- Start at **$30–$50/day**; only increase budget based on KPIs.
- Use AI (e.g., ChatGPT) for ad copy (primary text, headlines) and site copy.
- Always reverse-engineer top Shopify competitors (not Amazon/Temu/AliExpress) and make yours better.

---

## Pillar 4 — Logistics & Brand Building

Start with **dropshipping** to mitigate inventory risk. Move to **private label
/ bulk** once at **15–20 orders/day**.

### Supplier options
Zendrop, CJ Dropshipping, DSers, AutoDS. (Bulk: Alibaba.)

### Supplier workflow
1. Research & choose a supplier matching shipping time, niche, branding to your goals.
2. Create an account, explore the catalog.
3. Source products in-niche; filter by shipping location; compare prices.
4. Integrate with your store (most integrate with Shopify).
5. Customize & list products (descriptions, price, images; branding where available).
6. Automate order fulfillment (AutoDS / DSers).
7. Monitor supplier reliability, shipping times, product quality.
8. Communicate with suppliers; build relationships.

### Rules & thresholds
- At **15–20 orders/day**, get a dedicated supplier contact (WhatsApp/Skype) for better pricing & shipping.
- **Never source from AliExpress** for fulfillment (estimate pricing only).
- Customers should **not wait more than 12 days** for delivery.
- For bulk on Alibaba: supplier in business **> 1 year**, always get **samples**.
- Use a **3PL** for bulk fulfillment (no warehouse needed).

### Economics
- Dropshipping store sells for **1–2× revenue**; a brand sells for **4–10×+**.
- Unit-economics example: sell $150, COGS $50, ~$50 to acquire, ~$45 net/unit →
  **~5 units/day ≈ $6k/month profit**.

---

## Key formulas (used by the agents)

| Name | Formula | Rule |
|------|---------|------|
| Profit margin | `(price - cogs) / price` | ≥ 50% |
| Virality threshold | `views / 5` | viral if `followers < threshold` |
| Units for monthly profit | `target_profit / (net_per_unit * 30)` | — |
| Bulk-switch trigger | orders/day | ≥ 15–20 |
| Max delivery time | days | ≤ 12 |
