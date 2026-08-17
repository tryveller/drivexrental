# Internal-only access with a PIN gate

Lock the whole prototype behind a short access PIN that only the internal team knows. On launch day, flipping one setting removes the gate for everyone — no code rewrite needed.

## How it works for the user

1. Someone opens the app and sees a small branded PIN screen (logo, "Internal preview", 4-6 digit input).
2. Correct PIN -> they continue into the normal flow (splash -> language -> location -> homepage). The unlock is remembered on that device for 30 days.
3. Wrong PIN -> a short error message, with a brief cooldown after several wrong tries so the PIN can't be brute-forced.
4. On launch day: set the gate to "off" in the backend settings and the PIN screen disappears for everyone instantly.

## Technical approach

- Store the PIN and the on/off flag as backend secrets (`PROTOTYPE_PIN`, `PROTOTYPE_GATE_ENABLED`), not in client code — a PIN in the frontend bundle is readable by anyone.
- New `src/lib/access.functions.ts`:
  - `getGateStatus()` — returns `{ enabled: boolean }` only (never the PIN).
  - `unlockPrototype({ pin })` — compares against the secret, and on success returns a signed token (HMAC of `exp` using a server secret). Add a simple in-memory attempt counter per IP for cooldown.
  - `verifyGateToken()` used by the gate to validate a stored token.
- New `src/components/drivex/AccessGate.tsx`: wraps everything inside `src/routes/__root.tsx`, outermost (before `SplashScreen`). Reads token from `localStorage` (`drivex.gate`), validates it via the server fn, and renders the PIN screen while locked. When `enabled` is false it renders children immediately.
- Styling reuses the existing black/orange tokens, `AutoBackdrop` and `DriveXLogo` so it feels like part of the product.
- Removal later is one flag change; deleting the wrapper in `__root.tsx` fully removes it.

## Notes

- This gates the prototype UI, not the database. Existing RLS policies stay unchanged.
- The gate is separate from rider mobile login — internal testers still go through the normal OTP flow after unlocking.
