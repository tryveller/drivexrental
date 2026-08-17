# Drivex Rental

DriveX Rental — Gig Rider App V1

Product Requirements Document

Product: DriveX Rental Rider App
Project: Dash
Launch Market: Bangalore
Primary Customer: Gig riders and delivery partners
Platforms: Android first, backend/admin web for hub operations
Version: V1

1. Product Vision

DriveX Rental should make getting a bike for work feel extremely simple.

A rider should not have to understand DriveX's operational complexity, KYC process, risk checks, payment reconciliation, vehicle allocation or servicing systems.

The customer experience should feel like:

Find a Bike → Choose a Plan → Reserve for ₹199 → Reach Hub → Get Verified → Pay → Ride

Everything difficult should happen behind the scenes.

The product should answer five questions very quickly:

Is a bike available near me?

How much will it cost?

What plan is right for me?

Can I get the bike today?

How do I reach the hub?

2. Key Product Principle

There should effectively be two different versions of the app depending on the customer's lifecycle.

Before Vehicle Handover

The app behaves like a bike discovery and onboarding application.

The primary objective is:

Help me find and get a bike.

After Vehicle Handover

The app transforms into a vehicle management dashboard.

The primary objective becomes:

Help me keep my bike running, stay compliant and continue earning.

The home screen therefore changes completely after rental activation.

3. Plans Supported at V1 Launch

V1 will support all three plan types.

A. Weekly Rental

Generally for used/refurbished vehicles.

Typical commercial structure:

weekly rent,

refundable security deposit,

configurable kilometre allowance,

over-usage charges,

recurring weekly payment.

B. Monthly Rental

Generally for used/refurbished vehicles.

Typical commercial structure:

monthly rent,

refundable security deposit,

configurable kilometre allowance,

over-usage charges,

recurring monthly payment.

C. Monthly Rent-to-Own

May include new or used vehicles.

Typical commercial structure:

downpayment,

monthly payment,

applicable processing/registration fees,

eventual ownership subject to plan conditions.

For V1, only the essential RTO information needs to be shown.

More sophisticated ownership tracking can come later.

4. ₹199 Reservation Rule

₹199 applies to:

Weekly Rental

Monthly Rental

Rent-to-Own

The amount is paid before the vehicle is finally allocated.

It serves as:

customer commitment,

temporary reservation of inventory,

prerequisite before DriveX incurs pickup/transportation cost.

It is not an additional charge.

The ₹199 must be adjusted against the amount due at the hub.

5. Overall Customer Journey

The V1 flow should be:

Open App

→ Share Location

→ See Nearby Hubs and Available Bikes

→ Filter Bikes

→ Select Bike

→ Select Weekly / Monthly / Rent-to-Own Plan

→ See Complete Price Breakdown

→ Mobile OTP

→ Optional Eligibility Check

→ Pay ₹199 Reservation

→ Reservation Confirmed

→ See Documents Required at Hub

→ Choose How to Reach Hub

→ Rapido / Own Transport

→ Arrive at Hub

→ Full KYC

→ Final Eligibility Decision

→ Final Payment after ₹199 Adjustment

→ Agreement

→ Vehicle Handover

→ Rental Activated

→ App changes to My Bike Dashboard

6. Screen 1 — Location First

Objective

Find the customer's location before asking them to register.

Screen

Get a bike and start earning

Supporting copy:

Find rental bikes available near you.

Primary CTA:

Use My Current Location

Secondary:

Enter Area or PIN Code

Do not ask for:

name,

phone number,

KYC,

registration,

at this point.

7. Location Permission

When the customer taps:

Use My Current Location

Request location permission.

Capture:

latitude,

longitude,

locality,

PIN code,

city.

Use this to determine:

nearest DriveX hubs,

serviceable area,

bike availability,

approximate distance.

8. Screen 2 — Nearby Bikes

Show bikes available around the rider.

Example:

