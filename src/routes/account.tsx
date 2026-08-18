import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  ClipboardList,
  History,
  MessageSquare,
  Phone,
  Star,
  Wallet,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/drivex/AppShell";
import { PageLoader } from "@/components/drivex/PageLoader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRiderSession } from "@/hooks/useRiderSession";
import { getAccountOverview } from "@/lib/account.functions";
import {
  getRiderProfile,
  inviteRiderPhone,
  revokeRiderPhoneInvite,
  withdrawWallet,
} from "@/lib/profile.functions";
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
  const queryClient = useQueryClient();
  const [newPhone, setNewPhone] = useState("");

  useEffect(() => {
    if (!session.loading && !session.userId) navigate({ to: "/auth" });
  }, [session, navigate]);

  const overview = useQuery({
    queryKey: ["account"],
    queryFn: () => getAccountOverview(),
    enabled: Boolean(session.userId),
  });

  const profile = useQuery({
    queryKey: ["rider-profile"],
    queryFn: () => getRiderProfile(),
    enabled: Boolean(session.userId),
  });

  const refreshProfile = () => queryClient.invalidateQueries({ queryKey: ["rider-profile"] });

  const addPhone = useMutation({
    mutationFn: () => inviteRiderPhone({ data: { phone: newPhone } }),
    onSuccess: () => {
      setNewPhone("");
      toast.success(t("inviteAdded"));
      refreshProfile();
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : ""),
  });

  const dropInvite = useMutation({
    mutationFn: (inviteId: string) => revokeRiderPhoneInvite({ data: { inviteId } }),
    onSuccess: refreshProfile,
  });

  const payout = useMutation({
    mutationFn: () => withdrawWallet(),
    onSuccess: () => {
      toast.success(t("walletWithdrawn"));
      refreshProfile();
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : ""),
  });

  if (session.loading || overview.isLoading) {
    return <PageLoader message={t("loadingBooking")} />;
  }

  const data = overview.data;
  const rider = profile.data ?? null;
  const walletBalance = rider?.profile?.wallet_balance ?? 0;
  const depositInWallet = rider?.profile?.deposit_in_wallet ?? 0;

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

      <section className="mt-5 rounded-2xl border border-border bg-card/70 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BadgeCheck className="h-4 w-4" />
          </span>
          {t("riderProfileTitle")}
        </h2>
        <p className="mt-2 text-xs text-muted-foreground">{t("riderProfileIntro")}</p>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-3">
          <div>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" />
              {t("walletTitle")}
            </p>
            <p className="mt-1 text-xl font-semibold">{rupees(walletBalance)}</p>
            {depositInWallet > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("walletDepositNote", { amount: rupees(depositInWallet) })}
              </p>
            ) : walletBalance === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">{t("walletEmpty")}</p>
            ) : null}
          </div>
          {walletBalance > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => payout.mutate()}
              disabled={payout.isPending}
            >
              {t("walletWithdraw")}
            </Button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-border/70 bg-background/60 p-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t("creditScoreLabel")}
            </p>
            <p className="text-sm font-semibold">{rider?.profile?.credit_score ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/60 p-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t("ridesCompleted")}
            </p>
            <p className="text-sm font-semibold">{rider?.rides ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/60 p-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t("totalPaidLabel")}
            </p>
            <p className="text-sm font-semibold">{rupees(rider?.paidTotal ?? 0)}</p>
          </div>
        </div>

        <Badge variant="secondary" className="mt-3 text-[10px]">
          {rider?.kycReusable ? t("verifiedProfile") : t("verificationPending")}
        </Badge>

        <div className="mt-4">
          <p className="flex items-center gap-2 text-xs font-medium">
            <Phone className="h-3.5 w-3.5" />
            {t("linkedNumbers")}
          </p>
          <div className="mt-2 space-y-2">
            {(rider?.phones ?? []).map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-sm"
              >
                <span>+91 {row.phone}</span>
                {row.isCurrent && (
                  <Badge variant="secondary" className="text-[10px]">
                    {t("thisNumber")}
                  </Badge>
                )}
              </div>
            ))}
            {(rider?.invites ?? []).map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-xl border border-dashed border-border/70 px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">+91 {row.phone}</span>
                <span className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{t("pendingInvite")}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dropInvite.mutate(row.id)}
                    disabled={dropInvite.isPending}
                  >
                    {t("removeInvite")}
                  </Button>
                </span>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs font-medium">{t("addDriverNumber")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("addDriverHint")}</p>
          <div className="mt-2 flex gap-2">
            <Input
              inputMode="numeric"
              value={newPhone}
              placeholder="10 digits"
              onChange={(event) => setNewPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
            />
            <Button
              onClick={() => addPhone.mutate()}
              disabled={newPhone.length !== 10 || addPhone.isPending}
            >
              {t("addDriverAction")}
            </Button>
          </div>
        </div>
      </section>

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
