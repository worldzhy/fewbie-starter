import assert from "node:assert/strict";
import test from "node:test";

const LEGACY_KEYS = [
  "access-token",
  "access-token-expires-at",
  "nightwatch-access-token",
  "nightwatch-access-token-expires-at",
];

test("session state is in memory and ends exactly once per session", async () => {
  const removed: string[] = [];
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      removeItem: (key: string) => {
        removed.push(key);
      },
    },
  };

  const session = await import("../../lib/api-client/session-store");

  session.setSession("token-1", 120);
  assert.equal(session.getAccessToken(), "token-1");
  assert.ok(session.getAccessTokenExpiresAt() > Date.now());
  // The retired localStorage keys are scrubbed, never written back.
  assert.deepEqual(removed.sort(), [...LEGACY_KEYS].sort());

  let cleared = 0;
  session.onSessionCleared(() => {
    cleared += 1;
  });
  const epoch = session.getSessionEpoch();
  session.clearSession();
  assert.equal(session.getAccessToken(), "");
  assert.equal(session.getSessionEpoch(), epoch + 1);
  assert.equal(cleared, 1);

  const ended: string[] = [];
  session.onSessionExpired((reason) => {
    ended.push(reason);
  });
  session.endSession("account-blocked");
  assert.deepEqual(ended, ["account-blocked"]);

  // The notification is latched: a second end must not stack redirects ...
  session.endSession("session-terminated");
  assert.deepEqual(ended, ["account-blocked"]);

  // ... and a new session re-arms it.
  session.setSession("token-2");
  session.endSession("session-terminated");
  assert.deepEqual(ended, ["account-blocked", "session-terminated"]);
});
