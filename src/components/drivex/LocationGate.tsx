import { useState, type ReactNode } from "react";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";

import { AutoBackdrop } from "@/components/drivex/AutoBackdrop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import { LOCALITIES, useRiderLocation } from "@/lib/location";
import { saveLocation } from "@/lib/auth.functions";
import { cn } from "@/lib/utils";

export function LocationGate({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const { location, ready, setLocation } = useRiderLocation();
  const [locality, setLocality] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [locating, setLocating] = useState(false);

  if (!ready || location) return <>{children}</>;

  function detect() {
    if (!("geolocation" in navigator)) {
      toast.error("Your browser can't share location. Pick your area instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setLocation({
          coords: { lat: position.coords.latitude, lng: position.coords.longitude },
        });
        void saveLocation({ data: {} });
      },
      () => {
        setLocating(false);
        toast.error("We couldn't get your location. Pick your area instead.");
      },
      { timeout: 8000 },
    );
  }

  const canContinue = Boolean(locality || pinCode.length === 6);

  return (
    <div className="relative min-h-screen">
      <AutoBackdrop />
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <MapPin className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">{t("locationTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("locationIntro")}</p>

        <Button className="mt-6" size="lg" onClick={detect} disabled={locating}>
          {locating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="mr-2 h-4 w-4" />
          )}
          {t("useMyLocation")}
        </Button>

        <p className="mt-6 text-sm font-medium">{t("pickArea")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {LOCALITIES.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => setLocality(area === locality ? "" : area)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                locality === area
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card/60 hover:border-primary/50",
              )}
            >
              {area}
            </button>
          ))}
        </div>

        <Input
          value={pinCode}
          onChange={(event) => setPinCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder={t("pinPlaceholder")}
          inputMode="numeric"
          className="mt-4"
        />

        <Button
          className="mt-5"
          size="lg"
          variant={canContinue ? "default" : "secondary"}
          disabled={!canContinue}
          onClick={() => {
            setLocation({ locality: locality || undefined, pinCode: pinCode || undefined });
            void saveLocation({ data: { locality, pinCode } });
          }}
        >
          {t("continueLabel")}
        </Button>

        <p className="mt-5 text-xs text-muted-foreground">{t("locationPrivacy")}</p>
      </div>
    </div>
  );
}