Bikes near you

HSR DriveX Hub

2.8 km away

TVS Jupiter

Refurbished
₹1,800/week onwards

Available today

View Bike

Koramangala DriveX Hub

4.1 km away

TVS Radeon

Refurbished
₹1,650/week onwards

Available today

View Bike

9. Filters

V1 should support simple filters.

Vehicle Model

TVS Sport

TVS Radeon

TVS Jupiter

TVS Orbiter

Other configured models

Vehicle Condition

New

Refurbished

Plan

Weekly Rental

Monthly Rental

Rent-to-Own

Price

Allow basic price sorting/filtering.

Do not overcomplicate filtering at launch.

10. Hub Location

The listing should show:

hub name,

approximate distance,

locality,

availability.

Allow:

View on Map

The exact live location of individual inventory should not be exposed.

The map represents the DriveX Hub.

11. Screen 3 — Bike Detail

Show:

TVS Jupiter

Refurbished

HSR DriveX Hub
2.8 km from you

Available today

Vehicle specifications can include:

model,

fuel type,

engine,

transmission,

relevant rider-facing features.

Keep this simple.

12. Plan Selection

The bike detail page should clearly show the available plans.

Example:

Choose how you want to rent

Weekly Rental

₹1,800/week

Refundable deposit: ₹2,000

KM allowance: Configured for this plan

Select

Monthly Rental

₹6,500/month

Refundable deposit: ₹2,000

KM allowance: Configured for this plan

Select

Rent-to-Own

₹X/month

Downpayment: ₹X

Processing / registration fee: ₹X

New / refurbished

Select

13. Plan Comparison

The user should be able to understand the difference without reading complicated terms.

Example:

WeeklyMonthlyRent-to-OwnVehicleUsedUsedNew/UsedPaymentWeeklyMonthlyMonthlyDepositYesYesDownpaymentOwnershipNoNoYes, subject to planKM limitConfigurableConfigurableConfigurable

14. Pricing Transparency

Before the customer reserves the vehicle, show the complete commercial structure.

For Rental:

Today

Reservation
₹199

At Hub

First rental payment
₹1,800

Refundable deposit
₹2,000

Reservation adjustment
-₹199

Amount remaining at hub
₹3,601

For RTO:

Today

Reservation
₹199

At Hub

Downpayment
₹X

First monthly payment if applicable
₹X

Processing / registration fee
₹1,500 or configured value

Reservation adjustment
-₹199

Amount remaining
₹X

The calculation must be generated by the backend, not hard-coded in the application.

15. Explain Other Possible Charges

Before reservation, clearly mention that the following may apply depending on the plan:

excess kilometre charges,

late-payment charges,

traffic challans,

damage charges,

processing/registration charges,

other contractually disclosed charges.

Do not hide these deep inside the Terms & Conditions.

16. Screen 4 — Mobile Verification

Ask for:

Mobile Number

Send OTP.

Verify OTP.

No password.

Create customer profile after OTP verification.

17. Screen 5 — Optional Eligibility Check

After mobile verification:

Want to check your eligibility?

Copy:

This optional check can help identify eligibility issues before you travel to the DriveX hub.

Primary:

Check Eligibility

Label:

Recommended

Secondary:

Skip for Now

Disclaimer:

Final approval will still happen at the DriveX hub.

18. Why Eligibility is Optional

Some gig riders may:

struggle with DigiLocker,

not have documents immediately available,

prefer assisted onboarding,

have poor connectivity,

prefer physical verification.

DriveX should not lose these customers.

They should be allowed to reserve and complete verification at the hub.

19. Optional Eligibility — Driving Licence

Preferred:

Verify Driving Licence

Use a configured digital document verification flow such as DigiLocker or another approved provider.

Fallback:

Upload Driving Licence

The system should extract wherever possible:

rider name,

DOB,

DL number,

validity,

vehicle class,

issuing state,

