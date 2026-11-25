/**
 * Host extension point for the framework-owned root layout.
 *
 * `src/app/layout.tsx` is framework-owned (ADR-056 D5) and wraps the tree in
 * this component. A host adds its own providers and widgets here — API error
 * toast, monitoring, feature flags — instead of rewriting the layout.
 * This file is a scaffold asset (ADR-035): `template update` creates it when
 * missing and never rewrites an adopted copy.
 *
 * Already mounted by the layout, so add only what your host needs:
 * ThemeProvider (`useThemePreference`), ConfirmProvider (`useConfirm`),
 * NavigationProgressProvider (`useRouteNavigate`), TooltipProvider and
 * QueryProvider (`useQuery` / `useMutation`, ADR-079 D3). Nest your own
 * QueryClientProvider here only to override the framework defaults.
 */
export function HostProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
