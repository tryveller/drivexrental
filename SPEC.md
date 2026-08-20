# DriveX Rental — Complete Build Specification

This is the single source of truth for the DriveX Rental rider app: product intent, design philosophy, every screen and flow, all business rules, the full pricing maths, the data model, and the configuration points. It is written from the code and database as they actually are, so it can be used as a rebuild prompt.

All money is in whole Indian rupees (integers). All dates are local calendar dates (`YYYY-MM-DD`).

---

## 1. Product summary

- **Who it is for:** gig riders and delivery partners in Bangalore. Many have low digital literacy and limited English. This is a working tool, not an e-commerce site.
- **What it does:** a rider picks a bike, picks a plan, picks dates, pays **₹199** to reserve it, comes to the hub, finishes verification and the remaining payment there, signs the agreement, takes the bike. After handover the app becomes a **My Bike** dashboard.
- **Launch scale:** one live hub — **HSR DriveX Hub**, HSR Layout, Bangalore. Three other Bangalore hubs exist in data but are inactive.
- **Primary metric:** paid ₹199 reservations. Everything before payment must be removable friction; verification can happen later at the hub.
- **Payments are simulated** (no real gateway) but always flow through the real payment + ledger state machine, so switching to a live gateway is a server-side change only.

---

## 2. Design philosophy (permanent)

1. **Comprehension before aesthetics.** If a rider cannot understand it, it is broken.
2. **One obvious action per screen.** Big tap targets, no dense forms.
3. **Visual over verbose.** Icons, photos, chips; never a paragraph where an icon works.
4. **Zero arithmetic pricing.** The rider never adds or divides anything. Dominant rent figure, deposit shown separately as returnable, "pay today" clearly secondary.
5. **Tap over type.** Location permission, cards, camera first; typing is the fallback.
6. **Bilingual reinforcement only at money, KYC, pickup and support moments** — not blanket duplication of every sentence.
7. **Human reassurance.** "Call DriveX" is always one tap away; support is a trust feature.
8. **Never show scores or risk categories** to the rider. Only: Likely Eligible / Additional Verification Required / Unable to Verify Online.
9. **Nothing commercial is hard-coded.** Prices, deposits, fees, KM caps, helmet rates and minimum durations are database rows.
10. **The server owns every amount.** The client sends choices (plan, dates, helmet); the server recomputes the quote and persists it.

### Anti-patterns (forbidden)

- Blended totals that mix rent + deposit into one unexplained number.
- Asking for a PIN code before offering location permission.
- Jargon: KYC score, risk band, underwriting, tenure, EMI-speak, "onboarding".
- Decorative 3D renders or stock imagery that is not the actual bike.
- Disabled buttons with no feedback — a blocked action must explain itself (shake + message).
- Hard-coded prices, fees or catalog data in components.
- Literal machine translation instead of how a thing is really said in that language.

### Visual system

- **Black + shades of orange only.** All colours, gradients and shadows are semantic tokens in `src/styles.css` (OKLCH). No `text-white`, `bg-black`, or `bg-[#hex]` in components.
- Cards are rounded, amounts are bold and large, tap targets are ≥44px.
- Bike cards re-theme per model (each model has its own orange/black treatment).
- Splash screen: animated DX+R DriveX Rental logo; the same animation is reused as `PageLoader` for slow transitions.

---

## 3. Language architecture

8 languages, selected on the very first screen, stored per device:

| code | language | native |
|---|---|---|
| en | English | English |
| hi | Hindi | हिन्दी |
| kn | Kannada | ಕನ್ನಡ |
| te | Telugu | తెలుగు |
| ta | Tamil | தமிழ் |
| ml | Malayalam | മലയാളം |
| or | Odia | ଓଡ଼ିଆ |
| ne | Nepali | नेपाली |

Rules:

- Copy is written the way that thing is actually said in each language, not translated literally.
- Some tokens stay verbatim in every script: **OTP**, **PIN code**, **KM**, **₹**, brand and model names.
- Every user-visible string is a key in `src/lib/i18n/keys.ts` (~500 keys × 8 languages). Amount lines in quotes carry **copy keys, not English strings** (`lineRentDays`, `lineDeposit`, `lineHelmetRent`, …) so money always reads in the rider's language.
- Tooling: `bun run i18n:draft` fills missing keys, `bun run i18n:check` fails on gaps.
- Bilingual (selected language + English) reinforcement is used only on: amounts, KYC/document asks, pickup instructions, support.

