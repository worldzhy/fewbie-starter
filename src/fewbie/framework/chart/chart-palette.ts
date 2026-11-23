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

export const CHART_GRID = "rgba(0, 0, 0, 0.06)";

/** Grid/axis line color of the active theme, falling back off-DOM. */
export function chartGridColor(): string {
  if (typeof document === "undefined") return CHART_GRID;
  return getComputedStyle(document.documentElement).getPropertyValue("--border").trim() || CHART_GRID;
}

export function paletteColor(index: number, palette: readonly string[] = CHART_PALETTE): string {
  return palette[index % palette.length];
}

export function withAlpha(color: string, alpha: number): string {
  const hex = color.trim();
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (match === null) {
    // A host may define `--chart-*` as oklch()/rgb()/color-mix(); splitting those
    // produced `rgba(NaN, NaN, NaN, α)`. The token already carries its own alpha,
    // so pass it through untouched (R82-22).
    return hex;
  }
  const digits =
    match[1].length === 3
      ? match[1]
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : match[1];
  const r = parseInt(digits.slice(0, 2), 16);
  const g = parseInt(digits.slice(2, 4), 16);
  const b = parseInt(digits.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
