import { useEffect, useState, type ReactNode } from "react";
import { KeyRound, Loader2 } from "lucide-react";

import { AutoBackdrop } from "@/components/drivex/AutoBackdrop";
import { DriveXLogo } from "@/components/drivex/DriveXLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkGateToken, unlockPrototype } from "@/lib/access.functions";

const STORAGE_KEY = "drivex.gate";

export function AccessGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "locked" | "open">("checking");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const token = window.localStorage.getItem(STORAGE_KEY) ?? undefined;

    // A previously unlocked device goes straight in; the check below still runs
    // and re-locks if the token turned out to be stale.
    if (token) setState("open");

    // Never leave the spinner running forever if the request hangs.
    const timer = window.setTimeout(() => {
      if (active) setState((prev) => (prev === "checking" ? "locked" : prev));
    }, 6000);

    checkGateToken({ data: { token } })
      .then((result) => {
        if (!active) return;
        if (!result.enabled || result.unlocked) {
          setState("open");
          return;
        }
        window.localStorage.removeItem(STORAGE_KEY);
        setState("locked");
      })
      .catch(() => {
        if (active && !token) setState("locked");
      })
      .finally(() => window.clearTimeout(timer));

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await unlockPrototype({ data: { pin } });
      if (!result.ok) {
        setError(result.message ?? "That PIN is not correct.");
        setPin("");
        return;
      }
      if (result.token) window.localStorage.setItem(STORAGE_KEY, result.token);
      setState("open");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check the PIN. Try again.");
      setPin("");
    } finally {
      setSubmitting(false);
    }
  }

  if (state === "open") return <>{children}</>;

  return (
    <div className="relative min-h-screen">
      <AutoBackdrop />
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 py-10">
        <DriveXLogo size={56} priority />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          DriveX <span className="text-primary">Rental</span>
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <KeyRound className="h-4 w-4 text-primary" /> Internal preview — enter access PIN
        </p>

        {state === "checking" ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking access…
          </div>
        ) : (
          <form
            className="mt-7 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (pin.length >= 4 && !submitting) void submit();
            }}
          >
            <Input
              autoFocus
              value={pin}
              onChange={(event) => setPin(event.target.value.trim().slice(0, 16))}
              inputMode="numeric"
              autoComplete="off"
              placeholder="• • • •"
              aria-label="Access PIN"
              className="h-14 text-center text-2xl tracking-[0.5em]"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={pin.length < 4 || submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enter
            </Button>
          </form>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          This prototype is limited to the DriveX team until launch day.
        </p>
      </div>
    </div>
  );
}