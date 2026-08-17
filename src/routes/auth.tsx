import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/drivex/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { requestOtp, verifyOtp } from "@/lib/auth.functions";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Verify your mobile number — DriveX" },
      {
        name: "description",
        content:
          "Confirm your mobile number to reserve your DriveX two-wheeler and track your rental.",
      },
      { property: "og:title", content: "Verify your mobile number — DriveX" },
      {
        property: "og:description",
        content: "Confirm your mobile number to reserve your DriveX two-wheeler.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/journey" });
    });
  }, [navigate]);

  async function sendCode() {
    setSending(true);
    try {
      const result = await requestOtp({ data: { phone } });
      setDemoCode(result.demoCode);
      toast.success(t("otpSent"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("otpSendFailed"));
    } finally {
      setSending(false);
    }
  }

  async function confirmCode() {
    setVerifying(true);
    try {
      const result = await verifyOtp({ data: { phone, code } });
      const { error } = await supabase.auth.signInWithPassword({
        email: result.email,
        password: result.password,
      });
      if (error) throw new Error(error.message);
      navigate({ to: "/journey" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("otpVerifyFailed"));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <AppShell subtitle={t("subtitleMobileVerification")}>
      <div className="mx-auto max-w-md">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{t("verifyTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("verifyIntro")}</p>

        <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card/70 p-4 backdrop-blur">
          <div className="space-y-1.5">
            <Label htmlFor="phone">{t("mobileNumber")}</Label>
            <div className="flex gap-2">
              <span className="flex items-center rounded-md border border-border px-3 text-sm text-muted-foreground">
                +91
              </span>
              <Input
                id="phone"
                inputMode="numeric"
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder={t("tenDigits")}
              />
            </div>
          </div>

          {demoCode === null ? (
            <Button className="w-full" onClick={sendCode} disabled={phone.length !== 10 || sending}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("sendCode")}
            </Button>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="code">{t("verificationCode")}</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder={t("sixDigits")}
                />
                <p className="text-xs text-muted-foreground">
                  {t("demoCode")} <span className="font-medium">{demoCode}</span>
                </p>
              </div>
              <Button
                className="w-full"
                onClick={confirmCode}
                disabled={code.length !== 6 || verifying}
              >
                {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("verifyContinue")}
              </Button>
              <Button variant="ghost" className="w-full" onClick={sendCode} disabled={sending}>
                {t("resend")}
              </Button>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}