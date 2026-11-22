import assert from "node:assert/strict";
import { afterEach, before, mock, test } from "node:test";

/**
 * The instrumentation hook is the starter's liveness/health surface: it starts
 * the heartbeat reporter once the Node runtime boots. The SDK is mocked so the
 * test only observes the wiring, and the env keys are restored after each case.
 */
const calls: Array<{ endpoint: string; token: string }> = [];

mock.module("@devbie/heartbeat-sdk", {
  namedExports: {
    startHeartbeat: (options: { endpoint: string; token: string }) => {
      calls.push(options);
    },
  },
});

type Register = () => Promise<void>;
let register: Register;

before(async () => {
  const namespace = (await import("../../instrumentation")) as unknown as { register: Register };
  register = namespace.register;
});

const ENV_KEYS = ["NEXT_RUNTIME", "HEARTBEAT_ENDPOINT", "HEARTBEAT_TOKEN"] as const;
const saved = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  calls.length = 0;
  for (const key of ENV_KEYS) {
    const value = saved.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("starts the heartbeat when the Node runtime has both variables", async () => {
  process.env.NEXT_RUNTIME = "nodejs";
  process.env.HEARTBEAT_ENDPOINT = "https://heartbeat.example/report";
  process.env.HEARTBEAT_TOKEN = "token-1";

  await register();

  assert.deepEqual(calls, [{ endpoint: "https://heartbeat.example/report", token: "token-1" }]);
});

test("does nothing outside the Node runtime", async () => {
  process.env.NEXT_RUNTIME = "edge";
  process.env.HEARTBEAT_ENDPOINT = "https://heartbeat.example/report";
  process.env.HEARTBEAT_TOKEN = "token-1";

  await register();

  assert.equal(calls.length, 0);
});

test("does nothing without an endpoint", async () => {
  process.env.NEXT_RUNTIME = "nodejs";
  delete process.env.HEARTBEAT_ENDPOINT;
  process.env.HEARTBEAT_TOKEN = "token-1";

  await register();

  assert.equal(calls.length, 0);
});

test("does nothing without a token", async () => {
  process.env.NEXT_RUNTIME = "nodejs";
  process.env.HEARTBEAT_ENDPOINT = "https://heartbeat.example/report";
  delete process.env.HEARTBEAT_TOKEN;

  await register();

  assert.equal(calls.length, 0);
});
