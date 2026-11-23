import assert from "node:assert/strict";
import test from "node:test";

import axios from "axios";

function installWindow(): void {
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: { removeItem: () => undefined },
  };
}

type MutableDefaults = { adapter?: unknown };

function adapterReturning(data: unknown, delayMs = 0) {
  return async (config: unknown) => {
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    return { data, status: 200, statusText: "OK", headers: {}, config };
  };
}

test("concurrent refreshes share one round-trip", async () => {
  installWindow();
  const session = await import("@/lib/api-client/session-store");
  const exchange = await import("@/lib/api-client/refresh-exchange");

  let calls = 0;
  const defaults = axios.defaults as MutableDefaults;
  const original = defaults.adapter;
  const respond = adapterReturning({ data: { token: "fresh", tokenExpiresInSeconds: 60 } }, 10);
  defaults.adapter = async (config: unknown) => {
    calls += 1;
    return respond(config);
  };

  try {
    const [first, second] = await Promise.all([exchange.refreshAccessToken(), exchange.refreshAccessToken()]);
    // The refresh cookie rotates per call, so two callers in one tab must share
    // the exchange instead of invalidating each other.
    assert.equal(calls, 1);
    assert.equal(first.token, "fresh");
    assert.equal(second.token, "fresh");
    assert.equal(session.getAccessToken(), "fresh");
  } finally {
    defaults.adapter = original;
  }
});

test("a refresh that lands after the session ended does not revive it", async () => {
  installWindow();
  const session = await import("@/lib/api-client/session-store");
  const exchange = await import("@/lib/api-client/refresh-exchange");

  const defaults = axios.defaults as MutableDefaults;
  const original = defaults.adapter;
  defaults.adapter = adapterReturning({ data: { token: "stale" } }, 20);

  try {
    const pending = exchange.refreshAccessToken();
    // The user ends the session while the exchange is in flight; the epoch
    // guard must discard the late response (ADR-055).
    session.clearSession();
    const outcome = await pending;
    assert.equal(outcome.token, null);
    assert.equal(session.getAccessToken(), "");
  } finally {
    defaults.adapter = original;
  }
});
