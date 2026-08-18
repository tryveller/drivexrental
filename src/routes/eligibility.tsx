import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BadgeCheck, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/drivex/AppShell";
import {
  EMPTY_ID_DOCS,
  IdDocumentFields,
  IdMethodPicker,
  PendingConfirmation,
  type IdDocState,
} from "@/components/drivex/IdDocuments";
import { PhoneLoginDialog } from "@/components/drivex/PhoneLoginDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useRiderSession } from "@/hooks/useRiderSession";
import { getSavedDocuments } from "@/lib/booking.functions";
import { eligibilityDocsComplete, type EligibilityMethod } from "@/lib/eligibility";
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
          "Share your Aadhaar, Driving Licence and PAN — via DigiLocker or a quick photo — to check whether you can rent a DriveX bike, before you pay anything.",
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

  const [docs, setDocs] = useState<IdDocState>(EMPTY_ID_DOCS);
  const [method, setMethod] = useState<EligibilityMethod>("UPLOAD");
  const [prefilled, setPrefilled] = useState(false);
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  /** Set when the rider chooses to change a document already on file. */
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!saved.data || prefilled) return;
    const map = saved.data;
    setDocs((old) => ({
      aadhaarFrontPath: old.aadhaarFrontPath ?? map["aadhaar-front"] ?? null,
      aadhaarBackPath: old.aadhaarBackPath ?? map["aadhaar-back"] ?? null,
      dlFrontPath: old.dlFrontPath ?? map["dl-front"] ?? null,
      dlBackPath: old.dlBackPath ?? map["dl-back"] ?? null,
      panPath: old.panPath ?? map["pan"] ?? null,
    }));
    setPrefilled(true);
  }, [saved.data, prefilled]);

  const check = useMutation({
    mutationFn: () => runEligibilityCheck({ data: { ...docs, method, consent } }),
    onSuccess: (data) => {
      setResult(data.result);
      setEditing(false);
      void latest.refetch();
      void saved.refetch();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : t("couldNotCheck")),
  });

  const docsReady = eligibilityDocsComplete(docs);
  const shownResult = result ?? latest.data?.result ?? null;
  /** Docs are on file but no check has been run yet — confirmation is pending. */
  const pending = !shownResult && docsReady;
  const showForm = editing || (!shownResult && !pending);

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
            {t("eligibilityLastChecked", { date: longDate(latest.data.created_at) })}
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
      ) : showForm ? (
        <div className="mt-4 space-y-4 rounded-2xl border border-border bg-card p-5">
          <IdMethodPicker method={method} onMethod={setMethod} />
          <div>
            <p className="text-sm font-medium">{t("idDocsTitle")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("idDocsHint")}</p>
          </div>
          <IdDocumentFields
            docs={docs}
            onChange={(next) => setDocs((old) => ({ ...old, ...next }))}
          />
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={consent}
              onCheckedChange={(value) => setConsent(value === true)}
              className="mt-0.5"
            />
            <span>
              {t("eligibilityConsent")} {t("documentConsent")}
            </span>
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => check.mutate()} disabled={check.isPending || !consent || !docsReady}>
              {check.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("checkEligibility")}
            </Button>
            {editing && (
              <Button variant="ghost" onClick={() => setEditing(false)}>
                {t("closeLabel")}
              </Button>
            )}
          </div>
          {!consent && <p className="text-xs text-muted-foreground">{t("consentRequired")}</p>}
        </div>
      ) : (
        <div className="mt-4 space-y-4 rounded-2xl border border-border bg-card p-5">
          {pending ? (
            <PendingConfirmation />
          ) : (
            <div>
              <BadgeCheck className="h-6 w-6 text-primary" />
              <h2 className="mt-2 text-lg font-semibold">
                {shownResult === "LIKELY_ELIGIBLE" ? t("eligibleTitle") : t("eligibleCloserLook")}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("eligibilityIndicative")}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t("eligibilityDocsSaved")}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => navigate({ to: "/" })}>{t("browseBikes")}</Button>
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setEditing(true);
              }}
            >
              {t("editDocuments")}
            </Button>
          </div>
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
