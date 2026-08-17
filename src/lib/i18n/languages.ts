export const LANG_CODES = ["en", "hi", "kn", "te", "ta", "ml", "or", "ne"] as const;

export type Lang = (typeof LANG_CODES)[number];

export type LanguageMeta = {
  code: Lang;
  /** English name, used in internal/admin surfaces. */
  label: string;
  /** Name in its own script — this is what riders read. */
  native: string;
  /** Short invitation line, in that language. */
  note: string;
  /** Locale tag for number and date formatting. */
  locale: string;
};

export const LANGUAGES: LanguageMeta[] = [
  { code: "en", label: "English", native: "English", note: "Continue in English", locale: "en-IN" },
  { code: "hi", label: "Hindi", native: "हिन्दी", note: "हिन्दी में जारी रखें", locale: "hi-IN" },
  {
    code: "kn",
    label: "Kannada",
    native: "ಕನ್ನಡ",
    note: "ಕನ್ನಡದಲ್ಲಿ ಮುಂದುವರಿಸಿ",
    locale: "kn-IN",
  },
  {
    code: "te",
    label: "Telugu",
    native: "తెలుగు",
    note: "తెలుగులో కొనసాగించండి",
    locale: "te-IN",
  },
  { code: "ta", label: "Tamil", native: "தமிழ்", note: "தமிழில் தொடரவும்", locale: "ta-IN" },
  {
    code: "ml",
    label: "Malayalam",
    native: "മലയാളം",
    note: "മലയാളത്തിൽ തുടരാം",
    locale: "ml-IN",
  },
  { code: "or", label: "Odia", native: "ଓଡ଼ିଆ", note: "ଓଡ଼ିଆରେ ଆଗକୁ ବଢ଼ନ୍ତୁ", locale: "or-IN" },
  { code: "ne", label: "Nepali", native: "नेपाली", note: "नेपालीमा अगाडि बढ्नुहोस्", locale: "ne-NP" },
];

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANG_CODES as readonly string[]).includes(value);
}

export function languageMeta(code: Lang): LanguageMeta {
  return LANGUAGES.find((entry) => entry.code === code) ?? LANGUAGES[0];
}