photograph.

Avoid manual re-entry.

20. Optional Eligibility — Selfie

Ask:

Take a quick selfie

Backend may perform:

liveness,

facial similarity,

image-quality checks,

duplicate-customer checks.

Customer should not see the underlying fraud/risk score.

21. Optional Eligibility — Risk Consent

Where required:

Explain that DriveX may perform authorised checks for rental eligibility.

Customer must explicitly consent.

Store:

customer ID,

consent text/version,

date/time,

IP/device details where necessary,

provider.

22. Eligibility Result

The result should never imply final approval.

Possible states:

Likely Eligible

Your initial eligibility check looks good.

Final verification will happen at the hub.

Additional Verification Required

We need to verify some additional information.

The customer can still proceed to the hub.

Unable to Verify Online

We couldn't complete your eligibility check online.

CTA:

Continue and Complete at Hub

23. What Should NOT Be Shown

Never show things such as:

CIBIL 537

or:

Fraud score 71%

or:

Internal risk category: High

The user should only receive actionable information.

24. Screen 6 — Reservation

After selecting a plan:

Reserve Your Bike

Bike
TVS Jupiter

Plan
Weekly Rental

Hub
HSR

Amount to pay now:

₹199

Copy:

₹199 reserves your bike and will be adjusted against the final payment at the hub.

CTA:

Pay ₹199 & Reserve

25. Reservation Payment Flow

Preferred payment method:

UPI

Other payment-gateway-supported methods may be available as fallback.

Payment lifecycle:

Create payment order.

Customer initiates payment.

Payment gateway processes transaction.

Backend verifies callback/webhook.

Payment marked successful.

Reservation confirmed.

Inventory is locked.

The frontend success screen alone must not confirm the reservation.

26. Payment States

INITIATED

PENDING

SUCCESS

FAILED

CANCELLED

REFUND_PENDING

REFUNDED

27. Payment Ledger

Every payment must be recorded independently.

Examples:

RESERVATION

RENT

SECURITY_DEPOSIT

RTO_DOWNPAYMENT

PROCESSING_FEE

LATE_FEE

KM_OVERAGE

CHALLAN

DAMAGE

REFUND

28. Reservation Success Screen

After successful payment:

Your Bike is Reserved ✓

Booking ID:

DXR10294

Bike:

TVS Jupiter

Plan:

Weekly Rental

Hub:

HSR DriveX Hub

Reservation paid:

₹199

29. Documents to Carry

This should be prominent immediately after reservation.

Please bring these documents

Valid Driving Licence

Aadhaar / Accepted Identity Proof

One Address Proof

Registered Mobile Phone

Allow:

See Accepted Address Proofs

Examples can be controlled from admin.

30. Final Approval Warning

Clearly state:

Final KYC will happen at the hub

Reserving a vehicle does not guarantee final rental approval.

Vehicle handover is subject to document, identity and eligibility verification.

Customer acknowledges this.

31. Possible KYC Rejection Reasons

Customer-facing rejection reasons should be understandable and actionable.

Examples:

Document Quality

Driving Licence image is unclear.

Aadhaar image is unclear.

Address proof cannot be read.

Document is incomplete.

Required page is missing.

Document Validity

Driving Licence has expired.

Document is no longer valid.

Unsupported licence category.

Address proof is outside allowed validity period.

Information Mismatch

Name does not match between documents.

Name does not match rider profile.

Date of birth mismatch.

Photograph does not sufficiently match.

Address information mismatch.

DL details could not be verified.

Identity

Identity verification unsuccessful.

Selfie verification unsuccessful.

Unable to establish identity confidently.

Eligibility

Credit eligibility requirements were not met.

Existing outstanding DriveX dues.

Previous unpaid rental.

Previous unresolved vehicle damage.

Previous serious policy violation.

Other

Additional verification required.

Information provided is incomplete.

Unable to validate submitted information.

