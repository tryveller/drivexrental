import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { auditCopy } from "./audit";
import { COPY, type TKey } from "./keys";
import { isLang, languageMeta, LANGUAGES, LANG_CODES, type Lang } from "./languages";

export { COPY, LANGUAGES, LANG_CODES, isLang, languageMeta };
export type { TKey, Lang };

const STORAGE_KEY = "drivex.lang";

export type Vars = Record<string, string | number>;

function fill(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

type Ctx = {
  /** null until the rider has chosen — that is what opens the language screen. */
  lang: Lang | null;
  /** The language actually used for rendering (falls back to English). */
  active: Lang;
  locale: string;
  setLang: (lang: Lang) => void;
  t: (key: TKey, vars?: Vars) => string;
  /** Copy in a specific language — used by the language screen and confirm sheet. */
  tIn: (lang: Lang, key: TKey, vars?: Vars) => string;
};

function resolve(lang: Lang, key: TKey): string {
  const entry = COPY[key] as Record<string, string | undefined>;
  const value = entry?.[lang];
  if (value) return value;
  if (import.meta.env.DEV && entry) {
    console.warn(`[i18n] missing ${String(key)}.${lang} — falling back to English`);
  }
  return entry?.en ?? String(key);
}

const LanguageContext = createContext<Ctx>({
  lang: "en",
  active: "en",
  locale: "en-IN",
  setLang: () => {},
  t: (key, vars) => fill(resolve("en", key), vars),
  tIn: (lang, key, vars) => fill(resolve(lang, key), vars),
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLang(stored)) setLangState(stored);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const gaps = auditCopy();
    if (gaps.length) {
      console.warn(`[i18n] ${gaps.length} copy entries are missing a language:`, gaps.slice(0, 20));
    }
  }, []);

  const setLang = useCallback((next: Lang) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setLangState(next);
  }, []);

  const active: Lang = lang ?? "en";
  const locale = languageMeta(active).locale;

  useEffect(() => {
    document.documentElement.lang = active;
  }, [active]);

  const value = useMemo<Ctx>(
    () => ({
      lang: ready ? lang : "en",
      active,
      locale,
      setLang,
      t: (key, vars) => fill(resolve(active, key), vars),
      tIn: (target, key, vars) => fill(resolve(target, key), vars),
    }),
    [active, lang, locale, ready, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
