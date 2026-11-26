import { readFileSync } from "node:fs";
import path from "node:path";

import base from "@devbie/style-guide/eslint/base";
import next from "@devbie/style-guide/eslint/next";

/**
 * Frontend framework gates (ADR-056 §5 R1-R12).
 *
 * Rules live with the template, not in `@devbie/style-guide`, so a host adopts
 * them together with the framework files they describe: `template update`
 * replaces this file wholesale, and M4 migrates nightwatch against the same
 * rule set. R1/R5/R9/R10 are scripts (see `scripts/`); the rules below are
 * the ones ESLint can express directly.
 *
 * File scopes are deliberate: `src/fewbie/ui/**` are upstream primitives and
 * stay outside the gates, while `src/fewbie/framework/**` is the reference
 * implementation host code copies, so it follows the same R3/R6 token and scale
 * contract. Copy-level rules (R2/R7/R11) remain host-only, because the shared
 * state components and their labels are what host code is told to reuse.
 */
const HOST_CODE = ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"];
const FRAMEWORK_CODE = ["src/fewbie/framework/**/*.{ts,tsx}"];
// Registry payload is module-first (ADR-070 D1), so both module identity and
// layer come from the path: `src/fewbie/modules/<module>/<layer>/…`. The
// lockfile lists every installed file; a host without one has no modules.
const LOCKFILE = new URL("./fewbie.lock.json", import.meta.url);
const MODULE_PREFIX = "src/fewbie/modules/";
const MODULE_BOUNDARY_MESSAGE =
  "A registry module may import React, @/fewbie/ui/*, @/lib/utils, @/lib/api-client, its own files and the sibling " +
  "modules installed next to it; host i18n, router, transport, toast and state belong in the host adapter (module boundary).";

/**
 * Installed registry modules from the lockfile: payload files plus the npm
 * packages each module declared in `fewbie.module.json: dependencies`.
 *
 * Copy-assembled modules may only depend on the framework surface, other
 * installed modules and the packages they declare, so transport, i18n, router,
 * toast and state libraries stay in the host adapter that renders them
 * (ADR-057, ADR-062, ADR-069, ADR-070). Declared packages are the exception
 * (devbie ADR-079 D4/D5): a module that ships `useQuery` declares
 * `@tanstack/react-query`, and the host lint reads that declaration here
 * instead of banning the package wholesale.
 */
