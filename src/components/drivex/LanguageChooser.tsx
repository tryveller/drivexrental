import { Check, ChevronLeft } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { LANGUAGES, useLanguage, type Lang } from "@/lib/i18n";

/**
 * Grid of languages plus the confirmation step. We always confirm in the
 * language the rider just tapped, so a mis-tap never silently flips the app.
 */
export function LanguageChooser({
  onDone,
  compact = false,
}: {
  onDone?: (lang: Lang) => void;
  compact?: boolean;
}) {
  const { lang, setLang, tIn } = useLanguage();
  const [pending, setPending] = useState<Lang | null>(null);

  if (pending) {
    const meta = LANGUAGES.find((entry) => entry.code === pending)!;
    return (
      <div lang={pending}>
        <p className="text-xs font-medium uppercase tracking-widest text-primary">{meta.native}</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">
          {tIn(pending, "confirmLangTitle")}
        </h2>
        <div className="mt-5 space-y-2">
          <Button
            className="h-12 w-full text-base"
            onClick={() => {
              setLang(pending);
              onDone?.(pending);
            }}
          >
            <Check className="mr-2 h-4 w-4" />
            {tIn(pending, "confirmYes")}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setPending(null)}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            {tIn(pending, "goBack")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 gap-2.5"}>
      {LANGUAGES.map((option) => {
        const isActive = option.code === lang;
        return (
          <button
            key={option.code}
            type="button"
            lang={option.code}
            onClick={() => setPending(option.code)}
            className={`rounded-2xl border px-3 py-3.5 text-left backdrop-blur transition-all active:scale-[0.98] ${
              isActive
                ? "border-primary bg-primary/15"
                : "border-border bg-card/70 hover:border-primary/70 hover:bg-primary/10"
            }`}
          >
            <span className="flex items-center justify-between gap-1">
              <span className="text-lg font-semibold leading-tight">{option.native}</span>
              {isActive && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
              {option.note}
            </span>
          </button>
        );
      })}
    </div>
  );
}
