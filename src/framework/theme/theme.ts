export const THEME_COOKIE = "NEXT_THEME";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

export type ThemePreference = "LIGHT" | "DARK" | "SYSTEM";

/** Normalize an untrusted cookie value into a theme preference. */
export function normalizeTheme(value: string | undefined): ThemePreference {
  return value === "LIGHT" || value === "DARK" || value === "SYSTEM" ? value : "SYSTEM";
}

/** Whether a preference resolves to the dark palette right now. */
export function resolveIsDark(theme: ThemePreference): boolean {
  if (theme === "DARK") return true;
  if (theme === "LIGHT") return false;
  return typeof window !== "undefined" && window.matchMedia(DARK_QUERY).matches;
}
