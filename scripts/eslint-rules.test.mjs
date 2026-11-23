import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import base from "@devbie/style-guide/eslint/base";
import next from "@devbie/style-guide/eslint/next";
import { ESLint } from "eslint";

import { createFrameworkLintConfig } from "../eslint.config.mjs";

/**
 * Lint a temporary project with the framework rule set only.
 *
 * Fixtures must not live under `src/` in the repo: `next build` and `tsc`
 * would compile deliberately broken code. A temp root also proves the rules
 * are file-scoped by path rather than by file name coincidences.
 *
 * `moduleFiles` stands in for the lockfile: it is what tells the rule set which
 * fixtures are registry items (ADR-065).
 */
async function lintFixture(files, moduleFiles = []) {
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
      overrideConfig: [...base, ...next, ...createFrameworkLintConfig(moduleFiles)],
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

test("R3 rejects arbitrary colors and undefined palettes", async () => {
  const arbitrary = await lintFixture({
    "src/app/page.tsx": 'export function Page() { return <div className="bg-[#ff0000]" />; }',
  });
  assert.ok(errors(arbitrary, "no-restricted-syntax").some((message) => message.text.includes("(R3)")));

  const unknown = await lintFixture({
    "src/app/page.tsx": 'export function Page() { return <div className="bg-night-900" />; }',
  });
  assert.ok(errors(unknown, "no-restricted-syntax").some((message) => message.text.includes("(R3)")));

  // Token references, gradients over tokens and semantic chart colors pass.
  const tokens = await lintFixture({
    "src/app/page.tsx":
      'export function Page() { return <div className="bg-[var(--primary)] bg-chart-1 text-muted-foreground" />; }',
  });
  assert.deepEqual(errors(tokens, "no-restricted-syntax"), []);
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

  const arbitraryRadius = await lintFixture({
    "src/app/page.tsx": 'export function Page() { return <div className="rounded-[7px]" />; }',
  });
  assert.ok(errors(arbitraryRadius, "no-restricted-syntax").some((message) => message.text.includes("(R6)")));
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

const LOGIN_PAGE = "src/features/login-page/login-page.tsx";
const NOTIFICATION_WIDGET = "src/widgets/notification-center/notification-center.tsx";
const COPILOT_WIDGET = "src/widgets/copilot/index.ts";
const PRESENTATION_COMPONENT = "src/components/notification-presentation/index.ts";
// What the lockfile would record for a host that installed both layers.
const INSTALLED_ITEMS = [
  LOGIN_PAGE,
  "src/features/password-checklist/index.ts",
  NOTIFICATION_WIDGET,
  COPILOT_WIDGET,
  PRESENTATION_COMPONENT,
];

test("registry items may only reach the framework surface and installed items", async () => {
  const allowed = await lintFixture(
    {
      [LOGIN_PAGE]: `
      import { Button } from "@/components/ui/button";
      import { cn } from "@/lib/utils";
      import { checkPasswordPolicy } from "@/features/password-checklist";
      export function LoginPage({ label }: { label: string }) {
        return <Button className={cn("w-full")} onClick={() => checkPasswordPolicy(label)}>{label}</Button>;
      }
    `,
    },
    INSTALLED_ITEMS,
  );
  assert.deepEqual(errors(allowed), []);

  for (const source of [
    "next/navigation",
    "next-intl",
    "axios",
    "@tanstack/react-query",
    "sonner",
    "@/i18n/request",
    "@/components/host-widget",
  ]) {
    const messages = await lintFixture(
      { [LOGIN_PAGE]: `import { helper } from "${source}";\nexport const value = helper;` },
      INSTALLED_ITEMS,
    );
    assert.ok(errors(messages, "no-restricted-imports").length >= 1, `${source} must be rejected inside an item`);
  }

  // A host feature shares `src/features/**` but is not an installed item.
  const hostFeature = await lintFixture(
    { [LOGIN_PAGE]: 'import { load } from "@/features/user/api";\nexport const value = load;' },
    INSTALLED_ITEMS,
  );
  assert.ok(errors(hostFeature, "no-restricted-syntax").some((message) => message.text.includes("host feature")));
});

test("registry items cannot fetch on their own", async () => {
  const globalFetch = await lintFixture(
    { [LOGIN_PAGE]: 'export const load = () => fetch("/api/session");' },
    INSTALLED_ITEMS,
  );
  assert.ok(errors(globalFetch, "no-restricted-globals").length >= 1);

  const memberFetch = await lintFixture(
    { [LOGIN_PAGE]: 'export const load = () => window.fetch("/api/session");' },
    INSTALLED_ITEMS,
  );
  assert.ok(errors(memberFetch, "no-restricted-syntax").length >= 1);
});

test("widgets may compose installed features and widgets", async () => {
  const allowed = await lintFixture(
    {
      [NOTIFICATION_WIDGET]: `
      import { Button } from "@/components/ui/button";
      import { LoginPage } from "@/features/login-page";
      import { Copilot } from "@/widgets/copilot";
      export function NotificationCenter({ label }: { label: string }) {
        return <Button onClick={() => [LoginPage, Copilot]}>{label}</Button>;
      }
    `,
    },
    INSTALLED_ITEMS,
  );
  assert.deepEqual(errors(allowed), []);
});

test("features never import widgets", async () => {
  const messages = await lintFixture(
    { [LOGIN_PAGE]: 'import { Copilot } from "@/widgets/copilot";\nexport const value = Copilot;' },
    INSTALLED_ITEMS,
  );
  assert.ok(errors(messages, "no-restricted-imports").some((message) => message.text.includes("never the reverse")));

  const dynamic = await lintFixture(
    { [LOGIN_PAGE]: 'export const load = () => import("@/widgets/copilot");' },
    INSTALLED_ITEMS,
  );
  assert.ok(errors(dynamic, "no-restricted-syntax").some((message) => message.text.includes("never the reverse")));
});

test("widgets may not reach host slices in either layer", async () => {
  const hostFeature = await lintFixture(
    { [NOTIFICATION_WIDGET]: 'import { load } from "@/features/user/api";\nexport const value = load;' },
    INSTALLED_ITEMS,
  );
  assert.ok(errors(hostFeature, "no-restricted-syntax").some((message) => message.text.includes("not a host feature")));

  const hostWidget = await lintFixture(
    { [NOTIFICATION_WIDGET]: 'import { load } from "@/widgets/host-dock";\nexport const value = load;' },
    INSTALLED_ITEMS,
  );
  assert.ok(errors(hostWidget, "no-restricted-syntax").some((message) => message.text.includes("not a host widget")));

  // With no installed feature, every `@/features/*` import is a host import.
  const noFeatureSiblings = await lintFixture(
    { [NOTIFICATION_WIDGET]: 'import { load } from "@/features/user/api";\nexport const value = load;' },
    [NOTIFICATION_WIDGET],
  );
  assert.ok(
    errors(noFeatureSiblings, "no-restricted-syntax").some((message) => message.text.includes("not a host feature")),
  );
});

test("features and widgets may compose installed component items", async () => {
  const sources = {
    [LOGIN_PAGE]:
      'import { SeverityBadge } from "@/components/notification-presentation";\nexport const value = SeverityBadge;',
    [NOTIFICATION_WIDGET]:
      'import { SeverityBadge } from "@/components/notification-presentation";\nexport const value = SeverityBadge;',
  };
  for (const [file, source] of Object.entries(sources)) {
    const messages = await lintFixture({ [file]: source }, INSTALLED_ITEMS);
    assert.deepEqual(errors(messages), [], `${file} must be able to import an installed component item`);
  }
});

test("component payloads compose neither features nor widgets and not host components", async () => {
  const hostComponent = await lintFixture(
    { [PRESENTATION_COMPONENT]: 'import { helper } from "@/components/host-widget";\nexport const value = helper;' },
    INSTALLED_ITEMS,
  );
  assert.ok(errors(hostComponent, "no-restricted-imports").length >= 1);

  const feature = await lintFixture(
    { [PRESENTATION_COMPONENT]: 'import { LoginPage } from "@/features/login-page";\nexport const value = LoginPage;' },
    INSTALLED_ITEMS,
  );
  assert.ok(errors(feature, "no-restricted-imports").length >= 1);

  const dynamicFeature = await lintFixture(
    { [PRESENTATION_COMPONENT]: 'export const load = () => import("@/features/login-page");' },
    INSTALLED_ITEMS,
  );
  assert.ok(errors(dynamicFeature, "no-restricted-syntax").length >= 1);

  const widget = await lintFixture(
    { [PRESENTATION_COMPONENT]: 'import { Copilot } from "@/widgets/copilot";\nexport const value = Copilot;' },
    INSTALLED_ITEMS,
  );
  assert.ok(errors(widget, "no-restricted-imports").some((message) => message.text.includes("never the reverse")));

  // Another installed component payload, the framework primitives and
  // @/lib/utils stay reachable.
  const allowed = await lintFixture(
    {
      [PRESENTATION_COMPONENT]: `
      import { Button } from "@/components/ui/button";
      import { cn } from "@/lib/utils";
      import { SeverityBadge } from "./severity-badge";
      export const value = [Button, cn, SeverityBadge];
    `,
    },
    INSTALLED_ITEMS,
  );
  assert.deepEqual(errors(allowed), []);
});

test("relative imports into installed component payloads stay inside the boundary", async () => {
  const installed = await lintFixture(
    {
      "src/features/shop/shop.tsx":
        'import { badge } from "../../components/notification-presentation/index";\nexport const page = badge;',
    },
    [...INSTALLED_ITEMS, "src/features/shop/shop.tsx"],
  );
  assert.deepEqual(errors(installed, "module-boundary/relative-item-boundary"), []);

  const hostComponent = await lintFixture(
    {
      "src/features/shop/shop.tsx":
        'import { dock } from "../../components/host-widget/dock";\nexport const page = dock;',
    },
    [...INSTALLED_ITEMS, "src/features/shop/shop.tsx"],
  );
  assert.ok(
    errors(hostComponent, "module-boundary/relative-item-boundary").some((message) =>
      message.text.includes("not a host file"),
    ),
  );
});

test("R87-03 resolves relative imports before applying the boundary", async () => {
  // A relative path names the same layer without naming it: the alias rules
  // never see it, so the boundary must be judged on the resolved target.
  const messages = await lintFixture(
    {
      "src/features/shop/shop.tsx": 'import { dock } from "../../widgets/copilot/copilot";\nexport const page = dock;',
      "src/widgets/copilot/copilot.tsx": 'import { page } from "../../features/shop/shop";\nexport const dock = page;',
    },
    ["src/features/shop/shop.tsx", "src/widgets/copilot/copilot.tsx"],
  );
  const violations = errors(messages, "module-boundary/relative-item-boundary");
  assert.equal(violations.length, 1);
  assert.equal(violations[0].file, "src/features/shop/shop.tsx");
  assert.ok(violations[0].text.includes("never the reverse"));

  const hostReach = await lintFixture(
    { "src/features/shop/shop.tsx": "import { label } from '../../app/labels';\nexport const page = label;" },
    ["src/features/shop/shop.tsx"],
  );
  assert.ok(
    errors(hostReach, "module-boundary/relative-item-boundary").some((message) =>
      message.text.includes("not a host file"),
    ),
  );

  const inside = await lintFixture(
    { "src/features/shop/shop.tsx": 'import { t } from "./labels";\nexport const page = t;' },
    ["src/features/shop/shop.tsx"],
  );
  assert.deepEqual(errors(inside, "module-boundary/relative-item-boundary"), []);
});

test("framework-owned primitives stay outside the host gates", async () => {
  const messages = await lintFixture({
    "src/components/ui/legacy.tsx":
      'export function Legacy() { return <div className="bg-red-500 rounded-xl">Close</div>; }',
  });
  assert.deepEqual(errors(messages), []);
});
