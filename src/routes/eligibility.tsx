import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BadgeCheck, ClipboardCheck, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/drivex/AppShell";
import { CaptureField } from "@/components/drivex/CaptureField";
import { PhoneLoginDialog } from "@/components/drivex/PhoneLoginDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useRiderSession } from "@/hooks/useRiderSession";
import { getSavedDocuments } from "@/lib/booking.functions";
import { getLatestEligibilityCheck, runEligibilityCheck } from "@/lib/eligibility.functions";
import { longDate } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/eligibility")({
  head: () => ({
    meta: [
      { title: "Check your DriveX rental eligibility" },
      {
        name: "description",
        content:
          "Upload your Driving Licence and a selfie to check whether you can rent a DriveX bike — free, any time, before you pay anything.",
      },
      { property: "og:title", content: "Check your DriveX rental eligibility" },
      {
        property: "og:description",
        content: "A free self-check before you reserve a bike. No payment, no booking needed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EligibilityPage,
});

function EligibilityPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const session = useRiderSession();
  const signedIn = Boolean(session.userId);
  const [loginOpen, setLoginOpen] = useState(false);

  const saved = useQuery({
    queryKey: ["saved-docs"],
    queryFn: () => getSavedDocuments(),
    enabled: signedIn,
  });
  const latest = useQuery({
    queryKey: ["eligibility-latest"],
    queryFn: () => getLatestEligibilityCheck(),
    enabled: signedIn,
  });

  const [dlFrontPath, setDlFrontPath] = useState<string | null>(null);
  const [dlBackPath, setDlBackPath] = useState<string | null>(null);
  const [selfiePath, setSelfiePath] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!saved.data || prefilled) return;
    setDlFrontPath((old) => old ?? saved.data["dl-front"] ?? null);
    setDlBackPath((old) => old ?? saved.data["dl-back"] ?? null);
    setSelfiePath((old) => old ?? saved.data["selfie"] ?? null);
    setPrefilled(true);
  }, [saved.data, prefilled]);

  const check = useMutation({
    mutationFn: () =>
      runEligibilityCheck({ data: { dlFrontPath, dlBackPath, selfiePath, consent } }),
    onSuccess: (data) => {
      setResult(data.result);
      void latest.refetch();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : t("couldNotCheck")),
  });

  return (
    <AppShell subtitle={t("eligibilityCheckTitle")}>
      <header className="rounded-2xl border border-border bg-card p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </span>
        <h1 className="mt-3 text-xl font-semibold">{t("eligibilityCheckTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("eligibilityCheckIntro")}</p>
        {latest.data && (
          <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs text-secondary-foreground">
            {t("eligibilityLastChecked", { date: longDate(latest.data.created_at) })} ·{" "}
            {latest.data.result === "LIKELY_ELIGIBLE"
              ? t("eligibleTitle")
              : t("eligibleCloserLook")}
          </p>
        )}
      </header>

      {!signedIn ? (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">{t("signInToCheck")}</p>
          <Button className="mt-3" onClick={() => setLoginOpen(true)}>
            {t("checkEligibilityAnytime")}
          </Button>
        </div>
      ) : result ? (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <BadgeCheck className="h-6 w-6 text-primary" />
          <h2 className="mt-2 text-lg font-semibold">
            {result === "LIKELY_ELIGIBLE" ? t("eligibleTitle") : t("eligibleCloserLook")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("eligibilityIndicative")}</p>
          <p className="mt-2 text-xs text-muted-foreground">{t("eligibilityDocsSaved")}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => navigate({ to: "/" })}>{t("browseBikes")}</Button>
            <Button variant="outline" onClick={() => setResult(null)}>
              {t("eligibilityRunAgain")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ClipboardCheck className="h-4 w-4 text-primary" /> {t("eligibilityTitle")}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{t("eligibilityHint")}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <CaptureField
              slot="dl-front"
              label={t("dlFrontLabel")}
              hint={t("dlFrontHint")}
              value={dlFrontPath}
              onChange={setDlFrontPath}
            />
            <CaptureField
              slot="dl-back"
              label={t("dlBackLabel")}
              hint={t("dlBackHint")}
              value={dlBackPath}
              onChange={setDlBackPath}
            />
            <CaptureField
              slot="selfie"
              label={t("selfieLabel")}
              hint={t("selfieHint")}
              facing="user"
              value={selfiePath}
              onChange={setSelfiePath}
            />
          </div>
          <label className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={consent}
              onCheckedChange={(value) => setConsent(value === true)}
              className="mt-0.5"
            />
            <span>
              {t("eligibilityConsent")} {t("documentConsent")}
            </span>
          </label>
          <Button
            className="mt-4 w-full sm:w-auto"
            onClick={() => check.mutate()}
            disabled={check.isPending || !consent || !dlFrontPath || !selfiePath}
          >
            {check.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("checkEligibility")}
          </Button>
          {!consent && (
            <p className="mt-2 text-xs text-muted-foreground">{t("consentRequired")}</p>
          )}
        </div>
      )}

      <PhoneLoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onSignedIn={() => {
          void saved.refetch();
          void latest.refetch();
        }}
      />
    </AppShell>
  );
}
