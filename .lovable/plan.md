# DriveX Rental — Rider App V1

Full rider journey in one app: bike discovery → ₹199 reservation → hub verification → handover, then the app flips into a My Bike dashboard. Backed by Lovable Cloud so plans, pricing and payments are configuration-driven, not hard-coded. Reservation payment is simulated (no real money) but recorded through the real payment ledger and state machine.

## Look and feel

Warm saffron: off-white `#FFFBF2` canvas, white cards, saffron `#E4571B` primary, near-black `#1F1B16` text. Large tap targets, rounded cards, bold amounts, Hindi/English-friendly plain copy. Mobile-first single column, sticky bottom CTA on every step.

## Phase A — Backend foundation (Lovable Cloud)

Tables: `hubs`, `vehicle_models`, `vehicles`, `plans`, `customers`, `bookings`, `payments`, `payment_ledger`, `kyc_cases`, `rentals`, `service_bookings`, `challans`, `inspections`, `settlements`, `user_roles`.

Key rules stored as data, never in the app:
- `plans`: plan_type (WEEKLY / MONTHLY / RTO), rental_amount, deposit_amount, downpayment_amount, processing_fee, included_km, extra_km_rate, reservation_amount (₹199), billing_period, is_active.
- Pricing quote and final hub amount computed server-side:
  `AmountDueAtHub = plan charges + deposit/downpayment + fees − ₹199`
- Booking state machine per the PRD lifecycle; vehicle, payment, KYC and service states as enums.
- Seeded Bangalore data in the migration: 4 hubs (HSR, Koramangala, Indiranagar, Whitefield), TVS Sport / Radeon / Jupiter / Orbiter, ~20 vehicles, weekly + monthly + RTO plans, so the first screen has real inventory.

Auth: phone OTP login (mobile number, no password), customer profile created after verification.

## Phase B — Pre-handover rider app

1. **Location first** (`/`) — "Get a bike and start earning", Use My Current Location / enter area or PIN. No name, no phone yet.
2. **Nearby bikes** (`/bikes`) — hub name, distance, model, condition, "₹1,800/week onwards", Available today. Filters: model, condition, plan, price sort. Hub map view (hub location only, never individual vehicles).
3. **Bike detail** (`/bikes/$id`) — specs, hub + distance, three plan cards with deposit and KM allowance, plus a simple Weekly vs Monthly vs RTO comparison table.
4. **Price breakdown** — server-computed: Today ₹199 / At hub: first payment, deposit or downpayment, fees, −₹199 adjustment, amount remaining. Plain-language panel listing other possible charges (excess KM, late fee, challans, damage, processing).
5. **Mobile OTP** — verify, create profile.
6. **Optional eligibility** — Check Eligibility (Recommended) / Skip for Now. DL capture with extracted fields, selfie, explicit consent record (text version, timestamp, device). Result is only Likely Eligible / Additional Verification Required / Unable to Verify Online — never scores or risk categories.
7. **Reserve** — summary card, Pay ₹199 & Reserve. Simulated UPI step, but the booking is confirmed only after the server marks payment SUCCESS and locks the vehicle.
8. **Reservation confirmed** — booking ID, documents to carry (with accepted address proofs list), explicit "final KYC happens at the hub, reservation is not approval" acknowledgement.
9. **Reach the hub** — Get a Rapido (deep link + DriveX coupon display) or I'll Come Myself (address, distance, Google Maps directions, hub timings, reservation validity).
10. **At hub** — I Have Reached the Hub / check-in QR, live verification status (Not Started, In Progress, Additional Information Required, Approved, Rejected) with actionable re-upload flow, human rejection reasons only.
11. **Final payment** — server-calculated amount after ₹199 credit, simulated payment, retry on failure without repeating KYC.
12. **Agreement** — pre-filled from collected data, review and accept.
13. **Handover** — assigned vehicle, inspection photos/video and odometer/fuel record, customer sees the handover photos and taps Confirm & Take Bike → rental ACTIVE.

## Phase C — Post-handover My Bike dashboard

Home replaces discovery once a rental is active:
- My Bike: model + registration number.
- Next payment amount and due date, Pay Now.
- KM usage: used / plan allowance, remaining, reset day, warnings near and over limit with estimated overage amount.
- Bike Health as words (Good / Service Due Soon / Service Overdue / Attention Required), driven by service date and km since service — no invented score.
- Next service in X days or Y km, Book Service.
- Quick actions: Pay Rent, Service, Roadside Help, Documents.

Supporting screens: Dues (rent, challans, KM overage, late fee, damage), Payment History with receipts and invoice download, Vehicle Documents (RC, permit, insurance, RSA), Service booking + status tracking, Traffic Challans, Help & Support (call, WhatsApp, help centre), Return flow (slot, settlement preview, return inspection comparison, damage transparency, final deposit refund calculation, Rapido ride back), and a simple RTO ownership card (vehicle, next payment, payments completed).

Odometer/KM values come from a vehicle telemetry field with a "Last updated" timestamp, ready for TrekNTell later.

## Phase D — Hub operations dashboard

Admin-only (role table, never a flag on the profile). Queues: Today's Reservations, Travelling to Hub, At Hub, KYC Pending, Final Payments Pending, Vehicles Available, Handover Pending, Active Rentals, Service Due, Returns Today. One consolidated customer page covering profile, booking, plan, documents, KYC, payments, vehicle, agreement, inspection, dues, challans and history.

## Analytics

Funnel events recorded server-side: app_opened, location_shared, bike_viewed, bike_selected, plan_selected, mobile_verified, eligibility_started/skipped/completed, reservation_paid, hub_checkin, kyc_approved/rejected, final_payment_completed, agreement_accepted, rental_activated — enough to read the primary funnel and activation rate.

## Not in this build (per the PRD's own deferral list)

Care Credits and loyalty, ownership amortisation charts, sophisticated health algorithms, dynamic pricing, home delivery, earnings analytics, real payment gateway and real DigiLocker/Zoop/TrekNTell/Rapido API contracts — these are wired as configurable integration points, not live third-party calls.

## Technical notes

TanStack Start with file-based routes; all pricing, KM caps, fees and state transitions live in server functions plus plan configuration rows, so business changes need no app release. Payments recorded in an append-only ledger with independent entry types (RESERVATION, RENT, SECURITY_DEPOSIT, RTO_DOWNPAYMENT, PROCESSING_FEE, LATE_FEE, KM_OVERAGE, CHALLAN, DAMAGE, REFUND) and the ₹199 credit applied exactly once — acceptance tests assert ₹199 + ₹3,601 = ₹3,800 for the weekly example and ₹199 + ₹9,301 = ₹9,500 for the RTO example. RLS on every table so a rider only ever reads their own bookings, payments and KYC.

## Suggested build order

Given the size, I'd ship it in stages: Phase A + B first (discovery through reservation), then hub verification and handover, then the My Bike dashboard, then the ops dashboard. Approving this plan starts with Phase A + B.
