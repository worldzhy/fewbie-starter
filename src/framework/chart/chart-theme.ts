// Chart surfaces that canvas rendering cannot read from CSS variables, so the
// values mirror the shared dark surface tokens and the DOM tooltip component:
// one tooltip language across UI and charts.

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#16213a",
  borderWidth: 0,
  borderRadius: 4,
  textStyle: { color: "#e6ecf7", fontSize: 12 },
};

// Map heat gradient ordered low -> high for visualMap inRange.
export const MAP_GRADIENT_COLORS = ["#f5f3fd", "#cbc4f5", "#9a8df1", "#5d47f1", "#3013ec"] as const;