---

## 4. End-to-end rider flow

```text
Splash → Language → Location → Home (bike deck)
   → Plan modal (Daily / Weekly / Monthly, RTO as an option)
   → Dates modal (pickup/dropoff date + slot, helmet, live bill)
   → Phone + OTP login
   → Eligibility (OPTIONAL, skippable)
   → Pay ₹199, reserve  ──────────► bike held
   → Travel to hub (Rapido or self)
   → At hub / Kiosk: KYC → remaining payment → helmet choice → agreement
   → Handover (inspection photos, odometer) → rental ACTIVE
   → My Bike dashboard
```

### 4.0 Access gate (temporary)

The prototype is behind a team PIN (`AccessGate`, verified server-side in `access.functions.ts`, with brute-force throttling). Removing the gate is a config change. `/kiosk` skips the location gate but not the language gate.

### 4.1 Language

- Full-screen list of the 8 languages in their own script with a one-line note ("हिन्दी में जारी रखें").
- One tap continues. Short confirmation only, in the chosen language.

### 4.2 Location

- Primary action: **Use my location** (browser geolocation, one tap).
- Secondary: **Skip for now**. No PIN typing is required.
- Purpose is stated plainly: to show how far the hub is. Location is saved against the rider when logged in (`saveLocation`).
- Exit condition: coordinates captured or skipped.

### 4.3 Home — bike deck

- Header: chosen area and **distance to HSR hub** (haversine from hub lat/long), plus a Google Maps deep link to the hub.
- Three model icons at the top jump the deck to that model.
- Tinder-style swipeable card deck, nearest bikes first. Each card shows:
  - real photo (tap opens a pinch/wheel zoom lightbox),
  - **Petrol / Electric** chip,
  - condition (New / Refurbished) and last service date,
  - spec chips: top speed, mileage or range, storage litres, safety, best-for,
  - "from ₹X / day".
- Availability counts are not shown as a headline number.
- If the rider has an open booking, a **Resume** card appears at the top; if logged out, a gentle login nudge to fetch their history.
- Exit condition: tap a bike → plan modal.

### 4.4 Plan modal (step 1 of the booking sheet)

Three swipeable cards — **Daily, Weekly, Monthly** — each showing, in this order:

1. **Per-day rate** (so all three compare on one number),
2. refundable **security deposit**,
3. approximate total for one unit of the plan (1 day / 1 week / 1 month),
4. **KM included** + extra-per-KM charge.

**Rent-to-Own is not a plan card.** It is presented separately as an option for riders thinking long term (downpayment + processing fee + first monthly, 24 months).

### 4.5 Dates modal (step 2)

- Pick-up date + **time slot**, drop-off date + time slot.
- Slots: Morning 08–11, Late morning 11–13, Afternoon 13–16, Evening 16–19.
- Helmet choice (see §6.6).
- Live bill card: big **Pay today ₹199**, days billed, charge lines, rent charges subtotal, deposit shown separately as returnable, amount at hub, "≈ ₹X / day".
- Validation: drop-off must be after pick-up; duration must meet the plan minimum (weekly ≥ 7 days, monthly ≥ 30) or the modal shows a plain-language error.
- Notes shown when relevant: hours pro-rata, late-return fee, "your bike will be ready".

### 4.6 Phone + OTP

- Mobile number → 6-digit OTP (`requestOtp` / `verifyOtp`). No password.
- Verification checks all valid, unconsumed OTPs for that number.
- On success: customer row created/linked to a **rider profile**, booking created (`createBooking`, status `OTP_VERIFIED`), and the journey continues exactly where it left off — never back to the home screen.
- The header then shows the logged-in rider with a menu: current booking, past bookings, service history, complaints, feedback, sign out.

### 4.7 Eligibility (optional)

