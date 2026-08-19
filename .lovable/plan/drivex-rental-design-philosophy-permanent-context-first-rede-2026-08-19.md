# DriveX Rental design philosophy (permanent context) + first redesign pass

Two parts: (1) write the philosophy into project memory so every future change is judged against it, (2) apply it to the screens where the current build most clearly breaks it.

## Part 1 — Permanent design philosophy in memory

Saved as project memory so it is applied automatically in every future session, not re-argued each time:

- Core one-liners in the memory index (always in context): designed for a gig rider with low digital literacy and limited English; comprehension before aesthetics; one obvious action per screen; tapping over typing; visual over verbose; reassurance over elegance when money, documents or safety are involved; visible human support.
- A detailed memory file with 10 principles, each stating what it means, why it matters to a rider, how it shapes UI, and what to avoid:
  1. Comprehension before aesthetics
  2. One decision per screen (optimise for least confusion, not fewest screens)
  3. 20-30% reading rule — journey completable from images, headings, buttons, prices, keywords
  4. Recognition over recall; no reliance on app conventions
  5. Icons must be unambiguous — label them, or use a realistic image
  6. Visually separate: what the rider gets / must do / gets free / is only information
  7. Zero-arithmetic pricing: rent, pay today, refundable deposit, recurring, one-time, optional are never blended
  8. Tapping over typing: permissions, cards, camera, autofill; typing is the fallback
  9. Multilingual reinforcement at high-consequence moments (payment, deposit, KYC, cancellation, pickup, damage, return, support) rather than blanket duplication
  10. Human reassurance is UI — Call DriveX always one tap away; KYC framed as trust (what, why, what happens, how long, what next)
- A constraint memory: do not treat DriveX as e-commerce; no decorative renders, no financial/product jargon, no combined "total" presented as the rental price, no PIN code as the primary location input.

## Part 2 — First redesign pass (where the build breaks the philosophy today)

### Pricing clarity (highest impact)
The plan card currently stacks per-day rate, refundable deposit and period total in one uniform list, so ₹6,500 rent + ₹2,000 deposit reads as an ₹8,500 bike.
- Restructure `PlanCard` into three visually distinct zones: dominant rent figure (rent for the period + per-day equivalent), a separate deposit row explicitly marked returnable, and a clearly secondary "pay today" figure.
- Add "returns when you give the bike back" as a short line next to the deposit, not buried.
- On the dates step, one bold "Pay now ₹199" with the rest (rent, deposit, helmet, at-hub balance) as a plainly labelled breakdown below.

### Location screen
Today it shows a heading, a location button, a 6-digit PIN box and a Continue button of equal weight.
- Make "Use my location" the single dominant action with a large tap target and a plain-language reason line.
- Demote PIN entry behind a secondary "I'll enter my area PIN instead" action, and auto-continue once location is granted (no second Continue tap).
- Keep the safety/approximate-location reassurance visible next to the permission ask, not at the bottom.

### Bike cards
Cards show mileage/range, top speed, storage and start type, but never state petrol vs electric in words.
- Add an explicit Petrol / Electric chip as a first-class attribute, derived from the existing spec data.
- Reorder the card so price, real photo, petrol/electric, mileage, condition and last-service read top to bottom without opening anything.

### Helmet and other benefits
The helmet block mixes the free helmet with the paid second helmet in one bordered box.
- Split into a "Free with your bike" benefit strip (one helmet, realistic helmet image, not an outline icon) and a separate optional "Extra helmet" choice with its own price.
- Establish reusable visual treatments for benefit / action / information blocks and use them across journey, kiosk and my-bike.

### KYC and documents
- Before each upload step, a three-line trust panel: what we need, why, what happens next — short sentences, one visual.
- Present camera/upload first and DigiLocker second (it stays marked as coming soon).

### Human support
- Persistent Call DriveX affordance: a phone action in the header alongside WhatsApp, and an explicit call button on failure/blocked/pending states (payment problem, KYC failed, bike issue, return).

### Bilingual reinforcement
- At payment, deposit, KYC consent and pickup, show the chosen language line with a short English line under it (one short sentence each, not full duplication).

## Technical notes

- Memory: `mem://index.md` Core lines plus `mem://design/philosophy` and `mem://constraints/anti-patterns`.
- All copy goes through `src/lib/i18n/keys.ts` for the 8 existing languages; new keys get context notes so the drafting script produces native phrasing. Bilingual reinforcement uses the existing `tIn("en", key)` capability rather than new plumbing.
- Pricing zones read only from `src/lib/pricing.ts` outputs; no new arithmetic in components.
- Petrol/electric is derived in `src/lib/bike-specs.ts` from existing mileage/range fields — no schema change.
- Files touched: `PlanCard.tsx`, `DatesStep.tsx`, `LocationGate.tsx`, `BikeCard.tsx`, `HelmetPicker.tsx`, `IdDocuments.tsx`, `AppShell.tsx`, `HubSteps.tsx`, `journey.tsx`, `keys.ts`, plus small shared blocks for benefit/action/info panels.

## Suggested order

1. Memory (philosophy + constraints).
2. Pricing zones (plan card, dates step).
3. Location screen.
4. Bike card petrol/electric and ordering.
5. Benefit vs action visual language (helmet first).
6. KYC trust panels, Call DriveX, bilingual reinforcement.
