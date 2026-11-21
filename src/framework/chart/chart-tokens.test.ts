import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { CHART_PALETTE } from "./chart-palette";
import { CHART_TOOLTIP_STYLE } from "./chart-theme";

// Canvas rendering cannot read CSS variables, so the chart constants are the
// light-theme fallbacks for the tokens in globals.css. This test is the guard
// that keeps the two in step.
const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

function declarations(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  assert.ok(start >= 0, `globals.css has no ${selector} block`);
  const body = css.slice(start, css.indexOf("\n}", start));
  const values: Record<string, string> = {};
  for (const match of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) values[match[1]] = match[2].trim();
  return values;
}

const light = declarations(":root");
const dark = declarations(".dark");

test("the chart palette mirrors the light --chart-* tokens", () => {
  CHART_PALETTE.forEach((color, index) => {
    assert.equal(color, light[`--chart-${index + 1}`], `--chart-${index + 1} differs from CHART_PALETTE[${index}]`);
  });
});

test("both themes define the same chart tokens", () => {
  const lightKeys = Object.keys(light)
    .filter((key) => key.startsWith("--chart-"))
    .sort();
  const darkKeys = Object.keys(dark)
    .filter((key) => key.startsWith("--chart-"))
    .sort();
  assert.deepEqual(darkKeys, lightKeys);
});

test("the chart tooltip fallbacks mirror the light popover tokens", () => {
  assert.equal(CHART_TOOLTIP_STYLE.backgroundColor, light["--popover"]);
  assert.equal(CHART_TOOLTIP_STYLE.textStyle.color, light["--popover-foreground"]);
});
