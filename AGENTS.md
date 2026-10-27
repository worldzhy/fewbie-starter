<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- fewbie:framework:start -->

## Framework contract (fewbie)

This repository is a [fewbie](https://github.com/worldzhy/devbie) application (Next.js App Router + Tailwind CSS v4 + shadcn/ui). The skeleton is owned by the fewbie CLI; follow this contract to keep `fewbie template update` green.

### Do

- Add shadcn/ui primitives with `npx shadcn@latest add <component>`.
- Add business components and logic utils with `npx fewbie modules add <name>`.
- Remember that `NEXT_PUBLIC_*` variables are inlined at build time; set them before `npm run build`.
- Pull skeleton updates with `npx fewbie template update`, then review with `git diff`.
- Verify changes with `npm run lint` and `npm run build`.

### Don't

- Never edit framework-synced files: `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `components.json`, `.prettierignore`, `.env.example`, `src/instrumentation.ts`, `src/lib/utils.ts`. Propose skeleton changes in the [fewbie-starter](https://github.com/worldzhy/fewbie-starter) template instead.
- Never edit inside the `fewbie:framework` block of `src/app/globals.css` or of this file.

<!-- fewbie:framework:end -->

<!-- Project-specific agent instructions go below; template update never rewrites this area. -->
