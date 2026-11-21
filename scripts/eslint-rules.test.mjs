import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import base from "@devbie/style-guide/eslint/base";
import next from "@devbie/style-guide/eslint/next";
import { ESLint } from "eslint";

import { frameworkLintConfig } from "../eslint.config.mjs";

/**
 * Lint a temporary project with the framework rule set only.
 *
 * Fixtures must not live under `src/` in the repo: `next build` and `tsc`
 * would compile deliberately broken code. A temp root also proves the rules
 * are file-scoped by path rather than by file name coincidences.
 */
async function lintFixture(files) {
  const root = await mkdtemp(path.join(tmpdir(), "fewbie-rules-"));
  try {
    for (const [relative, content] of Object.entries(files)) {
      const target = path.join(root, relative);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content);
    }
    const eslint = new ESLint({
      cwd: root,
      overrideConfigFile: true,
      overrideConfig: [...base, ...next, ...frameworkLintConfig],
    });
    const results = await eslint.lintFiles(Object.keys(files));
    return results.flatMap((result) =>
      result.messages.map((message) => ({
        ruleId: message.ruleId,
        severity: message.severity,
        text: message.message,
        file: relativePath(root, result.filePath),
      })),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function relativePath(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

/** Messages that fail CI (errors), optionally narrowed to one rule. */
function errors(messages, ruleId) {
  return messages.filter((message) => message.severity === 2 && (!ruleId || message.ruleId === ruleId));
}

test("host code that follows the rules produces no gate errors", async () => {
  const messages = await lintFixture({
    "src/app/page.tsx": `
      export function Page({ label }: { label: string }) {
        return <div className="bg-primary text-muted-foreground">{label}</div>;
      }
    `,
  });
  assert.deepEqual(errors(messages), []);
});

test("R4 rejects global fetch and a bare axios import", async () => {
  const fetched = await lintFixture({
    "src/features/user/api.ts": 'export const load = () => fetch("/api/users");',
  });
  assert.ok(errors(fetched, "no-restricted-globals").length >= 1);

  const memberFetch = await lintFixture({
    "src/features/user/api.ts": 'export const load = () => window.fetch("/api/users");',
  });
  assert.ok(errors(memberFetch, "no-restricted-syntax").some((message) => message.text.includes("(R4)")));

  const dynamicAxios = await lintFixture({
    "src/features/user/api.ts": 'export const load = () => import("axios");',
  });
  assert.ok(errors(dynamicAxios, "no-restricted-syntax").some((message) => message.text.includes("(R4)")));

  const axiosImport = await lintFixture({
    "src/features/user/api.ts": 'import axios from "axios";\nexport const client = axios;',
  });
  assert.ok(errors(axiosImport, "no-restricted-imports").length >= 1);
});

test("R3 rejects raw palette classes", async () => {
  const messages = await lintFixture({
    "src/app/page.tsx": 'export function Page() { return <div className="bg-red-500 text-gray-700" />; }',
  });
  assert.ok(errors(messages, "no-restricted-syntax").some((message) => message.text.includes("(R3)")));
});

test("R3 also rejects hard-coded colors in inline styles", async () => {
  const hex = await lintFixture({
    "src/features/status.tsx": 'export function Status() { return <div style={{ color: "#ff0000" }} />; }',
  });
  assert.ok(errors(hex, "no-restricted-syntax").some((message) => message.text.includes("(R3)")));

  const rgb = await lintFixture({
    "src/features/status.tsx": 'export function Status() { return <div style={{ backgroundColor: "rgb(0 0 0)" }} />; }',
  });
  assert.ok(errors(rgb, "no-restricted-syntax").some((message) => message.text.includes("(R3)")));

  const token = await lintFixture({
    "src/features/status.tsx": 'export function Status() { return <div style={{ color: "var(--primary)" }} />; }',
  });
  assert.deepEqual(errors(token, "no-restricted-syntax"), []);
});

test("R6 rejects off-scale radius and arbitrary spacing", async () => {
  const messages = await lintFixture({
    "src/app/page.tsx": 'export function Page() { return <div className="rounded-xl p-[13px]" />; }',
  });
  assert.ok(errors(messages, "no-restricted-syntax").some((message) => message.text.includes("(R6)")));

  const sizing = await lintFixture({
    "src/app/page.tsx": 'export function Page() { return <div className="h-[200px] size-[70px] z-[9999]" />; }',
  });
  assert.ok(errors(sizing, "no-restricted-syntax").some((message) => message.text.includes("(R6)")));
});

test("R6 allows the radii its own message recommends", async () => {
  const messages = await lintFixture({
    "src/app/page.tsx":
      'export function Page() { return <div className="rounded-none rounded-sm rounded-md rounded-lg rounded-full" />; }',
  });
  assert.ok(!errors(messages, "no-restricted-syntax").some((message) => message.text.includes("(R6)")));
});

test("R3/R6/R7 also gate the framework runtime", async () => {
  const tokens = await lintFixture({
    "src/framework/probe.tsx": 'export function Probe() { return <div className="bg-red-500 rounded-xl p-[3px]" />; }',
  });
  assert.ok(errors(tokens, "no-restricted-syntax").some((message) => message.text.includes("(R3)")));
  assert.ok(errors(tokens, "no-restricted-syntax").some((message) => message.text.includes("(R6)")));

  // Framework copy is copied by hosts that cannot edit it, so it needs the
  // same translatability gate as host copy.
  const copy = await lintFixture({
    "src/framework/labels.tsx": "export function Labels() { return <div>Close</div>; }",
  });
  assert.ok(errors(copy, "react/jsx-no-literals").length >= 1);

  const punctuation = await lintFixture({
    "src/framework/separator.tsx": "export function Separator() { return <div>—</div>; }",
  });
  assert.deepEqual(errors(punctuation, "react/jsx-no-literals"), []);
});

test("R2 rejects inline loading branches, Skeleton and Loader2", async () => {
  const branch = await lintFixture({
    "src/app/page.tsx":
      "export function Page({ isLoading }: { isLoading: boolean }) { return isLoading ? <div /> : <span />; }",
  });
  assert.ok(errors(branch, "no-restricted-syntax").some((message) => message.text.includes("(R2)")));

  const submitBranch = await lintFixture({
    "src/app/page.tsx":
      "export function Page({ isSubmitting }: { isSubmitting: boolean }) { return isSubmitting ? <div /> : <span />; }",
  });
  assert.ok(errors(submitBranch, "no-restricted-syntax").some((message) => message.text.includes("(R2)")));

  const skeleton = await lintFixture({
    "src/app/page.tsx":
      'import { Skeleton } from "@/components/ui/skeleton";\nexport function Page() { return <Skeleton />; }',
  });
  assert.ok(errors(skeleton, "no-restricted-syntax").some((message) => message.text.includes("(R2)")));

  const spinner = await lintFixture({
    "src/app/page.tsx": "export function Page() { return <Loader2 />; }",
  });
  assert.ok(errors(spinner, "no-restricted-syntax").some((message) => message.text.includes("(R2)")));
});

test("R7 rejects literal JSX copy", async () => {
  const messages = await lintFixture({
    "src/app/page.tsx": "export function Page() { return <div>Hello there</div>; }",
  });
  assert.ok(errors(messages, "react/jsx-no-literals").length >= 1);
});

test("R11 rejects an inline query-key literal", async () => {
  const messages = await lintFixture({
    "src/features/user/list.ts":
      'export function useUsers(queryFn: () => void) { return useQuery({ queryKey: ["users"], queryFn }); }',
  });
  assert.ok(errors(messages, "no-restricted-syntax").some((message) => message.text.includes("(R11)")));

  const template = await lintFixture({
    "src/features/user/list.ts":
      "export function useUsers(id: string, queryFn: () => void) { return useQuery({ queryKey: [`users-${id}`], queryFn }); }",
  });
  assert.ok(errors(template, "no-restricted-syntax").some((message) => message.text.includes("(R11)")));
});

test("framework-owned primitives stay outside the host gates", async () => {
  const messages = await lintFixture({
    "src/components/ui/legacy.tsx":
      'export function Legacy() { return <div className="bg-red-500 rounded-xl">Close</div>; }',
  });
  assert.deepEqual(errors(messages), []);
});
