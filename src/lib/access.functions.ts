import { createServerFn } from "@tanstack/react-start";

export const getGateStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { gateEnabled } = await import("./access.server");
  return { enabled: gateEnabled() };
});

export const checkGateToken = createServerFn({ method: "POST" })
  .inputValidator((input: { token?: string | undefined }) => input)
  .handler(async ({ data }) => {
    const { gateEnabled, tokenValid } = await import("./access.server");
    if (!gateEnabled()) return { enabled: false, unlocked: true };
    return { enabled: true, unlocked: await tokenValid(data.token) };
  });

export const unlockPrototype = createServerFn({ method: "POST" })
  .inputValidator((input: { pin: string }) => input)
  .handler(async ({ data }) => {
    const access = await import("./access.server");
    if (!access.gateEnabled()) return { token: null, enabled: false };
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const clientKey =
      getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for") ?? "unknown";

    const wait = access.cooldownRemaining(clientKey);
    if (wait > 0) {
      return {
        ok: false as const,
        enabled: true,
        token: null,
        message: `Too many attempts. Try again in ${Math.ceil(wait / 1000)}s.`,
      };
    }

    if (!access.pinMatches(data.pin)) {
      access.recordFailure(clientKey);
      return { ok: false as const, enabled: true, token: null, message: "That PIN is not correct." };
    }

    access.clearFailures(clientKey);
    return { ok: true as const, enabled: true, token: await access.issueToken(), message: null };
  });