#!/usr/bin/env node
/**
 * R9: no new primitive copies under `src/components`.
 *
 * `src/fewbie/ui/**` is framework-owned. A host component that exports a
 * name already exported by a primitive (or that duplicates another host
 * component) would silently fork the design system, so both cases fail here.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { listFiles, pathExists } from "./lib/walk.mjs";

const NAMED_COMPONENT = /export\s+(?:default\s+)?(?:function|const|class)\s+([A-Z]\w*)/g;
const EXPORT_LIST = /export\s*\{([^}]+)\}/g;

/** Component names exported by one source file. */
export function exportedComponents(source) {
  const names = new Set();
  for (const match of source.matchAll(NAMED_COMPONENT)) names.add(match[1]);
  for (const match of source.matchAll(EXPORT_LIST)) {
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
  const primitivesRoot = path.join(root, "src", "fewbie", "ui");
  const hasComponents = await pathExists(componentsRoot);
  if (!hasComponents && !(await pathExists(primitivesRoot))) return [];

  const primitiveNames = new Set();
  if (await pathExists(primitivesRoot)) {
    for (const file of await listFiles(primitivesRoot, { extensions: [".tsx", ".ts"] })) {
      const source = await readFile(path.join(primitivesRoot, file), "utf8");
      for (const name of exportedComponents(source)) primitiveNames.add(name);
    }
  }
  if (!hasComponents) return [];

  const hostFiles = await listFiles(componentsRoot, { extensions: [".tsx", ".ts"] });

  const violations = [];
  const owner = new Map();
  for (const file of hostFiles) {
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
