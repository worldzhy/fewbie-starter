/**
 * Host extension point for the framework-owned root layout.
 *
 * `src/app/layout.tsx` is framework-owned (ADR-056 D5) and wraps the tree in
 * this component. A host adds its own providers and widgets here — query
 * client, theme provider, API error toast, monitoring — instead of rewriting
 * the layout. `template update` ships this file once and never rewrites it.
 */
export function HostProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