32. What Rejection Reason Should NOT Reveal

Do not disclose:

fraud model scores,

fraud rules,

internal blacklists,

exact credit-score threshold,

internal underwriting weights,

backend provider responses that could compromise risk controls.

33. Getting to the Hub

After reservation:

How would you like to reach the hub?

Option A

Get a Rapido

Because Rapido is a DriveX partner, the product should support whichever commercial/technical integration becomes available.

Possible V1 implementations:

Book Rapido through partner integration.

Apply/show a DriveX Rapido discount.

Generate/show a Rapido coupon.

Deep-link customer into Rapido.

Pre-fill destination as DriveX Hub where supported.

Option B

I'll Come Myself

Show:

Hub address

Distance

Google Maps directions

Hub timings

Booking ID

Reservation validity

34. Vehicle Delivery

Vehicle delivery to the customer is NOT part of V1.

The customer must complete handover at the DriveX Hub.

This is important for:

KYC,

final eligibility,

vehicle inspection,

agreement,

payment,

handover documentation.

35. Rapido Return / Rejection Transport

If DriveX facilitated transportation to the hub and the customer is rejected:

Offer:

Get a Rapido Back

Potential implementation:

discounted ride,

coupon,

partner booking,

deep link.

The customer should not feel stranded after DriveX asked them to travel to the hub.

36. Hub Check-In

Customer app shows:

I Have Reached the Hub

or:

Check-in QR

Staff scans QR.

Booking moves to:

AT_HUB

37. Hub Staff View

The employee should see one consolidated customer page.

Customer

Name

Mobile

Customer ID

Booking

Booking ID

Hub

Selected bike

Selected plan

₹199 reservation status

KYC

DL

Aadhaar

Address

Selfie

Digital verification

Credit/risk

Overall status

Payment

Reservation paid

Amount remaining

38. KYC Status in Customer App

The customer should be able to see:

Verification

Possible statuses:

Not Started

In Progress

Additional Information Required

Approved

Rejected

39. KYC Additional Information

Example:

We need one more document

Reason

Your uploaded address proof is unclear.

CTA:

Upload Again

This should avoid forcing the user to call support for simple corrections.

40. Final Eligibility Decision

Possible internal statuses:

APPROVED

MANUAL_REVIEW

REJECTED

If approved:

Proceed to payment.

If manual review:

Customer sees:

Verification is in progress.

If rejected:

Display appropriate customer-facing reason.

41. Final Payment Calculation

The backend calculates all commercial amounts.

Example:

Weekly Rental

First week rent
₹1,800

Security deposit
₹2,000

Reservation already paid
-₹199

Pay at Hub

₹3,601

42. RTO Payment Example

Example:

Downpayment
₹5,000

Processing/registration fee
₹1,500

First instalment if applicable
₹X

Reservation paid
-₹199

Final Amount Due

₹X

The exact commercial model should be configuration-driven.

43. Reservation Adjustment Rule

Formal rule:

AmountDueAtHub = InitialPlanCharges + DepositOrDownpayment + Fees - ReservationCredit

Where:

ReservationCredit = ₹199

The reservation transaction continues to remain visible separately in payment history.

44. Payment Failure

If final payment fails:

Do not repeat KYC.

Booking becomes:

PAYMENT PENDING

Allow:

Try Again

Inventory can remain blocked for a configured period.

45. Payment History

Once logged in, the user must have:

Payment History

Show every transaction:

17 Aug

Reservation

₹199

Paid

17 Aug

Rental + Deposit

₹3,601

Paid

Show:

date,

amount,

type,

status,

payment method,

receipt.

46. Receipts and Invoices

Every relevant financial transaction should provide:

View Receipt

and where applicable:

Download Invoice PDF

Invoices/receipts should be generated from the backend.

47. Agreement

After payment:

Generate rental/RTO agreement using the information already collected.

Customer should not re-enter:

name,

DL,