- Two ways to give IDs: **DigiLocker** (Aadhaar / DL / PAN) or **click/upload pictures**. Uploads are prioritised in the UI.
- Documents required for a result: **DL front + Aadhaar front**. **PAN is optional.** No selfie in eligibility. Nothing is typed — no DL number, no name, no address.
- One document per screen (wizard with a progress tracker). Already-given documents are shown as done and can be replaced, never re-asked.
- Mandatory identity-verification consent checkbox before submitting (`CONSENT_TEXT`, version `v2.0`) — stored with text, version and timestamp.
- Result shown to the rider: **Likely Eligible** or **Additional Verification Required**. Never a score. The binding decision is always the hub team's.
- **Skip for Now** is a first-class action and does not block payment.

### 4.8 Reserve — ₹199

- Summary card, then a full-width tappable **consent row**: the rider must accept that ₹199 holds the bike, is **not refundable**, and that if hub verification fails the reservation is not refunded (only unused rent and the deposit are returned). Text version `v1.0`, stored on the booking with timestamp.
- The pay button is never silently disabled: tapping it without consent scrolls to the consent row, shakes it, and shows a message in the rider's language.
- On payment: a vehicle of that model at that hub is locked (`vehicles.status = RESERVED`), payment + ledger rows are written, booking → `RESERVED`, hold window set, an empty KYC case is opened.
- Confirmation screen: booking code, QR code, documents to carry, and an explicit "final KYC happens at the hub; a reservation is not approval".

### 4.9 Travel to hub

- **Get a Rapido** (deep link + DriveX coupon) or **I'll come myself** (address, distance, Google Maps directions, hub timings 10:00 AM – 7:00 PM, reservation validity).
- Booking QR can be sent to WhatsApp.

### 4.10 At the hub — phone or kiosk

`/kiosk` renders the same steps on a large hub screen (Android/browser). The rider scans/enters their booking and completes:

1. **KYC** — DL, selfie, address proof, optional PAN; one document per screen; consent row. If the rider profile already has a valid verification, KYC is **reused** in one tap instead of repeated.
2. **Remaining payment** — server-computed: total liability − ₹199 already paid. Retry on failure never repeats KYC.
3. **Helmet choice** — free helmet is shown as an included benefit; extra helmet rent or buy can be changed here.
4. **Agreement** — pre-filled from collected data, accepted via a consent row.
5. **Handover** — assigned vehicle with registration, inspection photos, odometer and fuel. The rider sees the photos and taps **Confirm & take bike** → rental `ACTIVE`.

Rejection reasons are always human sentences with a re-upload action, never codes.

### 4.11 My Bike (post-handover)

- Bike model + registration number.
- Next payment amount and due date, Pay Now.
- KM usage: used / included, remaining, reset day, warning and estimated overage near/over the limit.
- Bike health in words: Good / Service Due Soon / Service Overdue / Attention Required.
- Next service in X days or Y km, Book Service.
- Quick actions: Pay Rent, Service, Roadside Help, Documents.
- Supporting: dues, payment history + receipts, vehicle documents, challans, help & support, return flow with settlement preview and deposit refund.

---

## 5. Business rules

| Rule | Value / behaviour |
|---|---|
| Reservation amount | `plans.reservation_amount` (₹199 everywhere today); fallback constant 199 |
| Reservation credit | Applied **exactly once** against the amount due at hub |
| Reservation refundability | Non-refundable, including when hub verification fails; unused rent and deposit are returned |
| Reservation hold | 72 h from payment, and never less than 24 h past the chosen pick-up slot (whichever is later) |
| Pick-up change | **1 change**, to a date at most **3 days** later; extends the hold; after that the option is greyed out with an explanation |
| One number, one bike | A rider with a booking in a locked status (RESERVED → ACTIVE) cannot start a second booking; the app explains this instead of showing "no booking" |
| Booking reuse | A booking not yet locked is updated in place rather than duplicated |
| KYC timing | Optional before paying ₹199, **mandatory before pickup** |
| KYC reuse | A verified rider profile is reused for **365 days** across bookings and across other phone numbers on the same profile |
| Documents | DL front/back, selfie, address proof, PAN (optional), Aadhaar front/back. Persisted per rider and never re-asked |
| Text entry of ID data | Not allowed — documents are images/PDFs only |
| Consent records | Identity/credit-bureau consent (`v2.0`) and reservation terms (`v1.0`) stored with full text, version, timestamp, device |
| Rider profile | One profile may hold **multiple phone numbers** (invite/revoke), shared documents, KYC state, ride history, payment history, wallet |
| Wallet | Security deposit is held in a ledger-based wallet so a returning rider checks out faster; withdrawable |
| Vehicle locking | The vehicle is locked at payment time, not at selection time; if it was just taken, the rider is told they were not charged |
| Service policy | Mandatory check every **14 days or 3000 km**, whichever comes first |
| Hub hours | 10:00 AM – 7:00 PM |

