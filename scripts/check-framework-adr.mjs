#!/usr/bin/env node
/**
 * R12: a framework change ships with a design decision.
 *
 * Framework-owned UI, layout, gate and config files are shared by every host,
 * so changing them is a cross-host contract. On a pull request this script
 * compares the changed paths with the base branch and fails when a framework
 * path changed without an ADR file under a decisions directory.
 *
 * Local runs without `--base` are a no-op: the gate belongs to pull requests,
 * not to every working-tree check.
 */
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

/** Paths owned by the framework (ADR-056 D1); editing them is a contract change. */
export const FRAMEWORK_PATHS = [
  "src/framework/",
  "src/components/ui/",
  "src/lib/api-client/",
  "src/app/layout.tsx",
  "src/app/globals.css",
  "src/app/fonts/",
  "src/i18n/config.ts",
  "src/i18n/messages/framework.",
  "src/instrumentation.ts",
  "src/lib/utils.ts",
  ".fewbie/framework.json",
  "next.config.framework.ts",
  "postcss.config.mjs",
  "tsconfig.json",
  "components.json",
  "eslint.config.mjs",
  "scripts/",
];

const DECISION_PATHS = [".trae/documents/decisions/", "decisions/", "docs/decisions/"];

/** Messages for a changed-file list; empty means the change set satisfies R12. */
export function checkFrameworkAdr(changedFiles) {
  const frameworkFiles = changedFiles.filter((file) => FRAMEWORK_PATHS.some((prefix) => file.startsWith(prefix)));
  if (frameworkFiles.length === 0) return [];
  if (changedFiles.some((file) => DECISION_PATHS.some((prefix) => file.startsWith(prefix)))) return [];
  return frameworkFiles.map((file) => ({
    file,
    message: "framework files changed without an ADR under .trae/documents/decisions/ (R12)",
  }));
}

/** Changed paths relative to `base` (three-dot diff, so the merge base is used). */
export function changedFilesSince(base) {
  const output = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], { encoding: "utf8" });
  return output.split("\n").filter(Boolean);
}

async function main() {
  const baseIndex = process.argv.indexOf("--base");
  if (baseIndex === -1 || !process.argv[baseIndex + 1]) {
    console.log("R12: no --base given; framework ADR gate runs on pull requests only.");
    return;
  }
  const violations = checkFrameworkAdr(changedFilesSince(process.argv[baseIndex + 1]));
  if (violations.length === 0) return;
  for (const violation of violations) {
    console.error(`R12 ${violation.file}: ${violation.message}`);
  }
  process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
