# DriveX Rental — single source-of-truth spec document

Create one committed markdown file, `SPEC.md` in the repo root, that contains everything needed to rebuild this app from scratch as a prompt: product intent, design philosophy, every screen and flow, all business rules, the full pricing maths with worked examples, the data model, and integration/config points.

The document is written from the code as it actually is today (pricing helpers, booking server functions, catalog, KYC/eligibility, kiosk, i18n) — not from the older phase plans, which are already archived under `.lovable/plan/`.

## Structure of SPEC.md

1. **Product summary** — who it is for (gig riders in India, low digital literacy), one hub at launch (HSR Layout), the ₹199 reservation as the primary metric.
2. **Design philosophy and anti-patterns** — the 10 permanent principles, black + shades of orange only, semantic tokens, one action per screen, zero-arithmetic pricing, tap over type, Call DriveX always one tap away, plus the forbidden patterns list.
3. **Language architecture** — 8 languages, native phrasing (not literal translation), verbatim terms such as OTP, where bilingual reinforcement is allowed (money, KYC, pickup, support) and where it is not.
4. **End-to-end rider flow** — language → location → bike deck → plan modal → dates modal → login (phone + OTP) → optional eligibility → ₹199 reserve → travel to hub → hub/kiosk check-in (KYC, pending payment, helmet choice, agreement) → handover → My Bike. Each step lists: what the rider sees, what is required, what is optional, and the exit conditions.
5. **Business rules** — reservation hold window and pickup-date change rule, one number/one active bike, KYC optional before payment and mandatory before pickup, KYC reuse window, non-refundable reservation consent, consent records, rider profile with multiple phone numbers, wallet-held security deposit.
6. **Pricing engine** — plan types (Daily/Weekly/Monthly + RTO as an option), per-day derivation, minimum durations, slots and duration maths, whole days plus hourly pro-rata, deposit shown separately, ₹199 credit applied exactly once, helmet add-on (free first helmet, ₹10/day, ₹100/month, ₹1000 buy), late return fee, KM allowance and extra-KM rate, processing fee, RTO downpayment. Includes worked examples with exact numbers and the invariant that the server recomputes every quote.
7. **Data model** — every table, its purpose, key columns, enums, RLS intent and grants; seeded catalog (100 vehicles: 75 new / 25 used; 45 Radeon, 45 Sport, 10 Jupiter) and the rule that nothing about catalog, pricing or fees is hard-coded in the app.
8. **Screens inventory** — route by route, what each renders and which server functions it calls.
9. **Technical architecture** — TanStack Start routes, server functions vs public API routes, auth middleware, storage for KYC documents, PIN access gate for the internal prototype, i18n key tooling.
10. **Rebuild prompt** — a condensed, copy-pasteable prompt at the end of the file that an agent could use to build this app from zero, referencing the sections above.

## Technical notes

- Numbers, fee names, plan fields, enum values and defaults are read out of `src/lib/pricing.ts`, `src/lib/booking.functions.ts`, `src/lib/catalog.functions.ts`, `src/lib/eligibility.ts`, `src/lib/consent.ts`, `src/integrations/supabase/types.ts` and the live database rows, so the document matches runtime behaviour rather than intent.
- `README.md` gets a short pointer to `SPEC.md`.
- No application code, styling or database changes — documentation only.