### Booking state machine (`booking_status`)

```text
DISCOVERY → BIKE_SELECTED → OTP_VERIFIED
  → ELIGIBILITY_STARTED → ELIGIBILITY_COMPLETED | ELIGIBILITY_SKIPPED
  → PAYMENT_PENDING → RESERVED
  → TRAVEL_TO_HUB → AT_HUB → KYC_IN_PROGRESS
  → APPROVED | REJECTED
  → FINAL_PAYMENT_PENDING → PAID → AGREEMENT_ACCEPTED
  → VEHICLE_ASSIGNED → HANDOVER_PENDING → ACTIVE
  → RETURN_REQUESTED → RETURN_INSPECTION → SETTLEMENT_PENDING → CLOSED
```

UI step mapping (`journey.tsx`): PLAN, ELIGIBILITY, RESERVE, TRAVEL, AT_HUB, KYC, PAYMENT, AGREEMENT, HANDOVER, DONE.

Other enums: `kyc_status` (NOT_STARTED, SUBMITTED, IN_REVIEW, ACTION_REQUIRED, APPROVED, REJECTED); `payment_status` (CREATED, INITIATED, PENDING, SUCCESS, FAILED, CANCELLED, REFUND_PENDING, REFUNDED); `vehicle_status` (AVAILABLE, RESERVED, ASSIGNED, ACTIVE, SERVICE_DUE, IN_SERVICE, REPAIR, BLOCKED, RETURN_INSPECTION, READY_FOR_RENT); `service_status`; `vehicle_condition` (NEW, REFURBISHED); `plan_type` (DAILY, WEEKLY, MONTHLY, RTO); `app_role` (admin, hub_staff, rider); `ledger_entry_type` (RESERVATION, RENT, SECURITY_DEPOSIT, RTO_DOWNPAYMENT, PROCESSING_FEE, LATE_FEE, KM_OVERAGE, CHALLAN, DAMAGE, REFUND, HELMET).

---

## 6. Pricing engine

All of this lives in `src/lib/pricing.ts` as pure isomorphic functions. Both the client preview and the server quote call the same functions; the server result is authoritative and is what gets persisted.

### 6.1 Plan period and day rate

```text
periodDays: DAILY = 1, WEEKLY = 7, MONTHLY = 30, RTO = 30
dayRate:    DAILY = rental_amount
            WEEKLY = rental_amount / 7
            MONTHLY | RTO = rental_amount / 30
minDurationDays = plans.minimum_duration_days, else periodDays
```

Minimum duration exists because weekly/monthly day rates undercut the daily rate; it is enforced in the UI **and** re-enforced in `createBooking`.

### 6.2 Duration

```text
start = pickup_on at slotStartHour(pickup_slot)
end   = dropoff_on at slotStartHour(dropoff_slot)
hours = round((end - start) / 1h)          → must be > 0
days       = max(1, floor(hours / 24))
extraHours = max(0, hours - days * 24)
```

Slot start hours: MORNING 8, LATE_MORNING 11, AFTERNOON 13, EVENING 16.

### 6.3 Rent

```text
dayPart  = round(dayRate * days)
hourPart = round((dayRate / 24) * extraHours)     ← pro-rata, never a full extra day
rent     = dayPart + hourPart
perDay   = round(rent / (days + extraHours/24))
```

### 6.4 Quote composition

Non-RTO with dates:

```text
lines = [ lineRentDays, (lineRentExtraHours), lineDeposit, (helmet) ]
```

RTO:

```text
lines = [ lineDownpayment, lineProcessingFee, lineFirstMonthly, (helmet) ]
```

Then:

```text
totalInitialLiability = sum(lines)
chargesTotal          = totalInitialLiability - depositAmount   ← what is actually spent
payNow                = reservation_amount (₹199)
amountAtHub           = totalInitialLiability - reservation_amount
```

The deposit is always displayed on its own line, labelled returnable, and excluded from the per-day figure.

### 6.5 Worked examples

