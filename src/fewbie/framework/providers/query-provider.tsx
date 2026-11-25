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

/**
 * Query state for browser-side data access, mounted by the framework root
 * layout (ADR-079 D3).
 *
 * The client is created lazily per browser tab: a module-level client would be
 * shared by concurrent server renders and leak one request's cache into the
 * next. A host that needs different defaults nests its own provider inside
 * `host-providers.tsx`; the inner one wins for its subtree.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(createQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
