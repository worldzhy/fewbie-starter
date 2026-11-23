"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DARK_QUERY, resolveIsDark, THEME_COOKIE, type ThemePreference } from "./theme";

type ThemeContextValue = {
  theme: ThemePreference;
  /**
   * Apply a theme locally and cache it in the NEXT_THEME cookie. Persisting the
   * preference server-side stays with the host; this helper only mirrors a
   * value that was already stored.
   */
  applyTheme: (theme: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: ThemePreference;
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<ThemePreference>(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolveIsDark(theme));
    if (theme !== "SYSTEM") return;

    // A "follow system" preference must keep tracking OS changes, not freeze
    // the value read at mount time.
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => document.documentElement.classList.toggle("dark", media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const applyTheme = useCallback((next: ThemePreference) => {
    document.cookie = `${THEME_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
    setTheme(next);
  }, []);

  return <ThemeContext.Provider value={{ theme, applyTheme }}>{children}</ThemeContext.Provider>;
}

export function useThemePreference(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useThemePreference must be used inside ThemeProvider");
  return context;
}
