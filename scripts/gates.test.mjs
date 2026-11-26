import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

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
import PageShell from "@/fewbie/framework/page/page-shell";

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

test("R1 only judges the default export, not helper components above it", () => {
  // Route files commonly define row/field helpers before the page; their roots
  // are not the page's root (R108-03).
  const withHelpers = [
    "function KeyValue({ children }) {",
    '  return <div className="space-y-1">{children}</div>;',
    "}",
    "function Row({ value }) {",
    "  return value ? <span>{value}</span> : null;",
    "}",
    "export default function Page() {",
    '  return <PageShell title="Users"><KeyValue><Row value="x" /></KeyValue></PageShell>;',
    "}",
  ].join("\n");
  assert.deepEqual(inspectPage(withHelpers), []);
  // An early raw return inside the page body is still the page's own root.
  const earlyRaw = [
    "export default function Page() {",
    "  if (loading) return <div>Loading</div>;",
    '  return <PageShell title="Users" />;',
    "}",
  ].join("\n");
  assert.equal(inspectPage(earlyRaw).length, 1);
  // A braced early return is still the page's own root.
  const bracedEarly = [
    "export default function Page() {",
    "  if (loading) {",
    "    return <div>Loading</div>;",
    "  }",
    '  return <PageShell title="Users" />;',
    "}",
  ].join("\n");
  assert.equal(inspectPage(bracedEarly).length, 1);
  // A destructured parameter contains braces; the body starts after the `)`.
  const destructuredParams = [
    "export default function Page({ params }: { params: Promise<{ id: string }> }) {",
    '  return <PageShell title="Users" />;',
    "}",
  ].join("\n");
  assert.deepEqual(inspectPage(destructuredParams), []);
  // A nested callback returning a raw element is not the page root.
  const callback = [
    "export default function Page() {",
    "  return (",
    '    <PageShell title="Users">',
    "      {rows.map((row) => {",
    "        return <div key={row.id}>{row.name}</div>;",
    "      })}",
    "    </PageShell>",
    "  );",
    "}",
  ].join("\n");
  assert.deepEqual(inspectPage(callback), []);
});

test("R1 rejects a hand-written h1 and a raw JSX root", () => {
  assert.equal(inspectPage("export default function P() { return <main><h1>Users</h1></main>; }").length, 2);
  assert.equal(inspectPage("export default function P() { return <main>Users</main>; }").length, 1);
  // The shell must own the root, not sit inside a hand-written frame (R83-16).
  assert.equal(inspectPage("export default function P() { return <main><PageShell /></main>; }").length, 1);
  // A non-JSX heading escapes the tag scan (R83-16).
  assert.equal(
    inspectPage('export default function P() { return React.createElement("h1", null, "Users"); }').length,
    1,
  );
});

test("R1 accepts a fragment that still renders the shell", () => {
  assert.deepEqual(inspectPage("export default function P() { return <><PageShell /></>; }"), []);
});

