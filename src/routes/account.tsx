import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ClipboardList, History, MessageSquare, Star, Wrench } from "lucide-react";

import { AppShell } from "@/components/drivex/AppShell";
import { PageLoader } from "@/components/drivex/PageLoader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRiderSession } from "@/hooks/useRiderSession";
import { getAccountOverview } from "@/lib/account.functions";
import { longDate, modelTitle, rupees } from "@/lib/format";
import { slotLabelKey } from "@/lib/pricing";
import { useLanguage, type TKey } from "@/lib/i18n";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your DriveX account" },
      {
        name: "description",
        content:
          "See your current and past DriveX bookings, service visits, complaints and feedback in one place.",
      },
      { property: "og:title", content: "Your DriveX account" },
      {
        property: "og:description",
        content: "Bookings, service visits and requests for your DriveX rental.",
      },
    ],
  }),
  component: AccountPage,
});

function Section({
  id,
  icon,
  title,
  empty,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  empty: string;
  children?: React.ReactNode;
}) {
  const hasContent = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section id={id} className="mt-5 scroll-mt-20 rounded-2xl border border-border bg-card/70 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        {title}
      </h2>
      <div className="mt-3 space-y-2">
        {hasContent ? children : <p className="text-sm text-muted-foreground">{empty}</p>}
      </div>
    </section>
  );
}

function AccountPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const session = useRiderSession();

  useEffect(() => {
    if (!session.loading && !session.userId) navigate({ to: "/auth" });
  }, [session, navigate]);

  const overview = useQuery({
    queryKey: ["account"],
    queryFn: () => getAccountOverview(),
    enabled: Boolean(session.userId),
  });

  if (session.loading || overview.isLoading) {
    return (
      <AppShell subtitle={t("accountTitle")}>
        <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("loadingBooking")}
        </div>
      </AppShell>
    );
  }

  const data = overview.data;

  const bookingRow = (row: NonNullable<typeof data>["current"][number], live: boolean) => (
    <div
      key={row.id}
      className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-3"
    >
      <div>
        <p className="text-sm font-medium">
          {row.modelBrand ? modelTitle(row.modelBrand, row.modelName ?? "") : row.booking_code}
        </p>
        <p className="text-xs text-muted-foreground">
          {row.booking_code}
          {row.hubName ? ` · ${row.hubName}` : ""}
        </p>
        {row.pickup_on && (
          <p className="mt-1 text-xs text-muted-foreground">
            {longDate(row.pickup_on)}
            {row.dropoff_on ? ` → ${longDate(row.dropoff_on)}` : ""}
          </p>
        )}
        {row.quoted_total ? (
          <p className="mt-1 text-xs font-medium">{rupees(row.quoted_total)}</p>
        ) : null}
      </div>
      <div className="flex flex-col items-end gap-2">
        <Badge variant="secondary" className="text-[10px]">
          {row.status.replaceAll("_", " ").toLowerCase()}
        </Badge>
        {live && (
          <Button size="sm" variant="ghost" onClick={() => navigate({ to: "/journey" })}>
            {t("openBooking")}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <AppShell subtitle={t("accountTitle")}>
      <h1 className="text-2xl font-semibold tracking-tight">{t("accountTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("accountIntro")}</p>

      <Section
        id="current"
        icon={<ClipboardList className="h-4 w-4" />}
        title={t("currentBookings")}
        empty={t("noCurrentBookings")}
      >
        {data?.current.map((row) => bookingRow(row, true))}
      </Section>

      <Section
        id="previous"
        icon={<History className="h-4 w-4" />}
        title={t("previousBookings")}
        empty={t("noPreviousBookings")}
      >
        {data?.past.map((row) => bookingRow(row, false))}
      </Section>

      <Section
        id="services"
        icon={<Wrench className="h-4 w-4" />}
        title={t("serviceHistory")}
        empty={t("noServiceHistory")}
      >
        {data?.services.map((row) => (
          <div
            key={row.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-3"
          >
            <div>
              <p className="text-sm font-medium">{longDate(row.scheduled_on)}</p>
              <p className="text-xs text-muted-foreground">
                {t(slotLabelKey(row.slot) as TKey)}
                {row.hubName ? ` · ${row.hubName}` : ""}
              </p>
              {row.work_done && (
                <p className="mt-1 text-xs text-muted-foreground">{row.work_done}</p>
              )}
            </div>
            <Badge variant="secondary" className="text-[10px]">
              {row.status.replaceAll("_", " ").toLowerCase()}
            </Badge>
          </div>
        ))}
      </Section>

      <Section
        id="complaints"
        icon={<MessageSquare className="h-4 w-4" />}
        title={t("complaints")}
        empty={t("noComplaints")}
      />

      <Section
        id="feedback"
        icon={<Star className="h-4 w-4" />}
        title={t("feedbackGiven")}
        empty={t("noFeedback")}
      />

      <Button className="mt-6 w-full" variant="secondary" onClick={() => navigate({ to: "/" })}>
        {t("browseBikes")}
      </Button>
    </AppShell>
  );
}
