import { useState, type ReactNode } from "react";
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

  const canContinue = Boolean(coords || pinCode.length === 6);

  // Hooks must run on every render, so the gate decision happens after them.
  if (!ready || location) return <>{children}</>;

  return (
    <div className="relative min-h-screen">
      <AutoBackdrop />
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">{t("locationTitle")}</h1>

        <Button className="mt-6" size="lg" onClick={detect} disabled={locating}>
          {locating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="mr-2 h-4 w-4" />
          )}
          {t("useMyLocation")}
        </Button>

        <Input
          value={pinCode}
          onChange={(event) => {
            setCoords(null);
            setPinCode(event.target.value.replace(/\D/g, "").slice(0, 6));
          }}
          placeholder={t("pinPlaceholder")}
          inputMode="numeric"
          className="mt-4 h-12 text-center text-base tracking-[0.3em]"
        />

        <Button
          className="mt-5"
          size="lg"
          variant={canContinue ? "default" : "secondary"}
          disabled={!canContinue}
          onClick={() => {
            const next: {
              locality?: string;
              pinCode?: string;
              coords?: { lat: number; lng: number };
            } = {};
            if (pinCode) next["pinCode"] = pinCode;
            if (coords) next["coords"] = coords;
            setLocation(next);
            void saveLocation({ data: { pinCode } }).catch(() => {});
          }}
        >
          {t("continueLabel")}
        </Button>

        <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
          {t("approxLocationTitle")}
        </p>
      </div>
    </div>
  );
}