address,

bike information,

plan,

payment.

Show:

Review Agreement

CTA:

Accept & Continue

48. Vehicle Assignment

Hub staff assigns the actual bike.

Store:

registration number,

model,

condition,

odometer,

fuel/battery state,

service state.

49. Handover Inspection

Before giving the vehicle:

Capture:

Photos

front,

rear,

left,

right,

dashboard,

existing damage.

Video

Support optional walk-around video.

Other

odometer,

fuel/battery,

keys,

helmet/accessories,

existing scratches/dents.

Both DriveX and the customer should have access to this record.

50. Customer Confirmation

Before starting rental:

Bike Condition

Show handover photographs.

Copy:

These photos record the condition of your bike at handover.

CTA:

Confirm & Take Bike

This provides transparency for future damage disputes.

51. Vehicle Documents

Once rental starts, the customer should have access to:

Vehicle Documents

RC

Rental Permit

Insurance

Roadside Assistance Details

Documents should be easily accessible during traffic checks or emergencies.

52. Rental Activation

After:

KYC,

approval,

payment,

agreement,

inspection,

handover,

booking becomes:

ACTIVE RENTAL

The application's home screen now changes.

53. Post-Handover Home Screen

This should be one of the most important screens.

My Bike

TVS Jupiter

KA XX XX 1234

Next Payment

₹1,800

Due Monday, 24 August

Pay Now

KM Usage

Used:

560 km

Plan allowance:

720 km

160 km remaining

Bike Health

Good

or

Service Due Soon

Next Service

In 8 days

or

450 km remaining

Book Service

Quick Actions

Pay Rent

Service

Roadside Help

Documents

54. Odometer Integration

TrekNTell integration should provide odometer information where available.

The app should display:

current odometer,

distance travelled during billing period,

distance remaining within plan.

If real-time polling isn't possible, show:

Last updated: X

55. KM Caps

KM caps must be configurable by plan.

Example only:

Weekly:

720 km

Monthly:

3,420 km

These should NOT be hard-coded.

Configuration:

included_km

overage_rate_per_km

Each plan can have different values.

56. KM Usage Card

Example:

Weekly Usage

560 / 720 km

160 km remaining

Reset:

Monday

If nearing limit:

You're close to your weekly KM allowance.

If exceeded:

You've exceeded your plan by 35 km.

Estimated additional amount:

₹X

57. Bike Health Score

Until TrekNTell defines a more sophisticated model, V1 can use a simplified DriveX health status.

Possible statuses:

Good

No known issue.

Service Due Soon

Approaching service threshold.

Service Overdue

Mandatory service missed.

Attention Required

Operational/service issue detected.

Avoid an arbitrary unexplained:

83/100

at launch.

A human-readable status is better.

58. Health Inputs

Possible V1 inputs:

service due date,

kilometres since service,

mandatory inspections,

unresolved repair ticket,

vehicle telemetry signals where available.

Later TrekNTell can provide a richer health model.

59. Service Policy

Service requirements should be configurable.

Example:

Mandatory check every:

2 weeks

OR

3,000 km

whichever comes first.

These numbers should live in backend configuration.

60. Service Reminder

Home screen:

Service Due Soon

Your bike needs a mandatory service within:

3 days

or

240 km

CTA:

Book Service

61. Service Booking

Customer selects:

hub,

date,

available slot.

Confirm:

Service Booked

HSR Hub

22 August

11:30 AM

62. Service Status

Customer can track:

Scheduled

Checked In

In Progress

Ready

Completed

63. Service Completion

Record:

date,

odometer,

work done,

next service date,

next service odometer.

Update Bike Health.

64. Traffic Challans

Zoop or another configured provider can be integrated for challan information.

The app should show:

Traffic Challans

Pending

₹500

Date
Violation
Vehicle
Status

CTA depending on DriveX process:

View Details

or

Pay

65. Payment Dues

