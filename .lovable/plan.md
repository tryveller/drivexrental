# Dates, times and clear pricing in the plan modal

## What the rider will see

After tapping a bike, the plan modal keeps the swipeable Daily / Weekly / Monthly cards, and then adds a dates step:

1. **Pick-up date + tentative time slot** (Morning 8–11, Late morning 11–1, Afternoon 1–4, Evening 4–7) — the slot tells the hub when to prepare the bike.
2. **Drop-off date + time slot** — this decides how many days are billed.
3. A **clear bill card** at the bottom of the modal:
   - Number of days (and part-days, if any)
   - **Total amount to pay**
   - **Per-day price** = total ÷ days, shown as "≈ ₹X / day"
   - Pay now ₹199 · remaining at hub
4. Reserve button stays disabled until both dates are chosen; dates outside hub hours or before today are blocked.

Dates and slots are also shown on the journey screen and in "My Bike", and the rider can **change the pick-up date once, to a date up to 3 days later** — after that the option is greyed out with a short note explaining the bike is being held for them.

## Billing rules (configurable, not hard-coded)

- Billed duration comes from the exact pick-up and drop-off date+slot.
- Base rate per day comes from the selected plan: daily = rental amount; weekly = rental ÷ 7; monthly = rental ÷ 30.
- Whole days are billed at the plan's day rate.
- **Extra hours beyond whole days are pro-rated by the hour** on the same plan (day rate ÷ 24 × hours), so a few hours over never costs a full day.
- A **late fee of ₹50** applies when the bike comes back after the agreed drop-off slot. The amount lives in plan configuration so it can be tuned later without a code change.
- Weekly/monthly overrun beyond the plan period is billed pro-rata at the same plan day rate.
- Deposit, processing fee and RTO downpayment are unchanged; the ₹199 reservation is still credited against the amount due at the hub.

## Technical notes

- **Database migration**: add to `bookings` — `pickup_on date`, `pickup_slot text`, `dropoff_on date`, `dropoff_slot text`, `billed_days numeric`, `billed_hours int`, `quoted_total int`, `pickup_changed_at timestamptz`, `pickup_change_count int default 0`. Add `hourly_rate_divisor` / reuse `late_fee_per_day` on `plans` for the configurable late fee. Existing GRANTs and RLS cover these columns.
- **`src/lib/pricing.ts`** gains pure helpers: `SLOTS` definition, `slotStartHour`, `computeDuration(pickup, dropoff)` → `{ days, extraHours }`, and `buildDatedQuote(plan, duration)` returning quote lines plus `total`, `perDay`, `payNow`, `amountAtHub`. All existing quote logic reuses this; labels stay copy keys.
- **`src/components/drivex/PlanCard.tsx`** shows the plan's base rate; the new `src/components/drivex/DatesStep.tsx` (date inputs + slot chips + bill summary) renders inside the existing modal in `src/routes/index.tsx`, which stores `pickup`/`dropoff` in the session selection alongside `modelId`, `hubId`, `planId`.
- **`src/lib/booking.functions.ts`**: `createBooking` accepts and validates dates/slots and persists the server-recomputed quote (never trusting client amounts); new `changePickupDate` server function enforces the one-change / max-3-days-later rule and extends `reservation_expires_at`; the reservation payment and final settlement use the dated quote.
- **`src/routes/journey.tsx`** and **`my-bike.tsx`** display the dates, slots, billed days and the "Change pick-up date" action.
- **Copy**: new keys added to `src/lib/i18n/keys.ts` (pick-up/drop-off, slot names, days billed, per-day, total, late-fee note, change-pickup rules), drafted for all 8 languages with `bun run i18n:draft`, verified with `bun run i18n:check`.
