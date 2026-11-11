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
- Keep host Next.js config in `next.config.ts` by passing it to `withFewbie()`; framework defaults (host-overridable) and invariants (not overridable) live in `next.config.framework.ts`.
- Keep host entries outside the `fewbie:framework` blocks: project instructions here, host variables in `.env.example`, host ignores in `.prettierignore`.
- Remember that `NEXT_PUBLIC_*` variables are inlined at build time; set them before `npm run build`.
- Pull skeleton updates with `npx fewbie template update`, then review with `git diff`.
- Verify changes with `npm run lint` and `npm run build`.

### Don't

- Never edit framework-synced files: `next.config.framework.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `components.json`, `src/instrumentation.ts`, `src/lib/utils.ts`. Propose skeleton changes in the [fewbie-starter](https://github.com/worldzhy/fewbie-starter) template instead.
- Never edit inside a `fewbie:framework` block (`src/app/globals.css`, `.env.example`, `.prettierignore`, this file); `template update` replaces the block wholesale.

<!-- fewbie:framework:end -->

<!-- Project-specific agent instructions go below; template update never rewrites this area. -->

## Workflow conventions (see `user_profile.md` for full text)

- Git branch: dev, never main
- Pre-commit gate: `npm run format:check` must pass; never bare `git add -A`
- This repo is a starter template, not an npm publisher; skeleton updates via `fewbie template update`
- `NEXT_PUBLIC_*` vars are inlined at build time — set before `npm run build`

## Env facts

Executable operation manuals live in devbie `.trae/documents/environment-runbook.md`. Read that file before any Shell call.

## Backlog convention

Unfinished engineering tasks live in the backlog file under .trae/documents (backlog.md). At session end, append leftover tasks there; at session start, check it for pending work. Delete items when done.
