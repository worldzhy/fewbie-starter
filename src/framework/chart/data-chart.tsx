"use client";

import type { EChartsCoreOption } from "./echarts";
import { EChart } from "./e-chart";
import { chartPalette, chartGridColor, paletteColor, withAlpha } from "./chart-palette";
import { chartTooltipStyle } from "./chart-theme";

export type DataChartType = "line" | "bar" | "pie" | "doughnut";

export interface DataChartDataset {
  label: string;
  data: (number | null)[];
  // Explicit color override; defaults to the cyclic palette by dataset index.
  color?: string;
  // Line only: render an area fill under the line.
  fill?: boolean;
  // Line/bar: stack group identifier; datasets sharing one stack up.
  stack?: string;
  // Line only: connect across null points.
  connectNulls?: boolean;
}

interface DataChartProps {
  chartType: DataChartType;
  labels: string[];
  datasets: DataChartDataset[];
  title?: string;
  xAxisName?: string;
  yAxisName?: string;
  className?: string;
  style?: React.CSSProperties;
  // Merged into the built option; component keys (xAxis/yAxis/tooltip/...)
  // merge one level deep, everything else replaces.
  optionOverrides?: EChartsCoreOption;
  // Merged into every series entry (e.g. { barMaxWidth: 50 }).
  seriesOverrides?: Record<string, unknown>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeOption(base: EChartsCoreOption, overrides?: EChartsCoreOption): EChartsCoreOption {
  if (!overrides) return base;
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    const baseValue = merged[key];
    merged[key] = isPlainObject(baseValue) && isPlainObject(value) ? { ...baseValue, ...value } : value;
  }
  return merged;
}

function buildOption({
  chartType,
  labels,
  datasets,
  title,
  xAxisName,
  yAxisName,
  seriesOverrides,
}: Omit<DataChartProps, "className" | "style" | "optionOverrides">): EChartsCoreOption {
  const isCartesian = chartType === "line" || chartType === "bar";
  const palette = chartPalette();
  const colorAt = (dataset: DataChartDataset, index: number) => dataset.color ?? paletteColor(index, palette);

  const series: Record<string, unknown>[] = isCartesian
    ? datasets.map((dataset, index) => {
        const color = colorAt(dataset, index);
        const base: Record<string, unknown> = {
          name: dataset.label,
          type: chartType,
          data: dataset.data,
          stack: dataset.stack,
          itemStyle: { color },
        };
        if (chartType === "line") {
          Object.assign(base, {
            showSymbol: false,
            smooth: 0.3,
            connectNulls: dataset.connectNulls ?? false,
            lineStyle: { width: 2, color },
            areaStyle: dataset.fill ? { color: withAlpha(color, 0.1) } : undefined,
          });
        }
        return { ...base, ...seriesOverrides };
      })
    : datasets.map((dataset, index) => {
        // Pie/doughnut: labels are slice names; multiple datasets render as
        // concentric rings. Slice colors come from the top-level palette.
        const ringStart = chartType === "doughnut" ? 40 : 0;
        const ringEnd = 72;
        const span = (ringEnd - ringStart) / datasets.length;
        const inner = ringStart + index * span;
        const outer = index === datasets.length - 1 ? ringEnd : inner + span - 3;
        return {
          name: dataset.label,
          type: "pie",
          radius: [`${inner}%`, `${outer}%`],
          data: labels.map((name, labelIndex) => ({
            name,
            value: dataset.data[labelIndex] ?? 0,
            // Pie slices otherwise ignore a dataset-level color override.
            ...(dataset.color ? { itemStyle: { color: dataset.color } } : {}),
          })),
          label: { show: false },
          ...seriesOverrides,
        };
      });

  return {
    color: [...palette],
    title: title ? { text: title, left: "center", top: 0, textStyle: { fontSize: 14, fontWeight: 600 } } : undefined,
    legend: {
      top: title ? 28 : 0,
      icon: "circle",
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { fontSize: 11 },
    },
    tooltip: { trigger: isCartesian ? "axis" : "item", ...chartTooltipStyle() },
    grid: isCartesian ? { top: title ? 64 : 40, left: 8, right: 16, bottom: 4, containLabel: true } : undefined,
    xAxis: isCartesian
      ? {
          type: "category",
          data: labels,
          name: xAxisName,
          nameLocation: "middle",
          nameGap: 28,
          axisLabel: { interval: "auto", hideOverlap: true, fontSize: 10 },
        }
      : undefined,
    yAxis: isCartesian
      ? {
          type: "value",
          name: yAxisName,
          // Pin the baseline at 0 without clipping negative values.
          min: (extent: { min: number; max: number }) => Math.min(0, extent.min),
          axisLabel: { fontSize: 10 },
          splitLine: { lineStyle: { color: chartGridColor() } },
        }
      : undefined,
    series: series as EChartsCoreOption["series"],
  };
}

/**
 * Structured-data chart: accepts the chart.js-shaped {labels, datasets}
 * contract and renders it through echarts with the shared palette applied by
 * dataset index.
 */
export function DataChart(props: DataChartProps) {
  const { className, style, optionOverrides, ...rest } = props;
  const option = mergeOption(buildOption(rest), optionOverrides);
  return (
    <EChart option={option} className={className} style={style} ariaLabel={rest.title ?? `${rest.chartType} chart`} />
  );
}