function installedModules() {
  let lockfile;
  try {
    lockfile = JSON.parse(readFileSync(LOCKFILE, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const modules = lockfile.modules;
  if (modules === undefined) return [];
  // A malformed lockfile used to yield zero boundary rules and pass silently,
  // which is the same as skipping the gate (R87-19).
  if (modules === null || typeof modules !== "object" || Array.isArray(modules)) {
    throw new Error("fewbie.lock.json is malformed: `modules` must be an object. Run `npx fewbie modules update`.");
  }
  return Object.entries(modules).map(([name, module]) => {
    if (module === null || typeof module !== "object" || Array.isArray(module)) {
      throw new Error("fewbie.lock.json is malformed: every module entry must be an object.");
    }
    const files = module.files ?? {};
    if (files === null || typeof files !== "object" || Array.isArray(files)) {
      throw new Error("fewbie.lock.json is malformed: every module `files` must be an object.");
    }
    const dependencies = module.dependencies ?? [];
    if (!Array.isArray(dependencies) || dependencies.some((entry) => typeof entry !== "string")) {
      throw new Error(
        "fewbie.lock.json is malformed: every module `dependencies` must be an array of package names. " +
          "Run `npx fewbie modules update`.",
      );
    }
    return {
      name,
      files: Object.keys(files).filter((file) => file.startsWith(MODULE_PREFIX)),
      dependencies,
    };
  });
}

/** Files the lockfile records as installed modules, across every module. */
function installedModuleFiles(modules) {
  return modules.flatMap((module) => module.files);
}

/**
 * Module descriptor from a lockfile entry or a bare file path (test fixtures).
 * Dependency entries may carry a version range, so they are reduced to names.
 */
function normalizeModule(entry) {
  const descriptor =
    typeof entry === "string"
      ? { name: entry.split("/")[3] ?? "", files: [entry], dependencies: [] }
      : { ...entry, dependencies: entry.dependencies ?? [] };
  return { ...descriptor, dependencies: descriptor.dependencies.map(dependencyName) };
}

/**
 * npm package a bare import specifier resolves to; null for relative and
 * `@/`-aliased imports, which other rules decide.
 */
function importedPackage(specifier) {
  if (specifier.startsWith(".") || specifier.startsWith("@/")) return null;
  return specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0];
}

/** Package name of a lockfile dependency entry (`name` or `name@range`). */
function dependencyName(entry) {
  const separator = entry.indexOf("@", entry.startsWith("@") ? 1 : 0);
  return separator <= 0 ? entry : entry.slice(0, separator);
}

/**
 * Packages any module may import: React itself and the icon set the template
 * ships, so the boundary gate does not force a manifest entry for them.
 */
const MODULE_FRAMEWORK_PACKAGES = ["react", "react-dom", "lucide-react"];

/** Host-only packages a module never imports; the adapter passes them in (ADR-079 D4). */
function isHostOnlyPackage(name) {
  return (
    name === "next" ||
    name === "next-intl" ||
    name === "axios" ||
    name === "sonner" ||
    name === "swr" ||
    name.startsWith("@radix-ui/")
  );
}

/** Layers a module at `layer` may import from any installed module (ADR-069 D4). */
const LAYER_IMPORTS = {
  features: ["features", "components", "lib"],
  widgets: ["features", "widgets", "components", "lib"],
  components: ["components", "lib"],
  lib: ["components", "lib"],
};

const COLOR_UTILITY = "bg|text|border|ring|from|to|via|fill|stroke|divide|outline|shadow|decoration|caret|accent";
const PALETTE_CLASS =
  /\b(?:bg|text|border|ring|from|to|via|fill|stroke|divide|outline|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|[1-9]00|950)\b|\b(?:bg|text|border|ring|fill|stroke)-(?:black|white)\b/;
// R3: an arbitrary value is not a semantic token when it embeds a color literal
// (`bg-[#ff0000]`). `var(--…)` and gradients over tokens stay allowed.
const ARBITRARY_COLOR = new RegExp(
  String.raw`\b(?:${COLOR_UTILITY})-\[[^\]]*(?:#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(|oklch?\(|oklab\(|lab\(|lch\()`,
);
// R3: a numeric shade on a palette Tailwind does not define (`bg-night-900`)
// is a hand-rolled palette; semantic tokens carry no numeric scale.
const UNKNOWN_PALETTE = new RegExp(
  String.raw`\b(?:${COLOR_UTILITY})-(?!(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-)[a-z][a-z0-9]*(?:-[a-z0-9]+)*-(?:50|[1-9]00|950)\b`,
);
const OFF_SCALE_SPACING =
  /(?:^|[\s"'`])(?:rounded-(?:xl|2xl|3xl|\[)|(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y|h|w|size|z)-\[)/;
const LOADING_BRANCH = /(?:isLoading|loading|isPending|isFetching|isSubmitting|isSaving|isDeleting|isUpdating)$/;
// Punctuation that carries no translation; shared by the host and framework
// scopes so the two R7 rule sets cannot drift.
const R7_ALLOWED_STRINGS = ["·", "—", "–", "/", ":"];

const PALETTE_MESSAGE =
  "Use a semantic token (bg-primary, text-muted-foreground, ...) or chart-palette instead of a raw Tailwind palette class (R3).";

function paletteSyntax(source) {
  return [
    { selector: `Literal[value=/${source}/]`, message: PALETTE_MESSAGE },
    { selector: `TemplateElement[value.raw=/${source}/]`, message: PALETTE_MESSAGE },
  ];
}

const PALETTE_SYNTAX = [
  ...paletteSyntax(PALETTE_CLASS.source),
  ...paletteSyntax(ARBITRARY_COLOR.source),
  ...paletteSyntax(UNKNOWN_PALETTE.source),
];

// Colors set through inline styles bypass the className scan entirely (R1-15).
const STYLE_COLOR = /^(?:#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\()/;
const STYLE_COLOR_PROPERTY = /^(?:color|background|backgroundColor|borderColor|fill|stroke)$/;

const STYLE_COLOR_SYNTAX = [
  {
    selector: `JSXAttribute[name.name="style"] Property[key.name=/${STYLE_COLOR_PROPERTY.source}/] > Literal[value=/${STYLE_COLOR.source}/]`,
    message: "Use a semantic token (var(--primary), ...) instead of a hard-coded color in an inline style (R3).",
  },
  {
    selector: `JSXAttribute[name.name="style"] Property[key.name=/${STYLE_COLOR_PROPERTY.source}/] TemplateLiteral > TemplateElement[value.raw=/${STYLE_COLOR.source}/]`,
    message: "Use a semantic token (var(--primary), ...) instead of a hard-coded color in an inline style (R3).",
  },
];

const OFF_SCALE_SYNTAX = [
  {
    selector: `Literal[value=/${OFF_SCALE_SPACING.source}/]`,
    message: "Use the design radius (rounded-md/rounded-lg) and spacing scale instead of an off-scale value (R6).",
  },
  {
    selector: `TemplateElement[value.raw=/${OFF_SCALE_SPACING.source}/]`,
    message: "Use the design radius (rounded-md/rounded-lg) and spacing scale instead of an off-scale value (R6).",
  },
];

export function createFrameworkLintConfig(installed = []) {
  const modules = installed.map(normalizeModule);
  const moduleFiles = installedModuleFiles(modules);
  return [
    {
      files: HOST_CODE,
      ignores: moduleFiles,
      rules: {
        // R4: transport goes through @/api or lib/api-client.
        "no-restricted-globals": [
          "error",
          {
            name: "fetch",
            message: "Call the generated @/api client (or lib/api-client) instead of global fetch (R4).",
          },
          {
            name: "XMLHttpRequest",
            message: "Call the generated @/api client (or lib/api-client) instead of XMLHttpRequest (R4).",
          },
        ],
        "no-restricted-imports": [
          "error",
          {
            paths: [
              {
                name: "axios",
                message: "Import the shared client from @/lib/api-client instead of axios (R4).",
              },
            ],
          },
        ],
        "no-restricted-syntax": [
          "error",
          // R3: data colors come from chart-palette, UI colors from semantic tokens.
          // R6: radius and spacing only from the design scale.
          ...PALETTE_SYNTAX,
          ...STYLE_COLOR_SYNTAX,
          ...OFF_SCALE_SYNTAX,
          // R2: loading surfaces come from the shared state components.
          {
            selector: `ConditionalExpression[test.name=/${LOADING_BRANCH.source}/]`,
            message: "Render LoadingState/ErrorState/EmptyState instead of branching to inline state markup (R2).",
          },
          {
            selector: `LogicalExpression[left.name=/${LOADING_BRANCH.source}/]`,
            message: "Render LoadingState/ErrorState/EmptyState instead of branching to inline state markup (R2).",
          },
          {
            selector: 'ImportDeclaration[source.value="@/fewbie/ui/skeleton"]',
            message: "Use LoadingState from @/fewbie/framework/states instead of the bare Skeleton primitive (R2).",
          },
          {
            selector: 'JSXOpeningElement[name.name="Loader2"]',
            message: "Use LoadingState from @/fewbie/framework/states instead of a page-local spinner (R2).",
          },
          // R4: one HTTP client. The global ban misses member calls and the import
          // ban misses a dynamic import.
          {
            selector: 'CallExpression[callee.object.name=/^(?:window|globalThis|self)$/][callee.property.name="fetch"]',
            message: "Call the generated @/api client (or lib/api-client) instead of fetch (R4).",
          },
          {
            selector: 'ImportExpression[source.value="axios"]',
            message: "Import the shared client from @/lib/api-client instead of axios (R4).",
          },
          // R11: query keys are domain constants, not inline literals.
          {
            selector: 'Property[key.name="queryKey"] > ArrayExpression > Literal:first-child',
            message: "Export a domain query-key constant instead of an inline string literal (R11).",
          },
          {
            selector: 'Property[key.name="queryKey"] > Literal',
            message: "Export a domain query-key constant instead of an inline string literal (R11).",
          },
          {
            selector: 'Property[key.name="queryKey"] TemplateLiteral',
            message: "Export a domain query-key constant instead of an inline template literal (R11).",
          },
        ],
      },
    },
    {
      files: HOST_CODE,
      ignores: moduleFiles,
      rules: {
        // R7: display copy lives in the host i18n message files.
        "react/jsx-no-literals": ["error", { allowedStrings: R7_ALLOWED_STRINGS }],
      },
    },
    {
      // R3/R6/R7 for the framework runtime: these files are the reference host
      // code copies, so they must pass the same token, scale and copy gates.
      files: FRAMEWORK_CODE,
      rules: {
        "no-restricted-syntax": ["error", ...PALETTE_SYNTAX, ...STYLE_COLOR_SYNTAX, ...OFF_SCALE_SYNTAX],
        "react/jsx-no-literals": ["error", { allowedStrings: R7_ALLOWED_STRINGS }],
      },
    },
    ...moduleBoundaryConfig(modules),
  ];
}

/**
 * A copy-assembled module is copied into the host as-is, so it must compile
 * against the framework surface plus the other installed modules alone. Module
 * and layer both come from the file path (ADR-070 D1/D2), and the layer decides
 * which layers it may import: a widget may compose features and widgets, a
 * feature never reaches into a widget, and `components`/`lib` compose neither.
 * The rule also sees relative and dynamic imports, which `no-restricted-imports`
 * cannot compare by specifier text (R87-03).
 */
const moduleBoundaryPlugin = {
  rules: {
    packages: {
      meta: {
        type: "problem",
        schema: [
          {
            type: "object",
            properties: { dependencies: { type: "array", items: { type: "string" } } },
            required: ["dependencies"],
            additionalProperties: false,
          },
        ],
        messages: {
          undeclared: `${MODULE_BOUNDARY_MESSAGE} "{{name}}" is not declared: add it to dependencies in fewbie.module.json.`,
        },
      },
      create(context) {
        const [{ dependencies }] = context.options;
        const declared = new Set(dependencies);
        const check = (node) => {
          const specifier = node.source?.value;
          if (typeof specifier !== "string") return;
          const name = importedPackage(specifier);
          // Host-only packages are reported by no-restricted-imports; relative
          // and aliased imports are judged by the layers rule.
          if (!name || isHostOnlyPackage(name)) return;
          if (MODULE_FRAMEWORK_PACKAGES.includes(name) || declared.has(name)) return;
          context.report({ node, messageId: "undeclared", data: { name } });
        };
        return { ImportDeclaration: check, ImportExpression: check };
      },
    },
    layers: {
      meta: {
        type: "problem",
        schema: [
          {
            type: "object",
            properties: { modules: { type: "array", items: { type: "string" } } },
            required: ["modules"],
            additionalProperties: false,
          },
        ],
        messages: {
          widget: `${MODULE_BOUNDARY_MESSAGE} Widgets compose features, never the reverse.`,
          direction: `${MODULE_BOUNDARY_MESSAGE} A shared layer composes no feature; pass data in through props.`,
          unknown: `${MODULE_BOUNDARY_MESSAGE} Import another installed module, not a host file.`,
          host: `${MODULE_BOUNDARY_MESSAGE} Import another installed module, not a host file.`,
        },
      },
      create(context) {
        const [{ modules }] = context.options;
        const installed = new Set(modules);
        const projectRoot = context.cwd ?? process.cwd();
        const filename = path.isAbsolute(context.filename)
          ? context.filename
          : path.join(projectRoot, context.filename);
        const segments = path.relative(projectRoot, filename).split(path.sep);
        const ownModule = segments[3];
        const ownLayer = segments[4];
        const allowed = LAYER_IMPORTS[ownLayer] ?? [];

        const report = (node, layer) => {
          const messageId = layer === "widgets" ? "widget" : "direction";
          context.report({ node, messageId });
        };
        const checkLayer = (node, module, layer) => {
          if (!installed.has(module)) {
            context.report({ node, messageId: "unknown" });
            return;
          }
          if (!allowed.includes(layer)) report(node, layer);
        };
        const check = (node) => {
          const specifier = node.source?.value;
          if (typeof specifier !== "string") return;
          if (specifier.startsWith("@/fewbie/modules/")) {
            const [, , , module, layer] = specifier.split("/");
            checkLayer(node, module, layer);
            return;
          }
          if (!specifier.startsWith(".")) return;
          const target = path.resolve(path.dirname(filename), specifier);
          const relative = path.relative(projectRoot, target).split(path.sep).join("/");
          // Relative imports stay inside the module or reach the framework surface.
          if (relative.startsWith("src/fewbie/") && !relative.startsWith(MODULE_PREFIX)) return;
          if (!relative.startsWith(`${MODULE_PREFIX}${ownModule}/`)) {
            context.report({ node, messageId: "host" });
            return;
          }
          const layer = relative.split("/")[4];
          if (!allowed.includes(layer)) report(node, layer);
        };
        return { ImportDeclaration: check, ImportExpression: check };
      },
    },
  },
};

function moduleBoundaryConfig(installed) {
  const modules = installed.filter((module) => module.files.length > 0);
  if (modules.length === 0) return [];

  const installedNames = modules.map((module) => module.name);
  return modules.map((module) => ({
    files: module.files,
    plugins: { "module-boundary": moduleBoundaryPlugin },
    rules: {
      "module-boundary/layers": ["error", { modules: installedNames }],
      // ADR-079 D4/D5: declared npm packages are importable; anything else
      // that is not an import must still be declared in the manifest.
      "module-boundary/packages": ["error", { dependencies: module.dependencies }],
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: `${MODULE_BOUNDARY_MESSAGE} Receive data through a port prop instead.` },
        { name: "XMLHttpRequest", message: `${MODULE_BOUNDARY_MESSAGE} Receive data through a port prop instead.` },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next", "next/*", "next-intl", "next-intl/*"],
              message: `${MODULE_BOUNDARY_MESSAGE} Receive navigation and copy through props.`,
            },
            {
              // Host-only packages stay banned; `@tanstack/*` moved to the
              // declared-dependency rule so a module may ship its own queries.
              group: ["axios", "swr", "sonner", "@radix-ui/*"],
              message: `${MODULE_BOUNDARY_MESSAGE} Receive data and notifications through ports.`,
            },
            {
              group: [
                "@/app/*",
                "@/api",
                "@/api/*",
                "@/i18n/*",
                "@/hooks/*",
                "@/store/*",
                "@/types/*",
                "@/components/*",
                "@/lib/*",
                "!@/lib/utils",
                "!@/lib/api-client",
                "!@/lib/api-client/*",
              ],
              message: MODULE_BOUNDARY_MESSAGE,
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportExpression[source.value=/^(?:axios|next\\/.*|next-intl.*|sonner|swr)$/]",
          message: MODULE_BOUNDARY_MESSAGE,
        },
        {
          selector: 'CallExpression[callee.object.name=/^(?:window|globalThis|self)$/][callee.property.name="fetch"]',
          message: `${MODULE_BOUNDARY_MESSAGE} Receive data through a port prop instead.`,
        },
      ],
      // R7: a module has no i18n of its own; copy arrives through labels.
      "react/jsx-no-literals": ["error", { allowedStrings: R7_ALLOWED_STRINGS }],
    },
  }));
}

export const frameworkLintConfig = createFrameworkLintConfig(installedModules());

export default [...base, ...next, ...frameworkLintConfig];
