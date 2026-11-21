import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function loadFrameworkMessages(locale: string): { common: Record<string, string> } {
  const url = new URL(`./messages/framework.${locale}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, "utf8")) as { common: Record<string, string> };
}

test("framework locales expose the same keys", () => {
  const en = Object.keys(loadFrameworkMessages("en").common).sort();
  const zh = Object.keys(loadFrameworkMessages("zh").common).sort();
  assert.deepEqual(zh, en);
});

test("framework.common carries the keys shared components read", () => {
  // DatePicker and ConfirmDialog resolve this namespace, so a missing key
  // breaks the framework surface in every host that adopts it.
  const keys = Object.keys(loadFrameworkMessages("en").common);
  for (const key of ["done", "clear", "selectDate", "selectDateTime", "hour", "minute"]) {
    assert.ok(keys.includes(key), `framework.common.${key} is missing`);
  }
});
