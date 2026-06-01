import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "ar" | "en" | "zh";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  dir: "rtl" | "ltr";
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

// Translations are loaded from separate files
import { ar } from "@/lib/translations/ar";
import { en } from "@/lib/translations/en";
import { zh } from "@/lib/translations/zh";

const translations: Record<Language, Record<string, string>> = { ar, en, zh };

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem("sindian-lang") as Language) || "ar";
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("sindian-lang", newLang);
  };

  const t = (key: string): string => {
    return translations[lang][key] ?? translations["ar"][key] ?? key;
  };

  // Chinese and English are LTR; Arabic is RTL
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
    // Apply Chinese font support
    if (lang === "zh") {
      document.documentElement.style.setProperty("--font-sans", "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif");
    } else {
      document.documentElement.style.removeProperty("--font-sans");
    }
  }, [lang, dir]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}
