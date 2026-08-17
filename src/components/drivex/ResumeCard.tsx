import { ChevronRight, Bike } from "lucide-react";

import { useLanguage } from "@/lib/i18n";

export type ResumeBooking = {
  booking_code: string;
  status: string;
  modelBrand: string | null;
  modelName: string | null;
  hubName: string | null;
};

const RIDING_STATUSES = ["ACTIVE", "RETURN_REQUESTED", "RETURN_INSPECTION"];

export function isRiding(status: string) {
  return RIDING_STATUSES.includes(status);
}

/** Top-of-homepage nudge that takes a rider straight back into their journey. */
export function ResumeCard({
  booking,
  onOpen,
}: {
  booking: ResumeBooking;
  onOpen: () => void;
}) {
  const { t } = useLanguage();
  const name = booking.modelName ?? "";
  const brand = booking.modelBrand ?? "";
  // Some model names already carry the brand ("TVS Radeon") — don't repeat it.
  const bike = name.startsWith(brand) ? name : [brand, name].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border border-primary/50 bg-primary/10 px-4 py-3 text-left backdrop-blur transition-colors hover:bg-primary/15"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20">
        <Bike className="h-5 w-5 text-primary" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {t("reservedBikeTitle")}
        </span>
        <span className="mt-0.5 block truncate text-sm font-semibold">
          {bike || t("reservedBikeTitle")}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
          {t("bookingRef", { code: booking.booking_code })}
          {booking.hubName ? ` · ${booking.hubName}` : ""}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
        {isRiding(booking.status) ? t("goToMyBike") : t("resumeJourney")}
        <ChevronRight className="h-4 w-4" />
      </span>
    </button>
  );
}