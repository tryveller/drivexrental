import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Bike, LifeBuoy } from "lucide-react";
import { DRIVEX_SUPPORT_PHONE } from "@/lib/format";
import { AutoBackdrop } from "@/components/drivex/AutoBackdrop";
import { LANGUAGES, useLanguage, type Lang } from "@/lib/i18n";

function LanguagePicker() {
  const { lang, setLang, t } = useLanguage();
  return (
    <label className="flex items-center gap-1 rounded-full border border-border bg-card/60 px-2 py-1.5 text-xs backdrop-blur">
      <span className="sr-only">{t("chooseLanguage")}</span>
      <select
        value={lang ?? "en"}
        onChange={(event) => setLang(event.target.value as Lang)}
        className="bg-transparent text-xs font-medium outline-none"
      >
        {LANGUAGES.map((option) => (
          <option key={option.code} value={option.code} className="bg-card text-card-foreground">
            {option.native}
          </option>
        ))}
      </select>
    </label>
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
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_24px_-6px_var(--primary)]">
              <Bike className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-semibold tracking-tight">DriveX</span>
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
          </div>
        </div>
      </header>
      <main className="relative mx-auto max-w-3xl px-4 pb-24 pt-5">{children}</main>
    </div>
  );
}
