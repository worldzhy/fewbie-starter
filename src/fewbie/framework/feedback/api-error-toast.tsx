"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { toast } from "sonner";

import { onError, type ApiError } from "@/lib/api-client";

/** Maps a failed request to the copy the host wants shown; `undefined` falls back to the server message. */
export type ApiErrorMapper = (error: ApiError) => string | undefined;

const ApiErrorMessageContext = createContext<ApiErrorMapper | undefined>(undefined);

/**
 * Resolve the text for one failed request.
 *
 * A host mapping wins; an empty or whitespace-only result falls back to the
 * server message, so a gap in the host's dictionary never hides the failure
 * altogether.
 */
export function resolveApiErrorMessage(error: ApiError, mapError?: ApiErrorMapper): string | undefined {
  const mapped = mapError?.(error)?.trim();
  if (mapped) return mapped;
  const message = error.message.trim();
  return message || undefined;
}

/**
 * Host override point for the default error toast copy (devbie ADR-080 D1).
 *
 * The framework mounts the only subscriber; a host supplies locale-aware text
 * by wrapping `children` in this provider inside `host-providers.tsx`. Mounting
 * a second subscriber in the host shows every failure twice, because the error
 * channel fans out to every subscriber.
 */
export function ApiErrorMessageProvider({
  mapError,
  children,
}: {
  mapError?: ApiErrorMapper;
  children: React.ReactNode;
}) {
  return <ApiErrorMessageContext.Provider value={mapError}>{children}</ApiErrorMessageContext.Provider>;
}

/**
 * Default subscriber for the api-client error channel, mounted once by the
 * framework root layout.
 *
 * The client buffers failed requests until someone subscribes, and drops the
 * oldest after five, so without this component the "default error toast" the
 * client documents never appeared (R82-17). The subscription is created once
 * per mount; the mapper is read through a ref so a host re-render handing over
 * a new function does not churn the subscriber set.
 */
export function ApiErrorToast() {
  const mapError = useContext(ApiErrorMessageContext);
  const mapErrorRef = useRef(mapError);

  useEffect(() => {
    mapErrorRef.current = mapError;
  }, [mapError]);

  useEffect(
    () =>
      onError((error) => {
        const message = resolveApiErrorMessage(error, mapErrorRef.current);
        if (message) toast.error(message);
      }),
    [],
  );
  return null;
}
