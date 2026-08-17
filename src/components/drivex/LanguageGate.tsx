import type { ReactNode } from "react";

import { DriveXLogo } from "@/components/drivex/DriveXLogo";
import { IndiaFlagBackdrop } from "@/components/drivex/IndiaFlagBackdrop";
import { LanguageChooser } from "@/components/drivex/LanguageChooser";
import { LANGUAGES, useLanguage } from "@/lib/i18n";

export function LanguageGate({ children }: { children: ReactNode }) {
  const { lang, tIn } = useLanguage();

  if (lang) return <>{children}</>;

  return (
    <div className="relative min-h-screen">
      <IndiaFlagBackdrop />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <DriveXLogo size={60} priority />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          DriveX <span className="text-primary">Rental</span>
        </h1>

        {/* The ask is shown in every language at once, so no rider feels it is an English-first app. */}
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {LANGUAGES.map((option) => (
            <span key={option.code} lang={option.code}>
              {tIn(option.code, "pleaseChooseLanguage")}
              {option.code === "ne" ? "" : " · "}
            </span>
          ))}
        </p>

        <div className="mt-6">
          <LanguageChooser />
        </div>
      </div>
    </div>
  );
}
