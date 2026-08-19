# Fix: "Pay ₹199 and reserve" appears dead

## What is happening

The button is not broken on the server — it is **disabled** until the consent checkbox is ticked. Two problems make that invisible to a rider:

1. The consent tick box is a 16px square. Tapping the sentence next to it does nothing, so most riders never manage to tick it.
2. Because the button is disabled, tapping it gives no reaction at all — no message, no movement. The only hint is a small grey line of text below it, which reads like a footnote rather than a blocker.

Result: the rider taps the big orange button repeatedly and concludes the app is broken.

## What changes

- The consent line becomes a **full-width tappable card** (whole row toggles), with a big tick target and a clear ticked state (orange fill + tick). Minimum 44px tap height.
- The **Pay ₹199 and reserve button stays enabled**. If consent is not given yet, tapping it does not submit — instead the consent card flashes/highlights, scrolls into view, and a short toast in the selected language says the box must be ticked. Nothing is charged.
- Once ticked, the same tap pays and reserves as it does today.
- The small grey "Please accept…" footnote is removed; the highlight replaces it.
- The same tappable-row treatment is applied to the other two consent gates that use the identical pattern, so the fix is not one-off:
  - the KYC document consent in `HubSteps.tsx`
  - the rental agreement acceptance in `HubSteps.tsx`

No pricing, billing, or reservation rules change.

## Technical notes

- New shared component `src/components/drivex/ConsentRow.tsx`: label-wrapped `Checkbox` with `h-6 w-6`, full-row press handling, `aria-checked`, and a `highlight` prop that applies a brief ring/shake via a Tailwind animation defined in `src/styles.css`.
- `src/routes/journey.tsx` → `ReserveStep`: replace the inline label with `ConsentRow`; drop `disabled={!acceptedTerms}` on the pay `ActionButton` and instead guard inside its `run` — when `acceptedTerms` is false, set `highlight`, `scrollIntoView`, `toast.error(t("acceptTermsRequired"))`, and return without calling `payReservation`. `ActionButton` gains an optional `guard?: () => boolean` prop so the mutation is skipped cleanly.
- `src/components/drivex/HubSteps.tsx`: `HubKycStep` and `AgreementStep` use `ConsentRow` with the same guard behaviour on their submit buttons.
- Reuse existing i18n keys (`reservationTermsConsent`, `acceptTermsRequired`, `documentConsent`, `consentRequired`); no new copy keys, so no i18n draft run needed.
- Verify by driving the reserve step in a headless browser: tap the button unticked (expect toast + highlight, no booking change), then tick the row and tap again (expect reservation success).
