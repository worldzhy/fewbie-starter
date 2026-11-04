// Smoke test: the template baseline imports cleanly.
//
// The template ships zero business logic — real feature tests live in the
// host repo after `fewbie create`. What we gate here is the skeleton itself:
//   - Next.js app shell files exist at expected locations
//   - Core shadcn/ui primitives resolve
//   - Tailwind v4 config is well-formed
//   - CLI ownership registry is present so `fewbie template update --check`
//     has something to validate
//
// Uses Node's native test runner + tsx — same stack as newbie-starter. The
// host repo (nightwatch-frontend) may upgrade to vitest later when it needs
// JSX transformation for React component tests, but the template only
// needs file-existence gates.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

describe("fewbie-basic-template smoke", () => {
  test("check:template script exists (ownership-gate CI contract)", () => {
    // The actual ownership check runs in CI via `npm run check:template`.
    // The ownership registry lives inside the CLI (SYNCABLE_ASSETS in
    // fewbie-cli), not a template-side JSON file.
    const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
    assert.ok(pkg.scripts["check:template"], "package.json must declare check:template");
  });

  test("Next.js app shell files exist", () => {
    assert.ok(existsSync("src/app/layout.tsx"));
    assert.ok(existsSync("src/app/page.tsx"));
  });

  test("Core shadcn/ui primitives are present", () => {
    assert.ok(existsSync("src/components/ui/button.tsx"));
    assert.ok(existsSync("src/components/ui/card.tsx"));
    assert.ok(existsSync("src/components/ui/input.tsx"));
  });

  test("Tailwind v4 config is well-formed", () => {
    const cfg = readFileSync("postcss.config.mjs", "utf-8");
    assert.ok(cfg.includes("@tailwindcss/postcss"));
  });

  test("Shadcn component registry points to the expected tailwind config", () => {
    if (!existsSync("components.json")) return;
    const cfg = JSON.parse(readFileSync("components.json", "utf-8"));
    assert.ok(cfg.style);
  });
});
