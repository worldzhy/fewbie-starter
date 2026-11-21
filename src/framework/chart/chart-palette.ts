// Chart colors come from the `--chart-*` design tokens. Canvas rendering
// cannot read CSS variables, so the tokens are resolved to concrete colors at
// render time. The literals below are the light-theme fallbacks used before the
// DOM exists (server render, tests) and are asserted against globals.css by
// chart-tokens.test.ts, so the two cannot drift.

export const CHART_PALETTE = ["#2563eb", "#00b42a", "#ffaa00", "#f53f3f", "#8490a3", "#8b5cf6"] as const;

/** Palette of the active theme, falling back to the light tokens off-DOM. */
export function chartPalette(): readonly string[] {
  if (typeof document === "undefined") return CHART_PALETTE;
  const styles = getComputedStyle(document.documentElement);
  return CHART_PALETTE.map((fallback, index) => styles.getPropertyValue(`--chart-${index + 1}`).trim() || fallback);
}

export function paletteColor(index: number, palette: readonly string[] = CHART_PALETTE): string {
  return palette[index % palette.length];
}

export function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
