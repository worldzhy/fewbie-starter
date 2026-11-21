#!/usr/bin/env node
/**
 * R10: static route segments are kebab-case.
 *
 * Directory names under `src/app` become URL segments, so `UserSettings` or
 * `user_settings` would leak into links. Route groups (`(group)`), dynamic
 * segments (`[id]`), parallel routes (`@slot`) and private folders (`_dir`)
 * are framework syntax and skipped.
 */
import path from "node:path";
import { pathToFileURL } from "node:url";

import { listFiles, pathExists } from "./lib/walk.mjs";

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** True for a directory name that carries route syntax instead of a URL word. */
function isRouteSyntax(segment) {
  return segment.startsWith("(") || segment.startsWith("[") || segment.startsWith("@") || segment.startsWith("_");
}

/** Segments that must satisfy kebab-case for the given relative file paths. */
export function staticSegments(files) {
  const segments = new Set();
  for (const file of files) {
    const parts = file.split("/").slice(0, -1);
    for (const part of parts) {
      if (!isRouteSyntax(part)) segments.add(part);
    }
  }
  return [...segments].sort();
}

/** Scan `src/app` directory names for non-kebab-case segments. */
export async function checkRouteConventions(root = process.cwd()) {
  const appRoot = path.join(root, "src", "app");
  if (!(await pathExists(appRoot))) return [];
  const files = await listFiles(appRoot);
  return staticSegments(files)
    .filter((segment) => !KEBAB_CASE.test(segment))
    .map((segment) => ({
      file: `src/app/${segment}`,
      message: `route segment "${segment}" must be kebab-case`,
    }));
}

async function main() {
  const violations = await checkRouteConventions();
  if (violations.length === 0) return;
  for (const violation of violations) {
    console.error(`R10 ${violation.file}: ${violation.message}`);
  }
  process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