**TVS Sport, Weekly, 7 days, no extra helmet**

```text
rental_amount 1550, deposit 1800, dayRate 1550/7 = 221.43
dayPart = round(221.43 × 7)              = 1550
rent                                      = 1550
deposit                                   = 1800
totalInitialLiability                     = 3350
payNow                                    =  199
amountAtHub                               = 3151
perDay                                    ≈  221
chargesTotal (excl. deposit)              = 1550
```

**TVS Radeon, Daily, 2 days + 6 extra hours, extra helmet rented**

```text
rental_amount 319/day, deposit 1500
dayPart  = 319 × 2                        =  638
hourPart = round(319/24 × 6)              =   80
rent                                      =  718
helmet   = ₹10 × 3 whole days             =   30
deposit                                   = 1500
totalInitialLiability                     = 2248
amountAtHub = 2248 - 199                  = 2049
perDay      = round(718 / 2.25)           ≈  319
```

**TVS Jupiter, RTO (24 months)**

```text
downpayment 5000 + processing 1500 + first monthly 3000 = 9500
payNow 199 → amountAtHub 9301          (199 + 9301 = 9500)
```

### 6.6 Helmet add-on

- **One helmet always ships free with the bike** and comes back with it (`helmets_included = 1`).
- A rider may rent or buy exactly one extra:
  - DAILY / WEEKLY plans: **₹10 per whole day** (any part-day counts as a day, minimum 1 day).
  - MONTHLY / RTO: **₹100 per month**, months = `ceil(days / 30)`, minimum 1.
  - **Buy: ₹1000** one-time.
- Rates come from the `addon_pricing` table (`helmet_daily_rate`, `helmet_monthly_rate`, `helmet_buy_price`, `helmets_included`); the constants in code are failure fallbacks only.
- The choice can be changed at the hub (`setExtraHelmet`) and re-prices the final payment.

### 6.7 Other charges

| Charge | Source | Rule |
|---|---|---|
| Late return fee | `plans.late_return_fee` (₹50) | Bike returned after the agreed drop-off slot |
| Late payment fee | `plans.late_fee_per_day` (₹100) | Per day on overdue rent |
| Extra KM | `plans.extra_km_rate` (₹3.00–₹4.00/km) | `round(max(0, used − included) × rate)` |
| Processing fee | `plans.processing_fee` | RTO only today (₹1500–₹1800) |
| Challans, damage | Recorded rows | Deducted at settlement |

KM usage resets each billing period (`periodDays`), measured against `rentals.period_start_odometer`.

### 6.8 Settlement / refund

```text
deductions = outstandingRent + challans + kmOverage + damage
refund     = max(0, deposit - deductions)
```

Used identically by the return preview, the settlement row and every estimate shown to the rider.

### 6.9 Bike health

```text
kmSinceService = odometer - last_service_odometer
kmToService    = 3000 - kmSinceService
daysToService  = 14 - daysSince(last_service_date)
status: open issue        → Attention Required
        either < 0        → Service Overdue
        near threshold    → Service Due Soon
        otherwise         → Good
```

No invented numeric score is ever shown; condition is words plus the last service date.

---

## 7. Data model

Postgres (Lovable Cloud / Supabase). RLS on every table; riders read only their own rows. Each public table has explicit GRANTs (`authenticated` for user-facing tables, `service_role` always, `anon` SELECT only on the public catalog: hubs, vehicle_models, plans, vehicles, addon_pricing). Privileged writes go through server functions using the admin client after the caller is verified.

### Catalog / configuration

- **hubs** — `id, name, locality, address, city, latitude, longitude, opens_at, closes_at, phone, is_active`.
- **vehicle_models** — `id, brand, name, fuel_type, engine, transmission, features[], mileage_kmpl, range_km, top_speed_kmph, storage_litres, kerb_weight_kg, safety_key, best_for_key, start_type, is_active`.
- **vehicles** — `id, hub_id, model_id, condition, status, registration_no, odometer_km, last_service_date, last_service_odometer`.
- **plans** — `id, model_id, plan_type, vehicle_condition, billing_period, rental_amount, deposit_amount, downpayment_amount, processing_fee, included_km, extra_km_rate, reservation_amount, late_fee_per_day, late_return_fee, minimum_duration_days, maximum_duration_days, rto_total_months, is_active`.
- **addon_pricing** — `code, label_key, amount, unit, is_active`.

