"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  translations,
  type Locale,
  type Theme,
} from "@/lib/i18n/translations";

const THEME_KEY = "retvy-theme";
const LOCALE_KEY = "retvy-locale";

type AppPreferencesContextValue = {
  theme: Theme;
  locale: Locale;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
  t: (typeof translations)[Locale];
  mounted: boolean;
};

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(
  null,
);

function readTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "light" ? "light" : "dark";
}

function readLocale(): Locale {
  if (typeof window === "undefined") return "fr";
  const stored = localStorage.getItem(LOCALE_KEY);
  return stored === "en" ? "en" : "fr";
}

export function AppPreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [locale, setLocaleState] = useState<Locale>("fr");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(readTheme());
    setLocaleState(readLocale());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    root.lang = locale === "en" ? "en" : "fr";
    localStorage.setItem(THEME_KEY, theme);
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = locale === "en" ? "en" : "fr";
    localStorage.setItem(LOCALE_KEY, locale);
  }, [locale, mounted]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      locale,
      setTheme,
      setLocale,
      t: translations[locale],
      mounted,
    }),
    [theme, locale, setTheme, setLocale, mounted],
  );

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  const ctx = useContext(AppPreferencesContext);
  if (!ctx) {
    throw new Error(
      "useAppPreferences must be used within AppPreferencesProvider",
    );
  }
  return ctx;
}
