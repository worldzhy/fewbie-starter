"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Defaults shared by every host (devbie ADR-079 D3).
 *
 * - `retry: false`: a failed request already reaches the user through the
 *   api-client error channel and the page's ErrorState; retrying would only
 *   repeat the same call and the same notice.
 * - `staleTime` / `gcTime`: the cadence nightwatch already runs, so a page
 *   switched back and forth does not refetch on every mount.
 */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000, gcTime: 5 * 60_000 },
      mutations: { retry: false },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * The QueryClient of the current browser tab (devbie ADR-080 D3).
 *
 * The framework root layout owns the single instance; a non-component helper
 * (an `actions.ts` invalidating a list after a mutation) reads the same cache
 * through this accessor instead of creating a second client. Server calls throw
 * on purpose: a module-level client would be shared by concurrent server
 * renders and leak one request's cache into the next.
 */
export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    throw new Error("getQueryClient() is browser-only; a server render must create its own QueryClient (ADR-080 D3)");
  }
  browserQueryClient ??= createQueryClient();
  return browserQueryClient;
}

/**
 * Query state for browser-side data access, mounted by the framework root
 * layout (ADR-079 D3).
 *
 * The browser takes the tab-wide instance from `getQueryClient()` so a helper
 * outside React and the components inside this provider share one cache; the
 * server creates a fresh client per render so concurrent requests stay
 * isolated. A host needing different defaults changes the framework defaults —
 * nesting a second provider would put the two caches out of sync (ADR-080 D3).
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => (typeof window === "undefined" ? createQueryClient() : getQueryClient()));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
