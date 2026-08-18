# Helmet Add-On

## What the rider sees

- Every bike card / plan modal shows a subtle "1 helmet included free" nudge (returned with the bike).
- In the dates step (before reserving), one optional add-on row: **Extra helmet** with the choice of
  - Rent — priced by the plan: ₹10/day for daily, ₹100/month for monthly (weekly derived from the day rate)
  - Buy — ₹1,000, keeps it
  - None (default)
- Max 1 extra helmet. The ₹199 reservation stays exactly as-is; the helmet appears as its own line in "amount due at hub" and in the total.
- At the hub (handover step) the rider can still add or remove the extra helmet; the hub summary and inspection accessories reflect the final count.
- My Bike / booking summary shows "Helmets: 1 free + 1 extra (rented / purchased)" and the amount charged.

## Pricing rules

Rates come from the database, not code:

| key | amount |
| --- | --- |
| helmet_daily_rate | ₹10 per day |
| helmet_monthly_rate | ₹100 per month |
| helmet_buy_price | ₹1,000 |
| helmets_included | 1 |

Rented helmet charge = day rate × billed days for daily/weekly plans; month rate for monthly/RTO plans. Bought helmet is a flat one-time amount and is never refunded or returned.

## Technical notes

- Migration: new `public.addon_pricing` table (code, label_key, amount, unit, is_active) with GRANT SELECT to anon+authenticated, GRANT ALL to service_role, RLS enabled with a read-only public policy; seeded with the four rows above. Also add `bookings.extra_helmet_mode text` (NONE | RENT | BUY, default NONE) and `bookings.extra_helmet_amount integer default 0`.
- `src/lib/pricing.ts`: add `helmetCharge(plan, duration, mode, rates)` returning the amount and a `lineHelmetRent` / `lineHelmetBuy` quote line; `buildQuote` takes an optional helmet option and appends the line to `atHub` (so payNow / reservation is untouched, `amountAtHub` and `totalInitialLiability` include it).
- `src/lib/catalog.functions.ts`: expose active addon pricing rows so the modal renders live rates.
- `src/lib/booking.functions.ts`: `createBooking` accepts `extraHelmet: "NONE" | "RENT" | "BUY"`, recomputes the amount server-side from `addon_pricing`, and persists it with the quote; new `setExtraHelmet` server fn (allowed while status is pre-handover) for the hub step; helmet amount added to the hub payment/ledger line and `accessories` on handover inspection reflect helmet count.
- UI: add-on selector in `src/components/drivex/DatesStep.tsx`, included-helmet nudge in `PlanCard.tsx`, hub-side change control and summary lines in `src/routes/journey.tsx`, status line in `src/routes/my-bike.tsx`.
- i18n: new keys (`helmetIncluded`, `helmetExtra`, `helmetRent`, `helmetBuy`, `helmetPerDay`, `helmetPerMonth`, `helmetNone`, `lineHelmetRent`, `lineHelmetBuy`, `helmetReturnNote`) drafted in all 8 languages via the existing i18n draft/check scripts.
