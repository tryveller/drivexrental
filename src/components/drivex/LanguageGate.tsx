import { Bike, Languages } from "lucide-react";
import type { ReactNode } from "react";

import { AutoBackdrop } from "@/components/drivex/AutoBackdrop";
import { LANGUAGES, useLanguage } from "@/lib/i18n";

export function LanguageGate({ children }: { children: ReactNode }) {
  const { lang, setLang } = useLanguage();

  if (lang) return <>{children}</>;

  return (
    <div className="relative min-h-screen">
      <AutoBackdrop />
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Bike className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">DriveX</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Languages className="h-4 w-4" /> Choose your language · भाषा चुनें · ಭಾಷೆ ಆಯ್ಕೆ
        </p>

        <div className="mt-7 space-y-3">
          {LANGUAGES.map((option) => (
            <button
              key={option.code}
              type="button"
              onClick={() => setLang(option.code)}
              className="flex w-full items-center justify-between rounded-2xl border border-border bg-card/70 px-4 py-4 text-left backdrop-blur transition-colors hover:border-primary hover:bg-primary/10"
            >
              <span>
                <span className="block text-lg font-semibold">{option.native}</span>
                <span className="block text-xs text-muted-foreground">{option.note}</span>
              </span>
              <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                {option.code}
              </span>
            </button>
          ))}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Instructions appear in your language. Plan names, model names, documents and amounts stay
          in English.
        </p>
      </div>
    </div>
  );
}
