import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Loader2, MapPin, Navigation, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AutoBackdrop } from "@/components/drivex/AutoBackdrop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import {
  approximateCoords,
  LOCALITIES,
  useRiderLocation,
} from "@/lib/location";
import { distanceKm } from "@/lib/pricing";
import { saveLocation } from "@/lib/auth.functions";
import { getCatalog } from "@/lib/catalog.functions";
import { cn } from "@/lib/utils";

export function LocationGate({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const { location, ready, setLocation } = useRiderLocation();
  const [locality, setLocality] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const catalog = useQuery({ queryKey: ["catalog"], queryFn: () => getCatalog() });
  const hub = catalog.data?.hubs[0] ?? null;

  if (!ready || location) return <>{children}</>;

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

  const canContinue = Boolean(coords || locality || pinCode.length === 6);

  const hubDistance = useMemo(() => {
    const from = approximateCoords({
      ...(locality ? { locality } : {}),
      ...(pinCode.length === 6 ? { pinCode } : {}),
      ...(coords ? { coords } : {}),
    });
    if (!from || !hub) return null;
    return Math.max(1, Math.round(distanceKm(from, { lat: hub.latitude, lng: hub.longitude })));
  }, [coords, locality, pinCode, hub]);

  const mapsUrl = hub
    ? `https://www.google.com/maps/search/?api=1&query=${hub.latitude},${hub.longitude}`
    : "#";
  const embedUrl = hub
    ? `https://www.google.com/maps?q=${hub.latitude},${hub.longitude}&z=14&output=embed`
    : "";

  return (
    <div className="relative min-h-screen">
      <AutoBackdrop />
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t("approxLocationTitle")}
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{t("locationTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("approxLocationNote")}</p>

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
              onClick={() => {
                setCoords(null);
                setLocality(area === locality ? "" : area);
              }}
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
          onChange={(event) => {
            setCoords(null);
            setPinCode(event.target.value.replace(/\D/g, "").slice(0, 6));
          }}
          placeholder={t("pinPlaceholder")}
          inputMode="numeric"
          className="mt-4"
        />

        {hub && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card/70 shadow-lg backdrop-blur">
          <iframe
            title={hub.name}
            src={embedUrl}
            loading="lazy"
            className="h-40 w-full grayscale-[0.35] contrast-[1.05]"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="space-y-2 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("hubLaunchTitle")}
            </p>
            <p className="text-sm font-semibold">{hub.name}</p>
            <p className="text-xs text-muted-foreground">{hub.address}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {hubDistance !== null
                ? t("hubDistanceAway", { km: String(hubDistance) })
                : t("hubDistanceUnknown")}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-primary" />
              {hub.opens_at.slice(0, 5)}–{hub.closes_at.slice(0, 5)}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
              >
                {t("viewHubOnMap")}
              </a>
            </div>
          </div>
        </div>
        )}

        <p className="mt-4 flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5 text-xs font-medium text-primary">
          <Sparkles className="h-4 w-4 shrink-0" />
          {t("reserveNudge199")}
        </p>

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
            if (locality) next["locality"] = locality;
            if (pinCode) next["pinCode"] = pinCode;
            if (coords) next["coords"] = coords;
            setLocation(next);
            void saveLocation({ data: { locality, pinCode } });
          }}
        >
          {t("continueLabel")}
        </Button>

        <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          {t("locationSafeNote")}
        </p>
      </div>
    </div>
  );
}