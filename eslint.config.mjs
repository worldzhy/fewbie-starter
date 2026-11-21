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
 * File scopes are deliberate: `src/components/ui/**` and `src/framework/**` are
 * framework-owned and already follow the token/radius system, so the gates
 * target host code where divergence appears.
 */
const HOST_CODE = ["src/app/**/*.{ts,tsx}", "src/features/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"];

const PALETTE_CLASS =
  /\b(?:bg|text|border|ring|from|to|via|fill|stroke|divide|outline|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|[1-9]00|950)\b|\b(?:bg|text|border|ring|fill|stroke)-(?:black|white)\b/;
const OFF_SCALE_SPACING =
  /(?:^|[\s"'`])(?:rounded-(?:lg|xl|2xl|3xl)|(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y)-\[)/;
const LOADING_BRANCH = /(?:isLoading|loading|isPending|isFetching)$/;

export const frameworkLintConfig = [
  {
    files: HOST_CODE,
    ignores: ["src/components/ui/**"],
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
        {
          selector: `Literal[value=/${PALETTE_CLASS.source}/]`,
          message:
            "Use a semantic token (bg-primary, text-muted-foreground, ...) or chart-palette instead of a raw Tailwind palette class (R3).",
        },
        {
          selector: `TemplateElement[value.raw=/${PALETTE_CLASS.source}/]`,
          message:
            "Use a semantic token (bg-primary, text-muted-foreground, ...) or chart-palette instead of a raw Tailwind palette class (R3).",
        },
        // R6: radius and spacing only from the design scale.
        {
          selector: `Literal[value=/${OFF_SCALE_SPACING.source}/]`,
          message:
            "Use the design radius (rounded-md/rounded-lg) and spacing scale instead of an off-scale value (R6).",
        },
        {
          selector: `TemplateElement[value.raw=/${OFF_SCALE_SPACING.source}/]`,
          message:
            "Use the design radius (rounded-md/rounded-lg) and spacing scale instead of an off-scale value (R6).",
        },
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
        // R11: query keys are domain constants, not inline literals.
        {
          selector: 'Property[key.name="queryKey"] > ArrayExpression > Literal:first-child',
          message: "Export a domain query-key constant instead of an inline string literal (R11).",
        },
      ],
    },
  },
  {
    files: HOST_CODE,
    ignores: ["src/components/ui/**"],
    rules: {
      // R7: display copy lives in the host i18n message files.
      "react/jsx-no-literals": ["error", { allowedStrings: ["·", "—", "–", "/", ":"] }],
    },
  },
];

export default [...base, ...next, ...frameworkLintConfig];