The application should provide one clear view for:

Your Dues

Possible items:

rental payment,

traffic challan,

KM overage,

late fee,

damage,

other approved charge.

Never surprise the customer at return with previously known dues.

66. Compliance Alerts

Notifications can include:

Payment

Your rental payment is due tomorrow.

Service

Mandatory service is due in 250 km.

Geo Boundary

Your vehicle appears to be outside the permitted operating area.

KM Usage

You've used 90% of your plan's KM allowance.

Challan

A new traffic challan has been detected for your vehicle.

67. Geo-Boundary

Where vehicle telemetry supports it:

Configure permitted geographic boundary.

Possible states:

within zone,

approaching restriction,

outside permitted zone.

Customer should receive a clear warning, not technical telemetry information.

68. Support

Support must be prominent.

Help & Support

Call DriveX

24/7 tap-to-call where support operations permit.

WhatsApp Us

Deep link directly into support conversation.

Help Centre

FAQs for:

payments,

KYC,

breakdown,

accident,

service,

challans,

return,

deposits.

69. Roadside Assistance

From My Bike:

Roadside Help

Show:

RSA provider,

phone number,

policy/reference number,

terms where applicable.

CTA:

Call Roadside Assistance

70. Return Journey

Customer selects:

Return Bike

Show:

assigned return hub,

available slots,

current outstanding dues.

Allow:

Choose Return Slot

71. Return Summary

Before return:

Your Current Settlement

Security deposit:

₹2,000

Outstanding rental:

₹0

Challans:

₹500

KM overage:

₹120

Known pending amount:

₹620

Potential deposit refund before final inspection:

₹1,380

Clearly state that vehicle inspection may affect final settlement.

72. Return Inspection

At hub capture:

odometer,

fuel/battery,

photographs,

video if necessary,

damage,

accessories,

keys.

Compare against handover record.

73. Damage Transparency

If damage is identified:

Show:

Damage Identified

Example:

Left side panel scratch

Handover photo

Return photo

Charge:

₹X

This is why the original handover photos are important.

74. Final Settlement

Show:

Security Deposit
₹2,000

Less:

Traffic challans
₹500

KM overage
₹120

Damage
₹300

Refund Due

₹1,080

Customer sees the complete calculation.

75. Return Transport

After successful return, offer:

Need a ride?

Possible Rapido experience:

Book Rapido

or

Use DriveX Rapido Discount

or

Open Rapido

This extends the partnership throughout the journey.

76. Rent-to-Own V1 Dashboard

RTO customers need some additional information, but V1 should stay simple.

Show:

My Ownership Plan

Vehicle
TVS ______

Next payment
₹X

Due date
XX

Payments

X payments completed

CTA:

View Payment History

77. RTO Features Deferred

Detailed ownership tracking can come later.

V1 does not need:

complete ownership amortisation visualisation,

complex equity earned calculations,

elaborate ownership countdown,

predicted resale value.

78. V3 — Path to Ownership

Future feature:

Ownership Progress

Payments completed
Payments remaining
Expected transfer period
Ownership transfer status

Possible statuses:

Payments in progress

Eligible for transfer

Documents being prepared

Transfer initiated

Transfer completed

79. V3 — Care Credits

Future:

Customers earn credits for:

on-time rental payments,

on-time service,

safe/responsible usage,

no unresolved penalties,

good vehicle care.

80. Loyalty Ledger

Example:

Care Credits

1,450 Credits

Recent:

+100 On-time payment

+150 Service completed on time

Credits could potentially be redeemed against:

future rentals,

helmets,

raincoats,

selected services/rewards.

This should NOT block V1.

81. Notifications Required for V1

Booking

Reservation confirmed.

Documents

Reminder to carry documents.

Rapido

Transportation information/coupon.

KYC

Verification in progress.

Additional Document

Action required.

Approval

Rental approved.

Payment

Final amount due.

Payment Success

