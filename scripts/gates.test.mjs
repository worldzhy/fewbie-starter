import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import { checkFrameworkAdr } from "./check-framework-adr.mjs";
import { checkLayoutShell, inspectLayout } from "./check-layout-shell.mjs";
import { checkPageContract, inspectPage } from "./check-page-contract.mjs";
import { checkPrimitives } from "./check-primitives.mjs";
import { checkRouteConventions } from "./check-route-conventions.mjs";

/** Write a temporary project tree and remove it after `run` settles. */
async function withProject(files, run) {
  const root = await mkdtemp(path.join(tmpdir(), "fewbie-gate-"));
  try {
    for (const [relative, content] of Object.entries(files)) {
      const target = path.join(root, relative);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content);
    }
    return await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const COMPLIANT_PAGE = `
import PageShell from "@/framework/page/page-shell";

export default function Page() {
  return <PageShell title="Users" />;
}
`;

test("R1 accepts a page that renders PageShell", () => {
  assert.deepEqual(inspectPage(COMPLIANT_PAGE), []);
});

test("R1 accepts a thin page that delegates to a component", () => {
  assert.deepEqual(inspectPage("export default UserListPage;"), []);
  assert.deepEqual(inspectPage("export default function Page() { return <UserList />; }"), []);
});

test("R1 rejects a hand-written h1 and a raw JSX root", () => {
  assert.equal(inspectPage("export default function P() { return <main><h1>Users</h1></main>; }").length, 2);
  assert.equal(inspectPage("export default function P() { return <main>Users</main>; }").length, 1);
});

test("R1 scans every page.tsx and reports only the violating one", async () => {
  const violations = await withProject(
    {
      "src/app/ok/page.tsx": COMPLIANT_PAGE,
      "src/app/bad/page.tsx": "export default function P() { return <main>x</main>; }",
    },
    checkPageContract,
  );
  assert.deepEqual(
    violations.map((violation) => violation.file),
    ["src/app/bad/page.tsx"],
  );
});

test("R5 rejects a hand-written fixed sidebar frame", () => {
  const rebuilt = '<aside className="fixed bottom-0 left-0 top-14 w-60" />';
  assert.equal(inspectLayout(rebuilt).length, 1);
  assert.deepEqual(inspectLayout(`${rebuilt}\nimport { SidebarShell } from "@/framework/shell/sidebar-shell";`), []);
});

test("R5 leaves the framework root layout alone", async () => {
  const violations = await withProject(
    {
      "src/app/layout.tsx": '<aside className="fixed bottom-0 left-0" />',
      "src/app/projects/layout.tsx": '<aside className="fixed bottom-0 left-0" />',
    },
    checkLayoutShell,
  );
  assert.deepEqual(
    violations.map((violation) => violation.file),
    ["src/app/projects/layout.tsx"],
  );
});

test("R9 rejects primitive re-exports and duplicated host components", async () => {
  const violations = await withProject(
    {
      "src/components/ui/button.tsx": "export function Button() { return null; }",
      "src/components/button-copy.tsx": "export function Button() { return null; }",
      "src/components/a/widget.tsx": "export function Widget() { return null; }",
      "src/components/b/widget.tsx": "export function Widget() { return null; }",
    },
    checkPrimitives,
  );
  assert.equal(violations.length, 2);
  assert.ok(violations.some((violation) => /primitive "Button"/.test(violation.message)));
  assert.ok(violations.some((violation) => /duplicates component "Widget"/.test(violation.message)));
});

test("R9 accepts host components that do not shadow primitives", async () => {
  const violations = await withProject(
    {
      "src/components/ui/button.tsx": "export function Button() { return null; }",
      "src/components/user-card.tsx": "export function UserCard() { return null; }",
    },
    checkPrimitives,
  );
  assert.deepEqual(violations, []);
});

test("R10 rejects non-kebab-case route segments and allows route syntax", async () => {
  const violations = await withProject(
    {
      "src/app/user-settings/page.tsx": "",
      "src/app/(group)/details/page.tsx": "",
      "src/app/[id]/page.tsx": "",
      "src/app/UserSettings/page.tsx": "",
      "src/app/user_settings/page.tsx": "",
    },
    checkRouteConventions,
  );
  assert.deepEqual(
    violations.map((violation) => violation.file),
    ["src/app/UserSettings", "src/app/user_settings"],
  );
});

test("R12 requires an ADR next to a framework change", () => {
  assert.deepEqual(checkFrameworkAdr(["src/app/page.tsx"]), []);
  assert.equal(checkFrameworkAdr(["src/framework/page/page-shell.tsx"]).length, 1);
  assert.deepEqual(
    checkFrameworkAdr(["src/framework/page/page-shell.tsx", ".trae/documents/decisions/ADR-999-test.md"]),
    [],
  );
});

// Review R1-02/R1-03: framework shell chrome renders tooltips, so the root
// layout must mount the provider once, and the primitive must only use tokens
// the framework theme actually defines.
const repoRoot = new URL("..", import.meta.url);

test("the root layout mounts TooltipProvider around the subtree", async () => {
  const layout = await readFile(new URL("src/app/layout.tsx", repoRoot), "utf8");
  assert.match(
    layout,
    /<TooltipProvider>[\s\S]*<HostProviders>\{children\}<\/HostProviders>[\s\S]*<\/TooltipProvider>/,
  );
});

test("the tooltip primitive uses popover tokens the theme defines", async () => {
  const tooltip = await readFile(new URL("src/components/ui/tooltip.tsx", repoRoot), "utf8");
  const css = await readFile(new URL("src/app/globals.css", repoRoot), "utf8");
  for (const token of ["bg-popover", "text-popover-foreground", "fill-popover"]) {
    assert.ok(tooltip.includes(token), `tooltip.tsx must use ${token}`);
  }
  assert.ok(!/\b(?:bg|text|fill)-night-/.test(tooltip), "tooltip.tsx must not reference undefined night-* tokens");
  assert.match(css, /--color-popover:\s*var\(--popover\)/);
  assert.match(css, /--color-popover-foreground:\s*var\(--popover-foreground\)/);
});
