#!/usr/bin/env node
/**
 * R1: every route page renders through PageShell (which owns PageHeader).
 *
 * Checks every `page.tsx` under `src/app`:
 * - a hand-written `<h1>` (JSX or `React.createElement("h1")`) is rejected,
 *   because PageHeader owns the heading;
 * - the page's own render roots must be PageShell/PageHeader or a component
 *   (uppercase tag), so the shell owns the root instead of sitting inside a
 *   hand-written frame. Only the default export's body is inspected: route
 *   files commonly define helper components above the page, and their roots
 *   are not the page's root (R108-03);
 * - a page that delegates to a component (thin re-export) or has no JSX at all
 *   is allowed, so feature pages stay composable.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { listFiles, pathExists } from "./lib/walk.mjs";

const HAND_WRITTEN_H1 = /<h1[\s>]/;
// `React.createElement("h1")` renders the same heading without JSX, so it
// escapes the tag scan above (R83-16).
const CREATE_ELEMENT_H1 = /\bcreateElement\(\s*["']h1["']/;
const JSX_TAG = /<([A-Za-z][\w.]*)/;
// The shell must own the root node: an unused import, a comment or a nested
// `<main><PageShell/></main>` no longer satisfies the gate (R82-23, R83-16).
const PAGE_CONTRACT_USAGE = /<(?:PageShell|PageHeader)\b/;
const SHELL_ROOT = /^(?:PageShell|PageHeader)$/;
const DEFAULT_EXPORT_FUNCTION = /export\s+default\s+(?:async\s+)?function\b/;
const RETURN_JSX = /^\s*\(?\s*<([A-Za-z][\w.]*)/;
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

/**
 * Body of the default-exported function, or null when the page re-exports a
 * component (`export default Imported;`). Strings and template literals are
 * skipped so their braces do not upset the depth count.
 */
function defaultExportBody(code) {
  const match = code.match(DEFAULT_EXPORT_FUNCTION);
  if (!match) return null;
  const open = code.indexOf("{", match.index + match[0].length);
  if (open === -1) return null;
  return sliceBalanced(code, open + 1);
}

/** Text between `start` and the `}` that closes the preceding `{`. */
function sliceBalanced(code, start) {
  let depth = 1;
  let quote = null;
  for (let index = start; index < code.length; index += 1) {
    const char = code[index];
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return code.slice(start, index);
    }
  }
  return code.slice(start);
}

/**
 * JSX tags returned by the page function itself. Nested functions and callbacks
 * are opaque: their roots are not the page's root. Control-flow blocks (`if`,
 * `try`, `switch`, ...) stay transparent so an early return is still scanned.
 */
function returnRoots(body) {
  const roots = [];
  // One entry per open brace: true when it opens a function-like body.
  const opaque = [];
  let quote = null;
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") {
      opaque.push(opensFunctionBody(body, index));
      continue;
    }
    if (char === "}") {
      opaque.pop();
      continue;
    }
    if (opaque.includes(true) || !body.startsWith("return", index)) continue;
    if (/[\w$]/.test(body[index - 1] ?? "") || /[\w$]/.test(body[index + 6] ?? "")) continue;
    const root = body.slice(index + 6).match(RETURN_JSX);
    if (root) roots.push(root[1]);
  }
  return roots;
}

const CONTROL_BLOCK = /\b(?:if|for|while|switch|catch|else|try|finally|do)\s*$/;

/** Does the `{` at `index` open a function/method body rather than a block? */
function opensFunctionBody(body, index) {
  const before = body.slice(0, index).trimEnd();
  if (before.endsWith("=>")) return true;
  if (!before.endsWith(")")) return false;
  const open = matchingOpenParen(before);
  const head = open === -1 ? before : before.slice(0, open).trimEnd();
  return !CONTROL_BLOCK.test(head);
}

/** Index of the `(` matching the `)` at the end of `text`. */
function matchingOpenParen(text) {
  let depth = 0;
  for (let index = text.length - 1; index >= 0; index -= 1) {
    if (text[index] === ")") depth += 1;
    else if (text[index] === "(") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

/** Messages for one page source; empty means the page satisfies R1. */
export function inspectPage(source) {
  const code = stripImports(stripComments(source));
  const violations = [];
  if (HAND_WRITTEN_H1.test(code) || CREATE_ELEMENT_H1.test(code)) {
    violations.push("hand-written <h1>: let PageShell/PageHeader render the page title");
  }
  if (!JSX_TAG.test(code)) return violations;
  const body = defaultExportBody(code);
  // A default export that is not a local function delegates to a component.
  if (body === null) return violations;
  const roots = returnRoots(body);
  // A fragment root is allowed only when it still renders the shell itself.
  if (roots.length === 0) return PAGE_CONTRACT_USAGE.test(body) ? violations : withRootViolation(violations);
  // The shell owns every root, or the page delegates to feature components.
  for (const root of roots) {
    if (!SHELL_ROOT.test(root) && !/^[A-Z]/.test(root)) return withRootViolation(violations);
  }
  return violations;
}

function withRootViolation(violations) {
  return [...violations, "page JSX must render PageShell or delegate to a component that does"];
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
