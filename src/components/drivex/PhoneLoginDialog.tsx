import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { requestOtp, verifyOtp } from "@/lib/auth.functions";
import { useLanguage } from "@/lib/i18n";

/**
 * Mobile-number sign-in as a modal, so a rider who reserved on another phone
 * (or at the hub) can pull their booking into this session without leaving
 * the homepage.
 */
export function PhoneLoginDialog({
  open,
  onOpenChange,
  onSignedIn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignedIn?: () => void;
}) {
  const { t } = useLanguage();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

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
      setCode("");
      setDemoCode(null);
      onOpenChange(false);
      onSignedIn?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("otpVerifyFailed"));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {t("loadMyBookingTitle")}
          </DialogTitle>
          <DialogDescription>{t("loadMyBookingBody")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="resume-phone">{t("mobileNumber")}</Label>
            <div className="flex gap-2">
              <span className="flex items-center rounded-md border border-border px-3 text-sm text-muted-foreground">
                +91
              </span>
              <Input
                id="resume-phone"
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
                <Label htmlFor="resume-code">{t("verificationCode")}</Label>
                <Input
                  id="resume-code"
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
      </DialogContent>
    </Dialog>
  );
}