### Rider

- **rider_profiles** — the durable identity: KYC status and expiry, DL fields, wallet balance, credit signals.
- **customers** — one per phone number, linked to a `profile_id`.
- **rider_phone_invites** — adding another phone number to the same profile.
- **customer_documents** — `customer_id, profile_id, doc_type, path` (dl-front, dl-back, selfie, address-proof, pan, aadhaar-front, aadhaar-back). Documents are stored once and reused.
- **otp_requests** — `phone, code, expires_at, consumed_at`.
- **user_roles** — `user_id, role` (`app_role`). Roles are **never** stored on a profile row; access checks go through a `has_role` security-definer function.

### Transaction

- **bookings** — `booking_code, customer_id, hub_id, model_id, plan_id, vehicle_id, status, reservation_expires_at, travel_mode, rapido_coupon, checked_in_at, agreement_accepted_at, handover_confirmed_at, rejection_reason, pickup_on, pickup_slot, dropoff_on, dropoff_slot, billed_days, billed_extra_hours, quoted_total, pickup_changed_at, pickup_change_count, original_pickup_on, extra_helmet_mode, extra_helmet_amount, reservation_terms_version/text/at`.
- **payments** — `booking_id, customer_id, amount, purpose, status, method, reference, receipt_no, paid_at`.
- **payment_ledger** — append-only, `entry_type` per §5, `direction`, `note`. The ₹199 credit is a single RESERVATION entry.
- **wallet_ledger** — deposit held for the rider, credits and debits.
- **eligibility_checks** — `result, method, dl/aadhaar/pan paths, consent_version, consent_text, consent_at`.
- **kyc_cases** — one per booking: `status`, document paths, `dl_verified`, `address_proof_status`, `verification_method`, `action_required_reason`, `rejection_reason`, consent fields.
- **rentals** — active rental: `vehicle_id, plan_id, status, started_at, period_start_odometer, period_started_on, period_resets_on, next_payment_amount, next_payment_due_on, payments_completed, ended_at, return_slot, return_hub_id`.
- **inspections** — handover/return: `inspection_type, odometer, fuel_percent, accessories[], photos, damages, notes`.
- **settlements**, **challans**, **service_bookings**.
- **analytics_events** — `customer_id, booking_id, event, props`.

### Seeded fleet (day 1)

100 vehicles at HSR DriveX Hub: **75 new ICE + 25 used ICE** — **45 Radeon, 45 Sport, 10 Jupiter** (TVS Orbiter electric exists in the catalog). Availability is derived from `vehicles.status ∈ {AVAILABLE, READY_FOR_RENT}` at read time, per hub + model — never a stored count.

### Live plan configuration

| Model | Plan | Rate | Deposit | Down | Fee | KM incl. | Extra/km | Min days |
|---|---|---|---|---|---|---|---|---|
| TVS Sport | Daily | 299 | 1500 | – | – | 90 | 3.50 | 1 |
| TVS Sport | Weekly | 1550 | 1800 | – | – | 720 | 3.50 | 7 |
| TVS Sport | Monthly | 5600 | 1800 | – | – | 3420 | 3.00 | 30 |
| TVS Radeon | Daily | 319 | 1500 | – | – | 90 | 3.50 | 1 |
| TVS Radeon | Weekly | 1650 | 2000 | – | – | 720 | 3.50 | 7 |
| TVS Radeon | Monthly | 5900 | 2000 | – | – | 3420 | 3.00 | 30 |
| TVS Radeon | RTO (24 m) | 2800 | – | 4500 | 1500 | 3600 | 3.00 | 30 |
| TVS Jupiter | Daily | 349 | 1500 | – | – | 90 | 3.50 | 1 |
| TVS Jupiter | Weekly | 1800 | 2000 | – | – | 720 | 3.50 | 7 |
| TVS Jupiter | Monthly | 6500 | 2000 | – | – | 3420 | 3.00 | 30 |
| TVS Jupiter | RTO (24 m) | 3000 | – | 5000 | 1500 | 3600 | 3.00 | 30 |
| TVS Orbiter (EV) | Daily | 379 | 2000 | – | – | 80 | 4.00 | 1 |
| TVS Orbiter (EV) | Weekly | 1950 | 2500 | – | – | 700 | 4.00 | 7 |
| TVS Orbiter (EV) | Monthly | 6900 | 2500 | – | – | 3300 | 3.50 | 30 |
| TVS Orbiter (EV) | RTO (24 m) | 3400 | – | 6000 | 1800 | 3300 | 3.50 | 30 |

