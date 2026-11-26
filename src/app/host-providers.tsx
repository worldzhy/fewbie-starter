/**
 * Host extension point for the framework-owned root layout.
 *
 * `src/app/layout.tsx` is framework-owned (ADR-056 D5) and wraps the tree in
 * this component. A host adds its own providers and widgets here — API error
 * copy, monitoring, feature flags — instead of rewriting the layout.
 * This file is a scaffold asset (ADR-035): `template update` creates it when
 * missing and never rewrites an adopted copy.
 *
 * Already mounted by the layout, so add only what your host needs:
 * ThemeProvider (`useThemePreference`), ConfirmProvider (`useConfirm`),
 * NavigationProgressProvider (`useRouteNavigate`), TooltipProvider and
 * QueryProvider (`useQuery` / `useMutation`, ADR-079 D3).
 *
 * Two things belong here rather than in a copy (devbie ADR-080):
 * - `ApiErrorMessageProvider` around `children`, with a `mapError` that turns
 *   a failed request into localized copy. The framework mounts the only error
 *   subscriber; a second one makes every failure show up twice.
 * - Invalidation outside React goes through `getQueryClient()` from
 *   `@/fewbie/framework/providers/query-provider`; never create another
 *   QueryClient, or the two caches drift apart.
 */
export function HostProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
