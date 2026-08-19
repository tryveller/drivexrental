import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, Navigation, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AutoBackdrop } from "@/components/drivex/AutoBackdrop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import { useRiderLocation } from "@/lib/location";
import { saveLocation } from "@/lib/auth.functions";

export function LocationGate({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const { location, ready, setLocation } = useRiderLocation();
  const [pinCode, setPinCode] = useState("");
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [typing, setTyping] = useState(false);
  const saved = useRef(false);

  function commit(next: {
    pinCode?: string;
    coords?: { lat: number; lng: number };
  }) {
    if (saved.current) return;
    saved.current = true;
    setLocation(next);
    void saveLocation({ data: { pinCode: next.pinCode ?? "" } }).catch(() => {});
  }

  // Granting location is the whole answer — no second Continue tap.
  useEffect(() => {
    if (coords) commit({ coords });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords]);

  function detect() {
    if (!("geolocation" in navigator)) {
      toast.error(t("locationUnsupported"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => {
        setLocating(false);
        toast.error(t("locationDenied"));
        setTyping(true);
      },
      { timeout: 8000 },
    );
  }

  const canContinue = pinCode.length === 6;

  // Hooks must run on every render, so the gate decision happens after them.
  if (!ready || location) return <>{children}</>;

  return (
    <div className="relative min-h-screen">
      <AutoBackdrop />
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">{t("locationTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("locationWhyShort")}</p>

        {/* One obvious action: tap, don't type. */}
        <Button
          className="mt-6 h-16 rounded-2xl text-base font-semibold"
          size="lg"
          onClick={detect}
          disabled={locating}
        >
          {locating ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Navigation className="mr-2 h-5 w-5" />
          )}
          {t("useMyLocation")}
        </Button>

        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          {t("approxLocationTitle")}
        </p>

        {/* Typing a PIN is the fallback, never the first thing offered. */}
        {typing ? (
          <div className="mt-6 border-t border-border pt-5">
            <Input
              value={pinCode}
              onChange={(event) => setPinCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder={t("pinPlaceholder")}
              inputMode="numeric"
              autoFocus
              className="h-14 text-center text-lg tracking-[0.3em]"
            />
            <Button
              className="mt-4 h-14 w-full rounded-2xl text-base font-semibold"
              variant={canContinue ? "default" : "secondary"}
              disabled={!canContinue}
              onClick={() => commit({ pinCode })}
            >
              {t("continueLabel")}
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setTyping(true)}
            className="mt-6 self-start text-sm font-medium text-primary underline underline-offset-4"
          >
            {t("enterPinInstead")}
          </button>
        )}
      </div>
    </div>
  );
}