Every plan: `reservation_amount 199`, `late_fee_per_day 100`, `late_return_fee 50`.

### Vehicle specs shown to riders

| Model | Fuel | Engine | Mileage / Range | Top speed | Storage | Weight | Best for |
|---|---|---|---|---|---|---|---|
| TVS Sport | Petrol | 109.7 cc | 70 kmpl | 90 kmph | – | 110 kg | Long rides |
| TVS Radeon | Petrol | 109.7 cc | 69 kmpl | 85 kmph | – | 112 kg | Daily commute |
| TVS Jupiter | Petrol | 109.7 cc | 56 kmpl | 82 kmph | 33 L | 108 kg | Errands |
| TVS Orbiter | Electric | Hub motor | 158 km range | 65 kmph | 34 L | 106 kg | New riders |

---

## 8. Screens and server functions

| Route | Purpose | Key server functions |
|---|---|---|
| `/` | Language gate → location gate → bike deck, plan modal, dates modal, resume card | `getCatalog`, `createBooking`, `requestOtp`, `verifyOtp`, `saveLocation` |
| `/journey` | The whole booking journey, step derived from booking status | `getJourney`, `submitEligibility`, `skipEligibility`, `payReservation`, `changePickupDate`, `setTravelMode`, `checkInAtHub`, `submitHubKyc`, `reuseSavedKyc`, `getFinalPaymentBreakdown`, `payFinalAmount`, `acceptAgreement`, `confirmHandover`, `setExtraHelmet` |
| `/eligibility` | Standalone self-check with document persistence and editing | `runEligibilityCheck`, `getLatestEligibilityCheck`, `getSavedDocuments`, `saveDocument` |
| `/auth` | Phone + OTP | `requestOtp`, `verifyOtp` |
| `/account` | Rider dashboard: bookings, payments, service history, phone numbers, wallet | `getAccountOverview`, `getRiderProfile`, `inviteRiderPhone`, `revokeRiderPhoneInvite`, `withdrawWallet` |
| `/my-bike` | Active rental dashboard, dues, KM, health, service, return | `getMyBike`, `payRent`, `bookService`, `payChallan`, `requestReturn`, `getReturnPreview`, `completeReturn` |
| `/kiosk` | Hub large-screen check-in (same hub steps, no location gate) | `getJourney` + all hub-step functions |

Shared components: `BikeDeck`, `BikeCard`, `PhotoZoom`, `PlanCard`, `DatesStep`, `HelmetPicker`, `IdDocuments`, `CaptureField`, `ConsentRow`, `HubSteps`, `BookingQr`, `ResumeCard`, `AccountMenu`, `AppShell`, `Blocks` (BenefitBlock, TrustPanel, CallDriveXButton, Bilingual), `SplashScreen`, `PageLoader`, `LanguageGate`, `LocationGate`, `AccessGate`.

### Analytics events

`app_opened`, `location_shared`, `mobile_verified`, `plan_selected`, `eligibility_skipped`, `reservation_paid`, `hub_checkin`, `kyc_started`, `kyc_approved`, `kyc_reused`, `final_payment_started`, `final_payment_completed`, `agreement_accepted`, `vehicle_handed_over`, `rental_activated` — all written server-side into `analytics_events`.

---

## 9. Technical architecture

- **TanStack Start v1** + React 19 + Vite 7, file-based routes in `src/routes`, root layout in `src/routes/__root.tsx`. No React Router.
- **Server logic** is `createServerFn` in `*.functions.ts` (client-safe modules that only declare functions); runtime helpers live in `*.server.ts` and are imported **inside** handlers. Webhooks/public APIs would go under `src/routes/api/public/*`.
- **Auth**: phone OTP; protected server functions use `requireSupabaseAuth` middleware, with the bearer token attached by `functionMiddleware` in `src/start.ts`. Protected loaders only under `_authenticated`.
- **Storage**: KYC and eligibility documents in a private bucket; only paths are stored in the database.
- **Tailwind v4** via `src/styles.css`; all colour/gradient/shadow tokens are semantic. Custom animation `consent-nudge` for blocked consent.
- **i18n**: `src/lib/i18n/keys.ts` + `index.tsx` provider; scripts `i18n:draft` and `i18n:check`.
- **Payments** are simulated inside the server functions but write real `payments` + `payment_ledger` rows, so a real gateway replaces only the confirmation step.
- **Integration points kept configurable, not live:** DigiLocker, Zoop, TrekNTell telemetry, Rapido, WhatsApp, payment gateway.

