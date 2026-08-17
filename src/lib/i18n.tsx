import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "hi" | "kn";

export const LANGUAGES: { code: Lang; label: string; native: string; note: string }[] = [
  { code: "en", label: "English", native: "English", note: "Continue in English" },
  { code: "hi", label: "Hindi", native: "हिन्दी", note: "हिन्दी में जारी रखें" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", note: "ಕನ್ನಡದಲ್ಲಿ ಮುಂದುವರಿಸಿ" },
];

const STORAGE_KEY = "drivex.lang";

/**
 * Vernacular is used only for instructions and guidance.
 * Product terms, model names, plan names, amounts, codes and document
 * names stay in English by design.
 */
const DICT = {
  // shell
  help: { en: "Help", hi: "मदद", kn: "ಸಹಾಯ" },
  tagline: {
    en: "Two-wheeler rentals",
    hi: "टू-व्हीलर किराये पर",
    kn: "ಟು-ವೀಲರ್ ಬಾಡಿಗೆ",
  },
  // language gate
  chooseLanguage: {
    en: "Choose your language",
    hi: "अपनी भाषा चुनें",
    kn: "ನಿಮ್ಮ ಭಾಷೆ ಆಯ್ಕೆ ಮಾಡಿ",
  },
  chooseLanguageHint: {
    en: "Instructions will be shown in this language. You can change it any time from the header.",
    hi: "निर्देश इसी भाषा में दिखाए जाएंगे। इसे आप हेडर से कभी भी बदल सकते हैं।",
    kn: "ಸೂಚನೆಗಳು ಈ ಭಾಷೆಯಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ. ಹೆಡರ್‌ನಿಂದ ಯಾವಾಗ ಬೇಕಾದರೂ ಬದಲಿಸಬಹುದು.",
  },
  // discovery
  discoveryTitle: {
    en: "Rent a two-wheeler from a hub near you",
    hi: "अपने नज़दीकी हब से टू-व्हीलर किराये पर लें",
    kn: "ನಿಮ್ಮ ಹತ್ತಿರದ ಹಬ್‌ನಿಂದ ಟು-ವೀಲರ್ ಬಾಡಿಗೆಗೆ ಪಡೆಯಿರಿ",
  },
  discoveryIntro: {
    en: "Choose your bike and plan, pay ₹199 to reserve it, then finish verification at the hub and ride away the same day.",
    hi: "अपनी बाइक और प्लान चुनें, ₹199 देकर रिज़र्व करें, फिर हब पर वेरिफिकेशन पूरा करके उसी दिन बाइक ले जाएं।",
    kn: "ನಿಮ್ಮ ಬೈಕ್ ಮತ್ತು ಪ್ಲಾನ್ ಆಯ್ಕೆ ಮಾಡಿ, ₹199 ಪಾವತಿಸಿ ಕಾಯ್ದಿರಿಸಿ, ನಂತರ ಹಬ್‌ನಲ್ಲಿ ಪರಿಶೀಲನೆ ಮುಗಿಸಿ ಅದೇ ದಿನ ಬೈಕ್ ತೆಗೆದುಕೊಂಡು ಹೋಗಿ.",
  },
  whereRide: {
    en: "Where do you want to ride?",
    hi: "आप कहाँ राइड करना चाहते हैं?",
    kn: "ನೀವು ಎಲ್ಲಿ ರೈಡ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?",
  },
  useMyLocation: {
    en: "Use my location",
    hi: "मेरी लोकेशन इस्तेमाल करें",
    kn: "ನನ್ನ ಲೊಕೇಶನ್ ಬಳಸಿ",
  },
  pinPlaceholder: {
    en: "Or enter PIN code",
    hi: "या PIN कोड डालें",
    kn: "ಅಥವಾ PIN ಕೋಡ್ ನಮೂದಿಸಿ",
  },
  locationPrivacy: {
    en: "We use your area only to show hubs and bikes available near you.",
    hi: "आपका क्षेत्र केवल आपके पास उपलब्ध हब और बाइक दिखाने के लिए इस्तेमाल होता है।",
    kn: "ನಿಮ್ಮ ಪ್ರದೇಶವನ್ನು ಹತ್ತಿರದ ಹಬ್ ಮತ್ತು ಬೈಕ್‌ಗಳನ್ನು ತೋರಿಸಲು ಮಾತ್ರ ಬಳಸುತ್ತೇವೆ.",
  },
  bikesNearYou: {
    en: "Bikes available near you",
    hi: "आपके पास उपलब्ध बाइक",
    kn: "ನಿಮ್ಮ ಹತ್ತಿರ ಲಭ್ಯವಿರುವ ಬೈಕ್‌ಗಳು",
  },
  pickHub: {
    en: "Pick your pickup hub",
    hi: "पिकअप हब चुनें",
    kn: "ಪಿಕ್‌ಅಪ್ ಹಬ್ ಆಯ್ಕೆ ಮಾಡಿ",
  },
  noHubStock: {
    en: "No hub near you has this bike right now. Try another model.",
    hi: "अभी आपके नज़दीकी किसी हब में यह बाइक नहीं है। दूसरा मॉडल देखें।",
    kn: "ಸದ್ಯಕ್ಕೆ ನಿಮ್ಮ ಹತ್ತಿರದ ಯಾವ ಹಬ್‌ನಲ್ಲೂ ಈ ಬೈಕ್ ಇಲ್ಲ. ಬೇರೆ ಮಾಡೆಲ್ ನೋಡಿ.",
  },
  choosePlan: {
    en: "Choose a plan",
    hi: "प्लान चुनें",
    kn: "ಪ್ಲಾನ್ ಆಯ್ಕೆ ಮಾಡಿ",
  },
  continueReserve: {
    en: "Continue to reserve",
    hi: "रिज़र्व करने के लिए आगे बढ़ें",
    kn: "ಕಾಯ್ದಿರಿಸಲು ಮುಂದುವರಿಯಿರಿ",
  },
  soldOut: {
    en: "All bikes of this model are currently rented out near you.",
    hi: "इस मॉडल की सभी बाइक अभी किराये पर हैं।",
    kn: "ಈ ಮಾಡೆಲ್‌ನ ಎಲ್ಲಾ ಬೈಕ್‌ಗಳು ಸದ್ಯಕ್ಕೆ ಬಾಡಿಗೆಯಲ್ಲಿವೆ.",
  },
  findingBikes: {
    en: "Finding bikes near you…",
    hi: "आपके पास बाइक ढूंढ रहे हैं…",
    kn: "ನಿಮ್ಮ ಹತ್ತಿರ ಬೈಕ್ ಹುಡುಕುತ್ತಿದ್ದೇವೆ…",
  },
  // auth
  verifyTitle: {
    en: "Verify your mobile number",
    hi: "अपना मोबाइल नंबर वेरिफाई करें",
    kn: "ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಪರಿಶೀಲಿಸಿ",
  },
  verifyIntro: {
    en: "We use your number to confirm your reservation and keep you updated about your bike.",
    hi: "हम आपका नंबर रिज़र्वेशन कन्फर्म करने और बाइक से जुड़े अपडेट भेजने के लिए इस्तेमाल करते हैं।",
    kn: "ನಿಮ್ಮ ಕಾಯ್ದಿರಿಸುವಿಕೆ ದೃಢೀಕರಿಸಲು ಮತ್ತು ಬೈಕ್ ಕುರಿತ ಮಾಹಿತಿ ಕಳುಹಿಸಲು ನಿಮ್ಮ ಸಂಖ್ಯೆ ಬಳಸುತ್ತೇವೆ.",
  },
  mobileNumber: { en: "Mobile number", hi: "मोबाइल नंबर", kn: "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ" },
  tenDigits: {
    en: "10-digit number",
    hi: "10 अंकों का नंबर",
    kn: "10 ಅಂಕಿಗಳ ಸಂಖ್ಯೆ",
  },
  sendCode: { en: "Send code", hi: "कोड भेजें", kn: "ಕೋಡ್ ಕಳುಹಿಸಿ" },
  verificationCode: {
    en: "Verification code",
    hi: "वेरिफिकेशन कोड",
    kn: "ಪರಿಶೀಲನಾ ಕೋಡ್",
  },
  sixDigits: { en: "6-digit code", hi: "6 अंकों का कोड", kn: "6 ಅಂಕಿಗಳ ಕೋಡ್" },
  verifyContinue: {
    en: "Verify and continue",
    hi: "वेरिफाई करें और आगे बढ़ें",
    kn: "ಪರಿಶೀಲಿಸಿ ಮುಂದುವರಿಯಿರಿ",
  },
  resend: { en: "Send a new code", hi: "नया कोड भेजें", kn: "ಹೊಸ ಕೋಡ್ ಕಳುಹಿಸಿ" },
  demoCode: {
    en: "Demo code for this preview:",
    hi: "इस प्रीव्यू के लिए डेमो कोड:",
    kn: "ಈ ಪ್ರಿವ್ಯೂಗಾಗಿ ಡೆಮೊ ಕೋಡ್:",
  },
  // journey instructions
  loadingBooking: {
    en: "Loading your booking…",
    hi: "आपकी बुकिंग लोड हो रही है…",
    kn: "ನಿಮ್ಮ ಬುಕಿಂಗ್ ಲೋಡ್ ಆಗುತ್ತಿದೆ…",
  },
  carryDocs: {
    en: "Carry your original Driving Licence and an address proof for verification.",
    hi: "वेरिफिकेशन के लिए अपना ओरिजिनल Driving Licence और एक address proof साथ लाएं।",
    kn: "ಪರಿಶೀಲನೆಗಾಗಿ ನಿಮ್ಮ ಮೂಲ Driving Licence ಮತ್ತು ಒಂದು address proof ತರಬೇಕು.",
  },
  reachHubHint: {
    en: "Tap below once you reach the hub. Our staff will start your document verification.",
    hi: "हब पहुँचने पर नीचे टैप करें। हमारा स्टाफ आपके दस्तावेज़ों की जाँच शुरू करेगा।",
    kn: "ಹಬ್‌ಗೆ ತಲುಪಿದ ಮೇಲೆ ಕೆಳಗೆ ಟ್ಯಾಪ್ ಮಾಡಿ. ನಮ್ಮ ಸಿಬ್ಬಂದಿ ದಾಖಲೆ ಪರಿಶೀಲನೆ ಆರಂಭಿಸುತ್ತಾರೆ.",
  },
  kycHint: {
    en: "Our staff will capture these with you. Nothing is charged at this step.",
    hi: "हमारा स्टाफ ये विवरण आपके साथ दर्ज करेगा। इस चरण में कोई शुल्क नहीं है।",
    kn: "ನಮ್ಮ ಸಿಬ್ಬಂದಿ ಇವುಗಳನ್ನು ನಿಮ್ಮೊಂದಿಗೆ ದಾಖಲಿಸುತ್ತಾರೆ. ಈ ಹಂತದಲ್ಲಿ ಯಾವುದೇ ಶುಲ್ಕ ಇಲ್ಲ.",
  },
  handoverHint: {
    en: "Our staff will walk around the bike with you and record its condition, fuel level and accessories. Check the photos and note anything you disagree with before you confirm.",
    hi: "हमारा स्टाफ आपके साथ बाइक की जाँच करेगा और उसकी हालत, फ्यूल और एक्सेसरीज़ दर्ज करेगा। कन्फर्म करने से पहले फोटो देखें और असहमति हो तो बताएं।",
    kn: "ನಮ್ಮ ಸಿಬ್ಬಂದಿ ನಿಮ್ಮೊಂದಿಗೆ ಬೈಕ್ ಪರಿಶೀಲಿಸಿ ಸ್ಥಿತಿ, ಇಂಧನ ಮತ್ತು ಪರಿಕರಗಳನ್ನು ದಾಖಲಿಸುತ್ತಾರೆ. ದೃಢೀಕರಿಸುವ ಮೊದಲು ಫೋಟೋ ನೋಡಿ, ಆಕ್ಷೇಪವಿದ್ದರೆ ತಿಳಿಸಿ.",
  },
  eligibilityHint: {
    en: "Share your licence details to see whether you're likely eligible before you travel. You can skip this and complete everything at the hub instead.",
    hi: "यात्रा से पहले पात्रता जानने के लिए अपने licence की जानकारी दें। आप इसे छोड़कर सब कुछ हब पर भी पूरा कर सकते हैं।",
    kn: "ಪ್ರಯಾಣಕ್ಕೂ ಮೊದಲು ಅರ್ಹತೆ ತಿಳಿಯಲು ನಿಮ್ಮ licence ವಿವರ ನೀಡಿ. ಇದನ್ನು ಬಿಟ್ಟು ಎಲ್ಲವನ್ನೂ ಹಬ್‌ನಲ್ಲೇ ಮುಗಿಸಬಹುದು.",
  },
  eligibilityIndicative: {
    en: "This is an indication only. Your rental is confirmed after document verification at the hub.",
    hi: "यह केवल संकेत है। आपका रेंटल हब पर दस्तावेज़ जाँच के बाद कन्फर्म होता है।",
    kn: "ಇದು ಸೂಚನೆ ಮಾತ್ರ. ಹಬ್‌ನಲ್ಲಿ ದಾಖಲೆ ಪರಿಶೀಲನೆ ನಂತರವೇ ಬಾಡಿಗೆ ದೃಢವಾಗುತ್ತದೆ.",
  },
  // my bike
  loadingBike: {
    en: "Loading your bike…",
    hi: "आपकी बाइक लोड हो रही है…",
    kn: "ನಿಮ್ಮ ಬೈಕ್ ಲೋಡ್ ಆಗುತ್ತಿದೆ…",
  },
  noRental: {
    en: "Once you collect a bike from the hub, everything about it shows up here.",
    hi: "हब से बाइक लेने के बाद उससे जुड़ी सारी जानकारी यहाँ दिखेगी।",
    kn: "ಹಬ್‌ನಿಂದ ಬೈಕ್ ಪಡೆದ ನಂತರ ಅದರ ಎಲ್ಲಾ ಮಾಹಿತಿ ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ.",
  },
  returnHint: {
    en: "We'll inspect the bike with you and compare it against the photos taken at handover.",
    hi: "हम आपके साथ बाइक की जाँच करेंगे और हैंडओवर के समय ली गई फोटो से मिलान करेंगे।",
    kn: "ನಾವು ನಿಮ್ಮೊಂದಿಗೆ ಬೈಕ್ ಪರಿಶೀಲಿಸಿ ಹ್ಯಾಂಡ್‌ಓವರ್ ಸಮಯದ ಫೋಟೋಗಳೊಂದಿಗೆ ಹೋಲಿಸುತ್ತೇವೆ.",
  },
  damageNote: {
    en: "Damage charges, if any, are added after the return inspection.",
    hi: "नुकसान का शुल्क, अगर हो, रिटर्न जाँच के बाद जोड़ा जाता है।",
    kn: "ಹಾನಿ ಶುಲ್ಕ, ಇದ್ದರೆ, ರಿಟರ್ನ್ ಪರಿಶೀಲನೆ ನಂತರ ಸೇರಿಸಲಾಗುತ್ತದೆ.",
  },
} as const;

export type TKey = keyof typeof DICT;

type Ctx = { lang: Lang | null; setLang: (lang: Lang) => void; t: (key: TKey) => string };

const LanguageContext = createContext<Ctx>({
  lang: "en",
  setLang: () => {},
  t: (key) => DICT[key].en,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored === "en" || stored === "hi" || stored === "kn") setLangState(stored);
    setReady(true);
  }, []);

  const setLang = useCallback((next: Lang) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setLangState(next);
  }, []);

  const active: Lang = lang ?? "en";
  const t = useCallback((key: TKey) => DICT[key][active] ?? DICT[key].en, [active]);

  return (
    <LanguageContext.Provider value={{ lang: ready ? lang : "en", setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
