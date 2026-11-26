/**
 * Shared error handling for every SSE (fetch + ReadableStream) endpoint.
 *
 * They all fail through the same newbie error envelope on non-200 responses
 * and surface a user-initiated abort the same way, so the mapping and the abort
 * guard live once here instead of being copy-pasted per host (devbie ADR-080
 * D2).
 */

/** Base class for non-200 failures from an SSE endpoint. */
export class StreamError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "StreamError";
  }
}

interface NewbieErrorEnvelope {
  error?: {
    message?: string;
    info?: { code?: string };
  };
  message?: string;
}

/**
 * Map a non-200 fetch Response onto a StreamError, parsing the newbie
 * `{ error: { message, info: { code } } }` envelope when present. The fallback
 * message is endpoint-specific (e.g. "Analysis chat failed with status 401").
 */
export async function toStreamError(
  response: Response,
  fallbackMessage: (status: number) => string,
): Promise<StreamError> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON error body (proxy/gateway); fall through to status defaults.
  }
  const envelope = payload as NewbieErrorEnvelope | null | undefined;
  const info = envelope?.error?.info;
  return new StreamError(
    response.status,
    info?.code ?? (response.status === 401 ? "unauthorized" : "stream_failed"),
    envelope?.error?.message ?? envelope?.message ?? fallbackMessage(response.status),
    info,
  );
}

/**
 * The shared SSE decoder resolves (instead of rejecting) when the reader is
 * cancelled by an abort signal, so callers must re-raise the abort after the
 * stream is consumed to distinguish "user stopped" from "natural completion".
 */
export function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DOMException("The user aborted the request.", "AbortError");
  }
}
