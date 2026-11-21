#!/usr/bin/env node
/**
 * R5: account-level layouts use SidebarShell instead of rebuilding the sidebar.
 *
 * The two historical layouts (project and AWS account) were the same skeleton
 * copied twice. This check flags a nested `layout.tsx` that hand-writes the
 * fixed sidebar frame (`fixed bottom-0 left-0`, or the old `project-sidebar`
 * class) without importing SidebarShell. The root `src/app/layout.tsx` is
 * framework-owned and excluded.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { listFiles, pathExists } from "./lib/walk.mjs";

const RAW_SIDEBAR_FRAME = /fixed\s+bottom-0\s+left-0/;
const LEGACY_SIDEBAR_CLASS = /project-sidebar/;

/** Messages for one layout source; empty means the layout satisfies R5. */
export function inspectLayout(source) {
  const rebuildsFrame = RAW_SIDEBAR_FRAME.test(source) || LEGACY_SIDEBAR_CLASS.test(source);
  if (rebuildsFrame && !/\bSidebarShell\b/.test(source)) {
    return ["account-level layouts must render SidebarShell instead of hand-writing the fixed sidebar frame"];
  }
  return [];
}

/** Scan nested `layout.tsx` files for a hand-written sidebar frame. */
export async function checkLayoutShell(root = process.cwd()) {
  const appRoot = path.join(root, "src", "app");
  if (!(await pathExists(appRoot))) return [];
  const files = (await listFiles(appRoot, { extensions: [".tsx"] })).filter(
    (file) => file === "layout.tsx" || file.endsWith("/layout.tsx"),
  );
  const violations = [];
  for (const file of files) {
    // The root layout is the framework's own; the rule targets scoped layouts.
    if (file === "layout.tsx") continue;
    const source = await readFile(path.join(appRoot, file), "utf8");
    for (const message of inspectLayout(source)) {
      violations.push({ file: `src/app/${file}`, message });
    }
  }
  return violations;
}

async function main() {
  const violations = await checkLayoutShell();
  if (violations.length === 0) return;
  for (const violation of violations) {
    console.error(`R5 ${violation.file}: ${violation.message}`);
  }
  process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
