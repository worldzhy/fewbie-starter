#!/usr/bin/env node
/**
 * R9: no new primitive copies under `src/components` or `src/app`.
 *
 * `src/fewbie/ui/**` is framework-owned. A host component that exports a
 * name already exported by a primitive (or that duplicates another host
 * component under `src/components`) would silently fork the design system,
 * so both cases fail here. Route files under `src/app` legitimately repeat
 * default component names, so there only primitive shadows are rejected.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { listFiles, pathExists } from "./lib/walk.mjs";

const NAMED_COMPONENT = /export\s+(?:default\s+)?(?:function|const|class)\s+([A-Z]\w*)/g;
const EXPORT_LIST = /export\s*\{([^}]+)\}/g;

// A barrel re-exports what another file already defined; counting those names
// here would blame the barrel rather than the file that owns the component.
const RE_EXPORT = /^\s*from\s+["']/;

/** Component names exported by one source file. */
export function exportedComponents(source) {
  const names = new Set();
  for (const match of source.matchAll(NAMED_COMPONENT)) names.add(match[1]);
  for (const match of source.matchAll(EXPORT_LIST)) {
    const rest = source.slice(match.index + match[0].length);
    if (RE_EXPORT.test(rest)) continue;
    for (const specifier of match[1].split(",")) {
      const name = specifier
        .trim()
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (name && /^[A-Z]\w*$/.test(name)) names.add(name);
    }
  }
  return [...names];
}

/** Compare host components against the primitive set and against each other. */
export async function checkPrimitives(root = process.cwd()) {
  const componentsRoot = path.join(root, "src", "components");
  const appRoot = path.join(root, "src", "app");
  const primitivesRoot = path.join(root, "src", "fewbie", "ui");
  const hasComponents = await pathExists(componentsRoot);
  const hasApp = await pathExists(appRoot);
  if (!hasComponents && !hasApp && !(await pathExists(primitivesRoot))) return [];

  const primitiveNames = new Set();
  if (await pathExists(primitivesRoot)) {
    for (const file of await listFiles(primitivesRoot, { extensions: [".tsx", ".ts"] })) {
      const source = await readFile(path.join(primitivesRoot, file), "utf8");
      for (const name of exportedComponents(source)) primitiveNames.add(name);
    }
  }

  const violations = [];

  // `src/components` owns reusable host components: no primitive shadows and no
  // two files defining the same component name.
  if (hasComponents) {
    const owner = new Map();
    for (const file of await listFiles(componentsRoot, { extensions: [".tsx", ".ts"] })) {
      const source = await readFile(path.join(componentsRoot, file), "utf8");
      for (const name of exportedComponents(source)) {
        if (primitiveNames.has(name)) {
          violations.push({
            file: `src/components/${file}`,
            message: `re-exports primitive "${name}"; import it from @/fewbie/ui instead`,
          });
          continue;
        }
        const previous = owner.get(name);
        if (previous) {
          violations.push({
            file: `src/components/${file}`,
            message: `duplicates component "${name}" already defined in src/components/${previous}`,
          });
        } else {
          owner.set(name, file);
        }
      }
    }
  }

  // Route files repeat default component names (`Page`, `Layout`) by design, so
  // `src/app` is only rejected when it shadows a framework primitive.
  if (hasApp) {
    for (const file of await listFiles(appRoot, { extensions: [".tsx", ".ts"] })) {
      const source = await readFile(path.join(appRoot, file), "utf8");
      for (const name of exportedComponents(source)) {
        if (primitiveNames.has(name)) {
          violations.push({
            file: `src/app/${file}`,
            message: `re-exports primitive "${name}"; import it from @/fewbie/ui instead`,
          });
        }
      }
    }
  }

  return violations;
}

async function main() {
  const violations = await checkPrimitives();
  if (violations.length === 0) return;
  for (const violation of violations) {
    console.error(`R9 ${violation.file}: ${violation.message}`);
  }
  process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