test("R1 only counts PageShell when the code uses it", () => {
  // Comments are prose: mentioning the shell there does not satisfy the contract,
  // and a commented-out heading is not a hand-written one.
  const commentOnly = [
    "// TODO: wrap in PageShell later",
    "export default function P() {",
    "  return <div>Body</div>;",
    "}",
  ].join("\n");
  assert.equal(inspectPage(commentOnly).length, 1);
  // An unused import is equally not a render (R82-23).
  const importOnly = [
    'import PageShell from "@/fewbie/framework/page/page-shell";',
    "export default function P() {",
    "  return <div>Body</div>;",
    "}",
  ].join("\n");
  assert.equal(inspectPage(importOnly).length, 1);
  assert.deepEqual(inspectPage("// <h1>Old title</h1>\nexport default function P() { return <UserList />; }"), []);
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
  // Rendering the shell satisfies the rule ...
  assert.deepEqual(inspectLayout(`${rebuilt}\nreturn <SidebarShell />;`), []);
  // ... but importing or naming it does not (R83-16).
  assert.equal(
    inspectLayout(`${rebuilt}\nimport { SidebarShell } from "@/fewbie/framework/shell/sidebar-shell";`).length,
    1,
  );
  assert.equal(inspectLayout(`${rebuilt}\n// TODO: render <SidebarShell />`).length, 1);
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
      "src/fewbie/ui/button.tsx": "export function Button() { return null; }",
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

test("R9 ignores barrel re-exports and still catches real duplicates", async () => {
  const violations = await withProject(
    {
      "src/fewbie/ui/button.tsx": "export function Button() { return null; }",
      // A barrel forwards names it does not own; the owner is checked where it is defined.
      "src/components/blocks/index.tsx": 'export { Widget } from "./widget";',
      "src/components/blocks/widget.tsx": "export function Widget() { return null; }",
      "src/components/other/widget.tsx": "export function Widget() { return null; }",
    },
    checkPrimitives,
  );
  assert.equal(violations.length, 1);
  assert.ok(violations.some((violation) => /duplicates component "Widget"/.test(violation.message)));
  assert.ok(!violations.some((violation) => violation.file === "src/components/blocks/index.tsx"));
});

test("R9 accepts host components that do not shadow primitives", async () => {
  const violations = await withProject(
    {
      "src/fewbie/ui/button.tsx": "export function Button() { return null; }",
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

// Review R1-02/R1-03: framework shell chrome renders tooltips, so the root
// layout must mount the provider once, and the primitive must only use tokens
// the framework theme actually defines.
const repoRoot = new URL("..", import.meta.url);

test("the root layout mounts TooltipProvider around the subtree", async () => {
  const layout = await readFile(new URL("src/app/layout.tsx", repoRoot), "utf8");
  assert.match(layout, /<TooltipProvider>[\s\S]*<HostProviders>[\s\S]*<\/HostProviders>[\s\S]*<\/TooltipProvider>/);
});

// Review R1-12: the hooks these providers expose throw without a mount, so the
// framework layout mounts them instead of leaving an implicit contract for the
// host to remember.
test("the root layout mounts the framework providers", async () => {
  const layout = await readFile(new URL("src/app/layout.tsx", repoRoot), "utf8");
  for (const provider of ["ThemeProvider", "ConfirmProvider", "NavigationProgressProvider", "QueryProvider"]) {
    assert.match(layout, new RegExp(`<${provider}[\\s>]`), `${provider} must be mounted in the root layout`);
  }
  assert.match(layout, /<ThemeProvider initialTheme=\{theme\}>/);
  // ADR-079 D3: a registry module may call useQuery in every host, so the
  // QueryClient lifecycle is the framework's, not the host's.
  assert.match(layout, /<QueryProvider>[\s\S]*<HostProviders>[\s\S]*<\/HostProviders>[\s\S]*<\/QueryProvider>/);
});

// Review R107-01 / devbie ADR-080 D1: the error channel fans out to every
// subscriber, so the layout mounts exactly one, inside HostProviders where the
// host's ApiErrorMessageProvider can reach it.
test("the root layout mounts exactly one error subscriber inside HostProviders", async () => {
  const layout = await readFile(new URL("src/app/layout.tsx", repoRoot), "utf8");
  assert.equal(layout.match(/<ApiErrorToast\b/g)?.length, 1, "exactly one <ApiErrorToast /> may be mounted");
  assert.match(layout, /<HostProviders>[\s\S]*<ApiErrorToast\s*\/>[\s\S]*<\/HostProviders>/);
});

test("the tooltip primitive uses popover tokens the theme defines", async () => {
  const tooltip = await readFile(new URL("src/fewbie/ui/tooltip.tsx", repoRoot), "utf8");
  const css = await readFile(new URL("src/app/globals.css", repoRoot), "utf8");
  for (const token of ["bg-popover", "text-popover-foreground", "fill-popover"]) {
    assert.ok(tooltip.includes(token), `tooltip.tsx must use ${token}`);
  }
  assert.ok(!/\b(?:bg|text|fill)-night-/.test(tooltip), "tooltip.tsx must not reference undefined night-* tokens");
  assert.match(css, /--color-popover:\s*var\(--popover\)/);
  assert.match(css, /--color-popover-foreground:\s*var\(--popover-foreground\)/);
});
