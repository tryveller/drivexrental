import { useState } from "react";
import { BatteryWarning, CheckCircle2, Clock3, IndianRupee, MapPin, Ticket } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { rupees } from "@/lib/format";
import { useLanguage, type TKey } from "@/lib/i18n";

const RAPIDO_URL = "https://m.rapido.bike/";

const EXPECTATIONS: { key: TKey; icon: typeof Clock3 }[] = [
  { key: "expectRemoteStop", icon: BatteryWarning },
  { key: "expectInformExtension", icon: Clock3 },
  { key: "expectProRata", icon: IndianRupee },
  { key: "expectDropoffCharges", icon: IndianRupee },
  { key: "expectHelmetReturn", icon: CheckCircle2 },
];

/**
 * Post-payment confirmation for a ₹199 reservation: what is held, what is still
 * payable at the hub, the Rapido coupon for the ride to the hub, and the usage
 * rules the rider is agreeing to operate under.
 */
export function ReservationConfirmed({
  bookingCode,
  modelName,
  hubName,
  hubAddress,
  paidAmount,
  amountAtHub,
  rapidoCoupon,
  onRevealCoupon,
}: {
  bookingCode: string;
  modelName: string;
  hubName: string | null;
  hubAddress: string | null;
  paidAmount: number;
  amountAtHub: number | null;
  rapidoCoupon: string | null;
  onRevealCoupon: () => Promise<unknown>;
}) {
  const { t } = useLanguage();
  const [revealing, setRevealing] = useState(false);

  const reveal = async () => {
    setRevealing(true);
    try {
      await onRevealCoupon();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("somethingWentWrong"));
    } finally {
      setRevealing(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-primary/30 bg-card">
      <div className="bg-primary/10 p-5 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-3 text-xl font-semibold">{t("reservationConfirmedTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("reservationConfirmedBody", { amount: rupees(paidAmount), model: modelName })}
        </p>
        <p className="mt-2 text-xs font-medium tracking-wide text-muted-foreground">
          {t("bookingLabel", { code: bookingCode })}
        </p>
      </div>

      <div className="space-y-4 p-4">
        {hubName && (
          <div className="flex items-start gap-2 rounded-xl bg-secondary px-3 py-2 text-xs text-secondary-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{[hubName, hubAddress].filter(Boolean).join(" · ")}</span>
          </div>
        )}

        {amountAtHub !== null && (
          <p className="text-sm text-muted-foreground">
            {t("amountDueAtHub", { amount: rupees(amountAtHub) })}
          </p>
        )}

        <div className="rounded-xl border border-dashed border-primary/40 p-3">
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">{t("rapidoDropTitle")}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t("rapidoDropBody")}</p>
          {rapidoCoupon ? (
            <div className="mt-3 space-y-2">
              <p className="rounded-lg bg-accent px-3 py-2 text-center text-base font-semibold tracking-[0.2em] text-accent-foreground">
                {rapidoCoupon}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    void navigator.clipboard?.writeText(rapidoCoupon);
                    toast.success(t("couponCopied"));
                  }}
                >
                  {t("copyCoupon")}
                </Button>
                <Button asChild className="flex-1">
                  <a href={RAPIDO_URL} target="_blank" rel="noopener noreferrer">
                    {t("openRapido")}
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <Button className="mt-3 w-full" onClick={reveal} disabled={revealing}>
              {t("showRapidoCoupon")}
            </Button>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold">{t("beforeYouRideTitle")}</h3>
          <ul className="mt-2 space-y-2">
            {EXPECTATIONS.map(({ key, icon: Icon }) => (
              <li key={key} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
