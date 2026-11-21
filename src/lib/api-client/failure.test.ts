import assert from "node:assert/strict";
import test from "node:test";

import { ApiError, AUTH_FAILURE_CODES, classifyFailure, isRefreshable } from "./failure";

test("classifyFailure follows the ADR-048 order", () => {
  // 1. No response is a network failure, not a server error.
  assert.equal(classifyFailure(0), "network");
  // 2. A contract code wins over the HTTP status.
  assert.equal(classifyFailure(401, AUTH_FAILURE_CODES.Session_AccessExpired), "access-expired");
  assert.equal(classifyFailure(403, AUTH_FAILURE_CODES.Account_Disabled), "account-blocked");
  // 3–6. Uncoded statuses.
  assert.equal(classifyFailure(500), "server-error");
  assert.equal(classifyFailure(403), "permission-denied");
  assert.equal(classifyFailure(401), "session-terminated");
  assert.equal(classifyFailure(418), "unknown");
});

test("only an expired access token is silently refreshable", () => {
  assert.equal(isRefreshable("access-expired"), true);
  for (const kind of ["network", "account-blocked", "session-terminated", "request-error", "unknown"] as const) {
    assert.equal(isRefreshable(kind), false, kind);
  }
});

test("ApiError normalizes the kind from the status and code", () => {
  const error = new ApiError("expired", 401, undefined, AUTH_FAILURE_CODES.Session_AccessExpired);
  assert.equal(error.kind, "access-expired");
  assert.equal(error.status, 401);
  assert.equal(new ApiError("offline", 0).kind, "network");
});
