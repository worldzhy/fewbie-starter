import assert from "node:assert/strict";
import test from "node:test";

import { isAuthPath, isEnvelope, isTrustedApiTarget } from "./protocol";

test("isEnvelope accepts only the newbie envelope shape", () => {
  assert.equal(isEnvelope({ code: 0, data: null }), true);
  assert.equal(isEnvelope({ code: 0, data: { id: 1 } }), true);
  // A domain object carrying only `data` is not an envelope.
  assert.equal(isEnvelope({ data: { id: 1 } }), false);
  assert.equal(isEnvelope([{ code: 0, data: null }]), false);
  assert.equal(isEnvelope(null), false);
  assert.equal(isEnvelope("text"), false);
});

test("isTrustedApiTarget keeps the bearer on our own origin", () => {
  // No NEXT_PUBLIC_BASE_URL in the test environment: the page origin is the
  // trust boundary, which is the reverse-proxied deployment.
  assert.equal(isTrustedApiTarget("/users"), true);
  assert.equal(isTrustedApiTarget("users"), true);
  assert.equal(isTrustedApiTarget("https://evil.example/users"), false);
  assert.equal(isTrustedApiTarget("//evil.example/users"), false);
});

test("isAuthPath resolves an absolute same-origin url to its pathname", () => {
  assert.equal(isAuthPath("/auth/login"), true);
  assert.equal(isAuthPath("/auth/login?redirect=%2F"), true);
  assert.equal(isAuthPath("https://localhost/auth/login"), true);
  assert.equal(isAuthPath("https://localhost/users"), false);
  assert.equal(isAuthPath("/users"), false);
});
