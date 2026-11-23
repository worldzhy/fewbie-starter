// Tooltip surface for canvas rendering. The fallbacks equal the light-theme
// popover tokens and `chartTooltipStyle()` resolves the active theme's tokens
// at render time, so the chart tooltip speaks the same language as the DOM
// tooltip component.

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#ffffff",
  borderWidth: 0,
  borderRadius: 4,
  textStyle: { color: "#172033", fontSize: 12 },
};

/** Tooltip style of the active theme, falling back to the light tokens off-DOM. */
export function chartTooltipStyle() {
  if (typeof document === "undefined") return CHART_TOOLTIP_STYLE;
  const styles = getComputedStyle(document.documentElement);
  const background = styles.getPropertyValue("--popover").trim() || CHART_TOOLTIP_STYLE.backgroundColor;
  const color = styles.getPropertyValue("--popover-foreground").trim() || CHART_TOOLTIP_STYLE.textStyle.color;
  return {
    ...CHART_TOOLTIP_STYLE,
    backgroundColor: background,
    textStyle: { ...CHART_TOOLTIP_STYLE.textStyle, color },
  };
}

// Map heat gradient ordered low -> high for visualMap inRange.
export const MAP_GRADIENT_COLORS = ["#f5f3fd", "#cbc4f5", "#9a8df1", "#5d47f1", "#3013ec"] as const;
