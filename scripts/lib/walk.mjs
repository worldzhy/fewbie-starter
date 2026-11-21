/**
 * Shared filesystem walk for the framework gate scripts (ADR-056 M3).
 *
 * Gate scripts take a project root and scan a subtree for authored files, so
 * every one of them needs the same "skip build output, return POSIX paths"
 * behaviour. Keeping it here means a new gate cannot accidentally start
 * scanning `node_modules` or report Windows separators in CI output.
 */
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const SKIP_DIRECTORIES = new Set([".git", ".next", "coverage", "dist", "node_modules", "out"]);

/** Convert a platform path to the POSIX form used in reports and fixtures. */
export function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

/** True when `target` exists (used by scripts whose subtree is optional). */
export async function pathExists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

/**
 * List files under `root` as sorted POSIX paths relative to `root`.
 * `extensions` keeps only the given suffixes (e.g. `[".tsx"]`).
 */
export async function listFiles(root, { extensions } = {}) {
  const files = [];
  const visit = async (dir) => {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRECTORIES.has(entry.name)) await visit(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (extensions && !extensions.some((extension) => entry.name.endsWith(extension))) continue;
      files.push(toPosix(path.relative(root, full)));
    }
  };
  await visit(root);
  return files.sort();
}
