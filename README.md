# fewbie basic template

The starter template scaffolded by [`fewbie create`](https://github.com/worldzhy/devbie/tree/dev/packages/fewbie-cli):
Next.js (App Router, TypeScript, Turbopack) + Tailwind CSS v4 + shadcn/ui.

## Scripts

```bash
npm run dev     # start the dev server (Turbopack)
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

## UI components

The template ships a small set of shadcn/ui primitives under
`src/fewbie/ui/` (button, card, input, dialog, ...). Add more with the
official CLI:

```bash
npx shadcn@latest add <component>
```

Standard ui primitives come straight from shadcn/ui; fewbie-specific business
components and logic utils are added with `fewbie modules add <name>` from the
fewbie registry.

## Heartbeat (optional)

`src/instrumentation.ts` reports liveness to the heartbeat server when
both env vars are set (see `.env.example`):

- `HEARTBEAT_ENDPOINT` — full heartbeat report URL (e.g. `https://host/heartbeat/ping`)
- `HEARTBEAT_TOKEN` — installation token (sent as `Authorization: Bearer <token>`; the
  `X-Heartbeat-Token` header remains accepted as a deprecated alias during the SDK migration window)

Without them the hook is a no-op.

## Web monitor (optional, browser side)

The monitor is a registry item, not part of the skeleton. Install it, then mount
the component in your own layout or provider:

```bash
npx fewbie modules add frontend-monitor-sdk
```

`frontend-monitor.tsx` dynamically imports `@devbie/frontend-monitor-sdk` in the
browser (kept out of SSR/Edge) and reports page views, AJAX, resources and errors
when both env vars are set (see `.env.example`):

- `NEXT_PUBLIC_FRONTEND_MONITOR_ENDPOINT` — report endpoint URL
- `NEXT_PUBLIC_FRONTEND_MONITOR_TOKEN` — report token (identifies the application)

`NEXT_PUBLIC_` values are inlined at build time, so set them before
`next build`, not only at runtime. Without both the component is a no-op
(it warns in development only).

## Language switcher

`src/components/locale-switcher.tsx` is a reference control for the
`NEXT_LOCALE` cookie; it is not mounted by the skeleton. Add it to your header
if the host ships more than one locale.
