import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function loadFrameworkMessages(locale: string): { common: Record<string, string> } {
  const url = new URL(`./messages/framework.${locale}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, "utf8")) as { common: Record<string, string> };
}

function loadHostMessages(locale: string): unknown | undefined {
  const url = new URL(`./messages/${locale}.json`, import.meta.url);
  try {
    return JSON.parse(readFileSync(url, "utf8"));
  } catch {
    return undefined;
  }
}

/** Dotted paths of every leaf key, so a nested miss is a failure too (R87-18). */
function leafKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leafKeys(child, prefix === "" ? key : `${prefix}.${key}`),
  );
}

test("host locales expose the same keys", () => {
  // A host may ship one locale; when it ships both, a key added to one and not
  // the other renders MISSING_MESSAGE at runtime (R87-18).
  const en = loadHostMessages("en");
  const zh = loadHostMessages("zh");
  if (en === undefined || zh === undefined) return;
  assert.deepEqual(leafKeys(zh).sort(), leafKeys(en).sort());
});

test("framework locales expose the same keys", () => {
  const en = Object.keys(loadFrameworkMessages("en").common).sort();
  const zh = Object.keys(loadFrameworkMessages("zh").common).sort();
  assert.deepEqual(zh, en);
});

test("framework.common carries the keys shared components read", () => {
  // DatePicker and ConfirmDialog resolve this namespace, so a missing key
  // breaks the framework surface in every host that adopts it.
  const keys = Object.keys(loadFrameworkMessages("en").common);
  for (const key of [
    "done",
    "clear",
    "selectDate",
    "selectDateTime",
    "hour",
    "minute",
    "chartLine",
    "chartBar",
    "chartPie",
    "chartDoughnut",
  ]) {
    assert.ok(keys.includes(key), `framework.common.${key} is missing`);
  }
});
