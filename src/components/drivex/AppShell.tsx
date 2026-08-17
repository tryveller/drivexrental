import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Languages, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { DRIVEX_SUPPORT_PHONE } from "@/lib/format";
import { AutoBackdrop } from "@/components/drivex/AutoBackdrop";
import { AccountMenu } from "@/components/drivex/AccountMenu";
import { DriveXLogo } from "@/components/drivex/DriveXLogo";
import { LanguageChooser } from "@/components/drivex/LanguageChooser";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { languageMeta, useLanguage } from "@/lib/i18n";

function LanguagePicker() {
  const { active, t, tIn } = useLanguage();
  const [open, setOpen] = useState(false);
  const meta = languageMeta(active);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("changeLanguage")}
        className="flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium backdrop-blur transition-colors hover:bg-secondary"
      >
        <Languages className="h-3.5 w-3.5 text-primary" />
        {meta.native}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="text-base">{t("chooseLanguage")}</DialogTitle>
          <LanguageChooser
            compact
            onDone={(next) => {
              setOpen(false);
              toast.success(tIn(next, "languageSet"));
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AppShell({
  children,
  subtitle,
}: {
  children: ReactNode;
  subtitle?: string;
}) {
  const { t } = useLanguage();

  return (
    <div className="relative min-h-screen">
      <AutoBackdrop />
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <DriveXLogo size={36} priority className="shrink-0" />
            <span className="leading-tight">
              <span className="block text-base font-semibold tracking-tight">
                DriveX <span className="text-primary">Rental</span>
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {subtitle ?? t("tagline")}
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguagePicker />
            <a
              href={`tel:${DRIVEX_SUPPORT_PHONE}`}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur transition-colors hover:bg-secondary"
            >
              <LifeBuoy className="h-3.5 w-3.5" />
              {t("help")}
            </a>
            <AccountMenu />
          </div>
        </div>
      </header>
      <main className="relative mx-auto max-w-3xl px-4 pb-24 pt-5">{children}</main>
    </div>
  );
}
