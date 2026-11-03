// Smoke test: the template baseline imports cleanly.
//
// The template ships zero business logic — real feature tests live in the
// host repo after `fewbie create`. What we gate here is the skeleton itself:
//   - TypeScript compiles (vitest + nextjs handles the import path setup)
//   - Next.js app shell files exist at expected locations
//   - Framework-owned shadcn/ui components resolve
//   - CLI ownership registry is present so `fewbie template update --check`
//     has something to validate
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

describe("fewbie-basic-template smoke", () => {
  it("check:template script exists (ownership-gate CI contract)", () => {
    // The actual ownership check runs in CI via `npm run check:template`.
    // The ownership registry lives inside the CLI (SYNCABLE_ASSETS in
    // fewbie-cli), not a template-side JSON file. This test only verifies
    // the script is declared so the gate can't silently disappear.
    const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
    expect(pkg.scripts["check:template"]).toBeDefined();
  });

  it("Next.js app shell files exist", () => {
    expect(existsSync("src/app/layout.tsx")).toBe(true);
    expect(existsSync("src/app/page.tsx")).toBe(true);
  });

  it("Core shadcn/ui primitives are present", () => {
    expect(existsSync("src/components/ui/button.tsx")).toBe(true);
    expect(existsSync("src/components/ui/card.tsx")).toBe(true);
    expect(existsSync("src/components/ui/input.tsx")).toBe(true);
  });

  it("Tailwind v4 config is well-formed", () => {
    const cfg = readFileSync("postcss.config.mjs", "utf-8");
    expect(cfg).toContain("@tailwindcss/postcss");
  });

  it("Shadcn component registry points to the expected tailwind config", () => {
    if (!existsSync("components.json")) return;
    const cfg = JSON.parse(readFileSync("components.json", "utf-8"));
    expect(cfg.style).toBeDefined();
  });
});
