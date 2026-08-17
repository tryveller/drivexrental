# Multi-language architecture (8 languages) + language-first onboarding

Goal: every rider reads the app in their own language, phrased the way a native speaker would say it — not word-for-word translation. Copy lives in code (versioned, reviewable, good context), and new features get a repeatable process for producing that copy.

## Languages

English, हिन्दी (Hindi), ಕನ್ನಡ (Kannada), తెలుగు (Telugu), தமிழ் (Tamil), മലയാളം (Malayalam), ଓଡ଼ିଆ (Odia), नेपाली (Nepali).

Codes: `en, hi, kn, te, ta, ml, or, ne`.

## What stays in English (existing rule, kept)

Proper nouns and legal/product identifiers: person names, model names (TVS Jupiter), plan names shown as product labels, document names (Driving Licence, RC, PAN), registration numbers, amounts, PIN/OTP codes, brand words (DriveX, Google Maps). Everything else — instructions, headings, buttons, statuses, warnings, empty states, errors, toasts — is in the selected language.

## Language screen (first screen)

- Subtle India-flag backdrop: soft saffron/white/green wash with a faint Ashoka-chakra outline, low opacity behind a dark scrim so text stays readable. Decorative only, `aria-hidden`.
- Polite ask, in all languages at once: "Please choose your language · अपनी भाषा चुनें · ..." (rotating line so it never looks English-first).
- All 8 languages as large tap buttons in a 2-column grid: native script name (big) + a short line in that language.
- **Confirmation step**: tapping a language opens a confirm sheet written *in that language*: "Continue in Tamil?" + "You can change the language any time from the top of the home screen. It stays this way until you change it." → Confirm / Go back.
- Choice is saved and persists across sessions until changed.
- Same confirm sheet is reused for the header language switcher, so a mis-tap never silently flips the app.

## Copy architecture

```text
src/lib/i18n/
  languages.ts    # Lang union, LANGUAGES metadata, native names, direction
  keys.ts         # copy keys grouped by surface (shell, onboarding, discovery,
                  # plans, auth, journey, myBike, errors), each key = one entry
                  # per language + a `context` note describing tone/placement
  index.tsx       # LanguageProvider, useLanguage, t(), tCount(), tList()
  audit.ts        # dev-only completeness check
```

- One flat, typed key space; `t("key")` stays the call shape, so existing screens keep working.
- Missing entry → falls back to English **and** logs a dev warning; `audit.ts` fails loudly in dev if any key lacks any of the 8 languages, so a half-translated feature is visible immediately.
- Interpolation: `t("key", { count, name })` for amounts/names, so word order can differ per language instead of being glued together in JSX.
- Numbers, currency and dates go through the existing `format.ts`, extended to take the active locale (`en-IN`, `hi-IN`, `ta-IN`, …) so digits and date words match the language.
- `<html lang>` follows the active language.

## Process for new features (the part that must not be skipped)

A small authoring workflow so future features never ship English-only:

1. Add the new keys to `keys.ts` with English copy plus a `context` note (where it appears, tone, what the rider must understand).
2. Run `bun run i18n:draft` — a script that calls Lovable AI once per key with the context note and asks, per language, for *how a native speaker would say this to a first-time bike renter*, not a translation: short sentences, no jargon, keep listed English terms untouched.
3. The script writes the result straight back into `keys.ts` (code-stored copy, reviewable in the diff) and prints a table for human review.
4. `bun run i18n:check` verifies every key has all 8 languages and that protected English terms survived; this runs as part of the normal checks.

Guardrails baked into the prompt: max ~140 chars for buttons/labels, plain everyday register (spoken, not official/administrative), keep ₹ amounts and English product/document names verbatim, no transliterated English where a natural native word exists.

## Rollout

1. i18n module split, 8 languages wired, English + existing Hindi/Kannada copy migrated as-is.
2. Draft + review copy for te, ta, ml, or, ne across all existing keys.
3. New language screen (flag backdrop, 8 buttons, confirm sheet) and header switcher with confirm.
4. Sweep every screen for hardcoded English strings (home, plans modal, auth, journey, my-bike, PIN gate, errors, toasts, 404) and move them into keys.
5. Locale-aware number/date formatting + `<html lang>`.
6. Verify each language end-to-end in the browser for layout overflow (Tamil/Malayalam run long) and font rendering.