Receipt available.

Rental

Vehicle successfully handed over.

Next Payment

Upcoming rent.

Overdue

Payment missed.

KM

Usage approaching limit.

Service

Service due.

Challan

New challan detected.

Return

Return slot reminder.

82. Core Backend Entities

Customer

Hub

Vehicle Model

Vehicle

Plan

Booking

Reservation

KYC Case

Eligibility Case

Payment

Payment Ledger

Rental

Service Booking

Inspection

Challan

Damage

Pickup/Transport Request

Support Ticket

83. Plan Configuration

The backend must make plan rules configurable.

A plan should support:

plan_id

plan_type

vehicle_category

billing_period

rental_amount

deposit_amount

downpayment_amount

processing_fee

included_km

extra_km_rate

late_fee_rule

minimum_duration

maximum_duration

reservation_amount

is_active

This avoids app releases whenever business pricing changes.

84. Booking States

Possible lifecycle:

DISCOVERY

→ BIKE_SELECTED

→ OTP_VERIFIED

→ ELIGIBILITY_STARTED

→ ELIGIBILITY_COMPLETED / SKIPPED

→ PAYMENT_PENDING

→ RESERVED

→ TRAVEL_TO_HUB

→ AT_HUB

→ KYC_IN_PROGRESS

→ APPROVED / REJECTED

→ FINAL_PAYMENT_PENDING

→ PAID

→ AGREEMENT_ACCEPTED

→ VEHICLE_ASSIGNED

→ HANDOVER_PENDING

→ ACTIVE

→ RETURN_REQUESTED

→ RETURN_INSPECTION

→ SETTLEMENT_PENDING

→ CLOSED

85. Vehicle States

AVAILABLE

RESERVED

ASSIGNED

ACTIVE

SERVICE_DUE

IN_SERVICE

REPAIR

BLOCKED

RETURN_INSPECTION

READY_FOR_RENT

86. Payment States

CREATED

PENDING

SUCCESS

FAILED

REFUND_PENDING

REFUNDED

87. KYC States

NOT_STARTED

SUBMITTED

IN_REVIEW

ACTION_REQUIRED

APPROVED

REJECTED

88. Service States

DUE

BOOKED

CHECKED_IN

IN_PROGRESS

READY

COMPLETED

MISSED

89. V1 Admin Dashboard

Hub teams need an operations dashboard.

Main sections:

Today's Reservations

Customers Travelling to Hub

Customers at Hub

KYC Pending

Final Payments Pending

Vehicles Available

Handover Pending

Active Rentals

Service Due

Returns Today

90. Admin Customer Page

One screen should contain:

Customer profile
Booking
Plan
Documents
KYC
Eligibility
Payments
Rapido/travel status
Vehicle
Agreement
Inspection
Service
Dues
Challans
Rental history

The hub employee should not need five applications to serve one rider.

91. Analytics Funnel

Track:

app_opened

location_shared

hub_viewed

bike_viewed

bike_selected

plan_selected

mobile_verified

eligibility_started

eligibility_skipped

eligibility_completed

reservation_started

reservation_paid

rapido_selected

self_travel_selected

hub_checkin

kyc_started

kyc_approved

kyc_rejected

final_payment_started

final_payment_completed

agreement_accepted

vehicle_handed_over

rental_activated

92. Primary Funnel

Measure:

Location Shared

↓

Bike Selected

↓

Plan Selected

↓

₹199 Paid

↓

Customer Reaches Hub

↓

KYC Approved

↓

Final Payment

↓

Bike Handover

This should be the primary product funnel.

93. Primary Business Metric

Successful Rental Activation Rate

Of riders who select a vehicle, how many ultimately leave the hub with a bike?

94. Important Supporting Metrics

Discovery

Percentage of customers who find available inventory.

Reservation Conversion

Bike selected → ₹199 paid.

Transportation

₹199 paid → hub arrival.

