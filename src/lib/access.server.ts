/** Server-only helpers for the internal-preview PIN gate. */

const encoder = new TextEncoder();

function pin() {
  return (process.env["PROTOTYPE_PIN"] ?? "").trim();
}

/** The gate is on unless explicitly turned off, and always off without a PIN. */
export function gateEnabled() {
  const flag = (process.env["PROTOTYPE_GATE_ENABLED"] ?? "").trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") return false;
  return pin().length > 0;
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sign(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`drivex-gate:${pin()}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(mac))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function issueToken() {
  const exp = String(Date.now() + TOKEN_TTL_MS);
  return `${exp}.${await sign(exp)}`;
}

export async function tokenValid(token: string | undefined | null) {
  if (!token) return false;
  const [exp, mac] = token.split(".");
  if (!exp || !mac) return false;
  if (Number(exp) < Date.now()) return false;
  return timingSafeEqual(mac, await sign(exp));
}

export function pinMatches(candidate: string) {
  const expected = pin();
  if (!expected) return false;
  return timingSafeEqual(candidate.trim(), expected);
}

/** Soft brute-force cooldown per client, best-effort within a worker instance. */
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 60_000;

export function cooldownRemaining(clientKey: string) {
  const entry = attempts.get(clientKey);
  if (!entry) return 0;
  return Math.max(0, entry.until - Date.now());
}

export function recordFailure(clientKey: string) {
  const entry = attempts.get(clientKey) ?? { count: 0, until: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.until = Date.now() + COOLDOWN_MS;
    entry.count = 0;
  }
  attempts.set(clientKey, entry);
}

export function clearFailures(clientKey: string) {
  attempts.delete(clientKey);
}