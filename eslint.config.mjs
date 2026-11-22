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
 * rule set. R1/R5/R9/R10/R12 are scripts (see `scripts/`); the rules below are
 * the ones ESLint can express directly.
 *
 * File scopes are deliberate: `src/components/ui/**` are upstream primitives
 * and stay outside the gates, while `src/framework/**` is the reference
 * implementation host code copies, so it follows the same R3/R6 token and
 * scale contract. Copy-level rules (R2/R7/R11) remain host-only, because the
 * shared state components and their labels are what host code is told to reuse.
 */
const HOST_CODE = [
  "src/app/**/*.{ts,tsx}",
  "src/features/**/*.{ts,tsx}",
  "src/widgets/**/*.{ts,tsx}",
  "src/components/**/*.{ts,tsx}",
];
const FRAMEWORK_CODE = ["src/framework/**/*.{ts,tsx}"];
// Registry items land in `src/features/**` and `src/widgets/**` (ADR-066) next
// to host code, so item identity comes from the install record instead of a
// directory prefix. The lockfile lists every installed file; a host without one
// has no items.
const LOCKFILE = new URL("./fewbie.lock.json", import.meta.url);
const FEATURE_PREFIX = "src/features/";
const WIDGET_PREFIX = "src/widgets/";
const MODULE_BOUNDARY_MESSAGE =
  "A registry item may import React, @/components/ui/*, @/lib/utils, its own files and the sibling items installed " +
  "next to it; host i18n, router, transport, toast and state belong in the host adapter (module boundary).";

/**
 * Files the lockfile records as installed items: `registry:feature` slices under
 * `src/features/**` and `registry:widget` compositions under `src/widgets/**`.
 * `registry:component` and `registry:lib` items keep living in
 * `src/components/**` and `src/lib/**` and stay under the host rules, because
 * they are shared payloads by design. Copy-assembled items may only depend on
 * the framework surface and other installed items, so transport, i18n, router,
 * toast and state libraries stay in the host adapter that renders them
 * (ADR-057, ADR-062, ADR-065, ADR-066).
 */