KYC

Hub arrival → approval.

Commercial

Approval → final payment.

Fulfilment

Payment → handover.

Speed

App Open → Vehicle Handover.

95. Important Launch Edge Cases

The system must handle:

no available bike,

requested plan unavailable,

reservation payment deducted but confirmation delayed,

reservation payment failure,

inventory unavailable after payment,

eligibility API failure,

DigiLocker/document verification failure,

unclear document,

document mismatch,

customer skips eligibility,

Rapido unavailable,

customer arrives independently,

KYC rejection,

customer requires additional document,

final payment failure,

₹199 adjustment failure,

selected bike unavailable at handover,

TrekNTell temporarily unavailable,

challan provider unavailable,

vehicle returned with damage,

deposit refund failure.

96. Critical Financial Acceptance Test

Example:

Weekly rent:

₹1,800

Security deposit:

₹2,000

Reservation:

₹199

Customer pays:

Online Reservation

₹199

At hub:

₹1,800 + ₹2,000 - ₹199

Remaining Payment

₹3,601

Total received:

₹199 + ₹3,601

₹3,800

The system must never accidentally charge:

₹199 + ₹3,800.

97. Critical RTO Acceptance Test

Example:

Downpayment:

₹5,000

Processing fee:

₹1,500

First monthly payment:

₹3,000

Reservation:

₹199

Total initial liability:

₹9,500

Already paid:

₹199

Final payment:

₹9,301

Ledger must preserve all components independently.

98. Recommended Engineering Build Sequence

Sprint / Phase 1

Core models:

customer,

hub,

bike,

vehicle,

plan,

inventory,

booking.

Phase 2

Discovery:

location,

nearby hubs,

bike listing,

filters,

bike detail,

plan selection.

Phase 3

Authentication and reservation:

OTP,

booking,

₹199 payment,

payment gateway,

payment webhook,

reservation,

inventory locking.

Phase 4

Eligibility:

optional eligibility,

DL verification,

selfie,

KYC provider integration,

consent,

eligibility states.

Phase 5

Travel to Hub:

hub directions,

Rapido integration/deep link/coupon,

reservation validity,

hub check-in.

Phase 6

Hub KYC:

operations dashboard,

document verification,

approval,

rejection,

rejection reasons,

additional-document flow.

Phase 7

Commercial Engine:

weekly plan,

monthly plan,

RTO,

deposit,

downpayment,

processing fee,

₹199 adjustment,

final payment,

invoice,

receipt.

Phase 8

Handover:

agreement,

vehicle allocation,

vehicle inspection,

photos/video,

handover OTP,

rental activation.

Phase 9

My Bike:

post-rental home,

next payment,

payment history,

documents,

odometer,

KM limits,

Bike Health.

Phase 10

Service and Compliance:

service booking,

reminders,

TrekNTell data,

challans,

Zoop integration,

geo-boundary alerts,

payment reminders.

Phase 11

Return:

return booking,

inspection,

damages,

KM overage,

challans,

final settlement,

deposit refund,

Rapido return option.

99. What Should Be Deferred

Do not allow V1 to become too large.

Defer where possible:

Care Credits

loyalty rewards

complex RTO ownership charts

sophisticated Bike Health algorithms

advanced AI recommendations

gamification

rider earnings analytics

community features

automated dynamic pricing

complex vehicle delivery logistics

100. V1 Product Promise

The app should ultimately make the journey feel this simple:

Find a bike near you. Choose how you want to rent it. Reserve it for ₹199. Reach the DriveX hub. Get verified and ride away.

And after the rider gets the vehicle:

Know what you owe. Know how your bike is doing. Keep riding and earning.

The complexity of KYC, credit checks, payments, kilometre tracking, servicing, challans, documentation, inspection and operations should remain underneath these two simple promises.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://drivexrental.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/63d8c664-7f65-4ed2-bcac-7d3d618f1f57).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