### Not in V1

Care Credits and loyalty, ownership amortisation charts, algorithmic health scores, dynamic pricing, home delivery, earnings analytics, real third-party API contracts.

---

## 10. Rebuild prompt

> Build **DriveX Rental**, a mobile-first bike rental app for gig riders in Bangalore, on TanStack Start with Lovable Cloud.
>
> Design for low digital literacy and limited English: one obvious action per screen, big tap targets, icons and photos over text, tapping over typing, and a "Call DriveX" button always one tap away. Use **black plus shades of orange only**, all as semantic tokens. Support **8 languages** (English, Hindi, Kannada, Telugu, Tamil, Malayalam, Odia, Nepali) with natively phrased copy, keeping OTP, PIN code, KM and model names verbatim; bilingual reinforcement only at money, KYC, pickup and support moments.
>
> Flow: splash → language → location permission (skippable, no PIN typing) → Tinder-style bike deck sorted by distance from the HSR hub, each card showing photo (tap to zoom), petrol/electric, condition, last service date and spec chips → plan modal with Daily / Weekly / Monthly cards showing per-day rate, refundable deposit, one-period total, KM included and extra-per-km, with Rent-to-Own offered separately → dates modal with pick-up and drop-off date + time slot (Morning 8–11, Late morning 11–13, Afternoon 13–16, Evening 16–19), optional extra helmet, and a live bill → phone + OTP login that resumes the journey → **optional** document-only eligibility check (DigiLocker or photo upload; DL + Aadhaar required, PAN optional, one document per screen, mandatory credit-bureau consent, result only "Likely Eligible" or "Additional Verification Required") → pay **₹199** to reserve with a large tappable non-refundability consent row (never a silently disabled button) → travel to hub → hub or kiosk check-in (KYC or one-tap reuse of a verified profile, remaining payment, helmet choice, agreement, handover with inspection photos) → **My Bike** dashboard with next payment, KM usage, word-based bike health, service booking and return with settlement.
>
> Pricing rules: day rate = daily as-is, weekly ÷ 7, monthly ÷ 30; minimum durations 1 / 7 / 30 days; duration = hours between slots, days = floor(hours/24) min 1, leftover hours billed pro-rata at dayRate/24; deposit always shown separately as returnable and excluded from the per-day figure; ₹199 credited exactly once against the amount due at the hub; one free helmet included, extra helmet ₹10/day or ₹100/month or ₹1000 to buy; late return ₹50; late payment ₹100/day; extra KM at the plan rate; refund = max(0, deposit − outstanding rent − challans − KM overage − damage).
>
> Business rules: reservation holds the bike 72 h and at least 24 h past the pick-up slot; the pick-up date may be changed once, up to 3 days later; one phone number may hold only one active bike; a verified rider profile is reused for 365 days and may hold multiple phone numbers, shared documents, ride and payment history and a deposit wallet; documents are images/PDFs only, stored once and never re-asked; consents are stored with full text, version and timestamp.
>
> Data: tables for hubs, vehicle_models, vehicles, plans, addon_pricing, rider_profiles, customers, rider_phone_invites, customer_documents, otp_requests, bookings, payments, payment_ledger, wallet_ledger, eligibility_checks, kyc_cases, rentals, inspections, settlements, challans, service_bookings, analytics_events, user_roles — with RLS and explicit GRANTs, roles in a separate table checked via a security-definer function. Seed one active HSR hub and 100 TVS vehicles (75 new, 25 used: 45 Radeon, 45 Sport, 10 Jupiter) plus the plan rows above. **Nothing commercial may be hard-coded in the app** — every price, fee, KM cap and minimum duration is a database row, and the server recomputes and persists every quote; the client only sends choices.