function installedModuleFiles() {
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
  return Object.values(modules).flatMap((module) => {
    if (module === null || typeof module !== "object" || Array.isArray(module)) {
      throw new Error("fewbie.lock.json is malformed: every module entry must be an object.");
    }
    const files = module.files ?? {};
    if (files === null || typeof files !== "object" || Array.isArray(files)) {
      throw new Error("fewbie.lock.json is malformed: every module `files` must be an object.");
    }
    return Object.keys(files).filter((file) => file.startsWith(FEATURE_PREFIX) || file.startsWith(WIDGET_PREFIX));
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

export function createFrameworkLintConfig(moduleFiles) {
  return [
    {
      files: HOST_CODE,
      ignores: [...moduleFiles, "src/components/ui/**"],
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
            selector: 'ImportDeclaration[source.value="@/components/ui/skeleton"]',
            message: "Use LoadingState from @/framework/states instead of the bare Skeleton primitive (R2).",
          },
          {
            selector: 'JSXOpeningElement[name.name="Loader2"]',
            message: "Use LoadingState from @/framework/states instead of a page-local spinner (R2).",
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
      ignores: [...moduleFiles, "src/components/ui/**"],
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
    ...moduleBoundaryConfig(moduleFiles),
  ];
}

/**
 * `no-restricted-imports` compares the specifier text, so a relative path
 * reaches a banned layer without naming it (`../../widgets/copilot`). This rule
 * resolves the specifier against the importing file and applies the same
 * boundary (R87-03).
 */
const moduleBoundaryPlugin = {
  rules: {
    "relative-item-boundary": {
      meta: {
        type: "problem",
        schema: [
          {
            type: "object",
            properties: {
              allowedRoots: { type: "array", items: { type: "string" } },
              forbidWidgets: { type: "boolean" },
            },
            required: ["allowedRoots"],
            additionalProperties: false,
          },
        ],
        messages: {
          widget: `${MODULE_BOUNDARY_MESSAGE} Widgets compose features, never the reverse.`,
          outside: `${MODULE_BOUNDARY_MESSAGE} Import another installed item, not a host file.`,
        },
      },
      create(context) {
        const [{ allowedRoots, forbidWidgets }] = context.options;
        const projectRoot = context.cwd ?? process.cwd();
        // ESLint may hand the rule a cwd-relative filename; resolving it against
        // the project root keeps the comparison on one basis.
        const filename = path.isAbsolute(context.filename)
          ? context.filename
          : path.join(projectRoot, context.filename);
        const fileDirectory = path.dirname(filename);
        const widgetRoot = path.join(projectRoot, WIDGET_PREFIX);
        const roots = allowedRoots.map((root) => path.join(projectRoot, root));
        const within = (target, root) =>
          target === root || target.startsWith(root.endsWith(path.sep) ? root : root + path.sep);
        const check = (node) => {
          const specifier = node.source?.value;
          if (typeof specifier !== "string" || !specifier.startsWith(".")) return;
          const target = path.resolve(fileDirectory, specifier);
          if (forbidWidgets && within(target, widgetRoot)) {
            context.report({ node, messageId: "widget" });
            return;
          }
          if (!roots.some((root) => within(target, root))) context.report({ node, messageId: "outside" });
        };
        return { ImportDeclaration: check, ImportExpression: check };
      },
    },
  },
};

/**
 * Module boundary (ADR-057, ADR-065, ADR-066): a registry item is copied into
 * the host as-is, so it must compile against the framework surface plus the
 * other installed items alone. Features and widgets are separate layers: a
 * widget may compose installed features and widgets, a feature never reaches
 * into `@/widgets/**`.
 */
function moduleBoundaryConfig(moduleFiles) {
  if (moduleFiles.length === 0) return [];

  const featureFiles = moduleFiles.filter((file) => file.startsWith(FEATURE_PREFIX));
  const widgetFiles = moduleFiles.filter((file) => file.startsWith(WIDGET_PREFIX));
  const siblingsOf = (files, prefix) => [...new Set(files.map((file) => file.slice(prefix.length).split("/")[0]))];

  const featureSiblings = siblingsOf(featureFiles, FEATURE_PREFIX);
  const widgetSiblings = siblingsOf(widgetFiles, WIDGET_PREFIX);

  const blocks = [];
  if (featureFiles.length > 0) {
    blocks.push(moduleBoundaryBlock(featureFiles, { featureSiblings, widgetSiblings, forbidWidgets: true }));
  }
  if (widgetFiles.length > 0) {
    blocks.push(moduleBoundaryBlock(widgetFiles, { featureSiblings, widgetSiblings, forbidWidgets: false }));
  }
  return blocks;
}

/**
 * A registry item may import another installed item, but never the host's own
 * slice that happens to sit in the same tree. With no installed sibling in that
 * layer, every import from it is a host import.
 */
function hostItemImport(prefix, siblings) {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (siblings.length === 0) return new RegExp(`^${escaped}/`);
  return new RegExp(`^${escaped}/(?!(?:${siblings.map(escapeRegExp).join("|")})(?:/|$))`);
}

function moduleBoundaryBlock(files, { featureSiblings, widgetSiblings, forbidWidgets }) {
  const hostFeatureImport = hostItemImport("@/features", featureSiblings);
  const hostWidgetImport = hostItemImport("@/widgets", widgetSiblings);
  const patterns = [
    {
      group: ["next", "next/*", "next-intl", "next-intl/*"],
      message: `${MODULE_BOUNDARY_MESSAGE} Receive navigation and copy through props.`,
    },
    {
      group: ["axios", "@tanstack/*", "swr", "sonner", "@radix-ui/*"],
      message: `${MODULE_BOUNDARY_MESSAGE} Receive data and notifications through ports.`,
    },
    {
      group: ["@/app/*", "@/framework/*", "@/api", "@/api/*", "@/i18n/*"],
      message: MODULE_BOUNDARY_MESSAGE,
    },
    { group: ["@/components/*", "!@/components/ui"], message: MODULE_BOUNDARY_MESSAGE },
    { group: ["@/lib/*", "!@/lib/utils"], message: MODULE_BOUNDARY_MESSAGE },
  ];
  if (forbidWidgets) {
    patterns.push({
      group: ["@/widgets/*"],
      message: `${MODULE_BOUNDARY_MESSAGE} Widgets compose features, never the reverse.`,
    });
  }

  const syntax = [
    {
      selector: `ImportDeclaration[source.value=/${hostFeatureImport.source}/]`,
      message: `${MODULE_BOUNDARY_MESSAGE} Import another installed item, not a host feature.`,
    },
    {
      selector: `ImportExpression[source.value=/${hostFeatureImport.source}/]`,
      message: `${MODULE_BOUNDARY_MESSAGE} Import another installed item, not a host feature.`,
    },
    {
      selector: 'CallExpression[callee.object.name=/^(?:window|globalThis|self)$/][callee.property.name="fetch"]',
      message: `${MODULE_BOUNDARY_MESSAGE} Receive data through a port prop instead.`,
    },
    {
      selector: "ImportExpression[source.value=/^(?:axios|next\\/.*|next-intl.*|sonner|swr|@tanstack\\/.*)$/]",
      message: MODULE_BOUNDARY_MESSAGE,
    },
  ];
  if (!forbidWidgets) {
    syntax.push(
      {
        selector: `ImportDeclaration[source.value=/${hostWidgetImport.source}/]`,
        message: `${MODULE_BOUNDARY_MESSAGE} Import another installed widget, not a host widget.`,
      },
      {
        selector: `ImportExpression[source.value=/${hostWidgetImport.source}/]`,
        message: `${MODULE_BOUNDARY_MESSAGE} Import another installed widget, not a host widget.`,
      },
    );
  } else {
    // no-restricted-imports does not see dynamic imports, and the direction rule
    // bans every widget import, not just host ones.
    syntax.push({
      selector: "ImportExpression[source.value=/^@\\/widgets\\//]",
      message: `${MODULE_BOUNDARY_MESSAGE} Widgets compose features, never the reverse.`,
    });
  }

  return {
    files,
    plugins: { "module-boundary": moduleBoundaryPlugin },
    rules: {
      "module-boundary/relative-item-boundary": [
        "error",
        {
          allowedRoots: [
            ...featureSiblings.map((name) => `${FEATURE_PREFIX}${name}`),
            ...widgetSiblings.map((name) => `${WIDGET_PREFIX}${name}`),
            "src/components/ui",
            "src/lib/utils",
          ],
          forbidWidgets,
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: `${MODULE_BOUNDARY_MESSAGE} Receive data through a port prop instead.` },
        { name: "XMLHttpRequest", message: `${MODULE_BOUNDARY_MESSAGE} Receive data through a port prop instead.` },
      ],
      "no-restricted-imports": ["error", { patterns }],
      "no-restricted-syntax": ["error", ...syntax],
      // R7: an item has no i18n of its own; copy arrives through labels.
      "react/jsx-no-literals": ["error", { allowedStrings: R7_ALLOWED_STRINGS }],
    },
  };
}

export const frameworkLintConfig = createFrameworkLintConfig(installedModuleFiles());

export default [...base, ...next, ...frameworkLintConfig];
