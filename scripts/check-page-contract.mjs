#!/usr/bin/env node
/**
 * R1: every route page renders through PageShell (which owns PageHeader).
 *
 * Checks every `page.tsx` under `src/app`:
 * - a hand-written `<h1>` is rejected, because PageHeader owns the heading;
 * - a page whose JSX root is a raw element (`main`, `div`, `section`, ...) and
 *   never mentions PageShell/PageHeader is rejected;
 * - a page that delegates to a component (uppercase JSX root) or has no JSX at
 *   all (thin re-export) is allowed, so feature pages stay composable.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { listFiles, pathExists } from "./lib/walk.mjs";

const HAND_WRITTEN_H1 = /<h1[\s>]/;
const JSX_TAG = /<([A-Za-z][\w.]*)/;
// The shell must be rendered, not merely imported: an unused import used to
// satisfy the gate while the page still emitted its own raw root (R82-23).
const PAGE_CONTRACT_USAGE = /<(?:PageShell|PageHeader)\b/;
const COMMENT = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;
const IMPORT_STATEMENT = /^[ \t]*import\s+[\s\S]*?from\s+["'][^"']+["'];?[ \t]*$/gm;

/** Comments are prose, not implementation: a mention there satisfies nothing. */
function stripComments(source) {
  return source.replace(COMMENT, "");
}

/** Imports only bind names; they never render anything. */
function stripImports(source) {
  return source.replace(IMPORT_STATEMENT, "");
}

function rootJsxTag(source) {
  const returned = source.match(/return\s*\(?\s*<([A-Za-z][\w.]*)/);
  if (returned) return returned[1];
  const implicit = source.match(/=>\s*\(?\s*<([A-Za-z][\w.]*)/);
  return implicit ? implicit[1] : null;
}

/** Messages for one page source; empty means the page satisfies R1. */
export function inspectPage(source) {
  const code = stripImports(stripComments(source));
  const violations = [];
  if (HAND_WRITTEN_H1.test(code)) {
    violations.push("hand-written <h1>: let PageShell/PageHeader render the page title");
  }
  if (!JSX_TAG.test(code)) return violations;
  if (PAGE_CONTRACT_USAGE.test(code)) return violations;
  const rootTag = rootJsxTag(code);
  // Delegating to a feature component is allowed; the component owns the shell.
  if (rootTag && /^[A-Z]/.test(rootTag)) return violations;
  violations.push("page JSX must render PageShell or delegate to a component that does");
  return violations;
}

/** Scan `src/app` for page-contract violations. */
export async function checkPageContract(root = process.cwd()) {
  const appRoot = path.join(root, "src", "app");
  if (!(await pathExists(appRoot))) return [];
  const files = (await listFiles(appRoot, { extensions: [".tsx"] })).filter(
    (file) => file === "page.tsx" || file.endsWith("/page.tsx"),
  );
  const violations = [];
  for (const file of files) {
    const source = await readFile(path.join(appRoot, file), "utf8");
    for (const message of inspectPage(source)) {
      violations.push({ file: `src/app/${file}`, message });
    }
  }
  return violations;
}

async function main() {
  const violations = await checkPageContract();
  if (violations.length === 0) return;
  for (const violation of violations) {
    console.error(`R1 ${violation.file}: ${violation.message}`);
  }
  process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
