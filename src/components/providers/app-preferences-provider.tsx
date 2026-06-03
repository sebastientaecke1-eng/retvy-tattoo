"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  translations,
  type Locale,
  type Theme,
} from "@/lib/i18n/translations";

const THEME_KEY = "retvy-theme";
const LOCALE_KEY = "retvy-locale";

type NestedKey<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKey<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

export type MessageKey = NestedKey<(typeof translations)["fr"]>;

type AppPreferencesContextValue = {
  theme: Theme;
  locale: Locale;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
  toggleTheme: () => void;
  t: (key: MessageKey) => string;
  mounted: boolean;
};

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(
  null,
);

function getNested(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return path;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : path;
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "light" ? "light" : "dark";
}

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "fr";
  const stored = localStorage.getItem(LOCALE_KEY);
  return stored === "en" ? "en" : "fr";
}

function applyThemeToDocument(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
  root.lang = root.lang.startsWith("en") ? root.lang : root.lang;
}

function applyLocaleToDocument(locale: Locale) {
  document.documentElement.lang = locale;
}

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [locale, setLocaleState] = useState<Locale>("fr");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedTheme = readStoredTheme();
    const storedLocale = readStoredLocale();
    setThemeState(storedTheme);
    setLocaleState(storedLocale);
    applyThemeToDocument(storedTheme);
    applyLocaleToDocument(storedLocale);
    setMounted(true);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem(THEME_KEY, next);
    applyThemeToDocument(next);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(LOCALE_KEY, next);
    applyLocaleToDocument(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const t = useCallback(
    (key: MessageKey) => getNested(translations[locale] as Record<string, unknown>, key),
    [locale],
  );

  const value = useMemo(
    () => ({
      theme,
      locale,
      setTheme,
      setLocale,
      toggleTheme,
      t,
      mounted,
    }),
    [theme, locale, setTheme, setLocale, toggleTheme, t, mounted],
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
    throw new Error("useAppPreferences must be used within AppPreferencesProvider");
  }
  return ctx;
}
