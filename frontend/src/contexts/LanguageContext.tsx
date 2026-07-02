import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { rw } from "../translations/rw";

export type Lang = "en" | "rw";

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(
    () => (localStorage.getItem("hw_lang") as Lang) || "en"
  );

  const setLang = (l: Lang) => {
    localStorage.setItem("hw_lang", l);
    setLangState(l);
  };

  const t = (key: string): string => {
    if (lang === "rw") return rw[key] ?? key;
    return key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
