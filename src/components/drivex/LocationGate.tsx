import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, MapPin, Navigation, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AutoBackdrop } from "@/components/drivex/AutoBackdrop";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { useRiderLocation } from "@/lib/location";
import { saveLocation } from "@/lib/auth.functions";

export function LocationGate({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const { location, ready, setLocation } = useRiderLocation();
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const saved = useRef(false);

  function commit(next: {
    coords?: { lat: number; lng: number };
  }) {
    if (saved.current) return;
    saved.current = true;
    setLocation(next);
    void saveLocation({ data: { pinCode: "" } }).catch(() => {});
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
      },
      { timeout: 8000 },
    );
  }

  // Hooks must run on every render, so the gate decision happens after them.
  if (!ready || location) return <>{children}</>;

  return (
    <div className="relative min-h-screen">
      <AutoBackdrop />
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
          <MapPin className="h-7 w-7 text-primary" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{t("locationTitle")}</h1>

        {/* One obvious action: tap. No typing anywhere on this screen. */}
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

        {/* Refusing permission must never dead-end the rider. */}
        <button
          type="button"
          onClick={() => commit({})}
          className="mt-6 self-start text-sm font-medium text-primary underline underline-offset-4"
        >
          {t("skipForNow")}
        </button>
      </div>
    </div>
  );
}