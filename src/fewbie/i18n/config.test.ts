import assert from "node:assert/strict";
import { before, mock, test } from "node:test";

/**
 * The request config reads the locale cookie through `next/headers` and is
 * registered through `next-intl/server`; both are mocked so the callback runs
 * without a Next request scope. The cookie value stays mutable per test.
 */
let cookieLocale: string | undefined;

mock.module("next/headers", {
  namedExports: {
    cookies: async () => ({
      get: (name: string) => (name === "NEXT_LOCALE" && cookieLocale ? { value: cookieLocale } : undefined),
    }),
  },
});

mock.module("next-intl/server", {
  namedExports: { getRequestConfig: (config: unknown) => config },
});

interface RequestConfig {
  locale: string;
  messages: Record<string, unknown> & { framework: Record<string, unknown> };
}

type RequestConfigFn = (params: { requestLocale: Promise<string | undefined> }) => Promise<RequestConfig>;

let requestConfig: RequestConfigFn;

// The config module is loaded after the mocks are in place, and the callback
// is reached here because the CommonJS output cannot use top-level await.
before(async () => {
  // tsx loads this module through the CommonJS interop path, so the default
  // export may be nested on the module namespace.
  const namespace = (await import("./config")) as unknown as {
    default: RequestConfigFn | { default: RequestConfigFn };
  };
  requestConfig = typeof namespace.default === "function" ? namespace.default : namespace.default.default;
});

test("the requested locale wins over the cookie", async () => {
  cookieLocale = "zh";
  const { locale } = await requestConfig({ requestLocale: Promise.resolve("en") });
  assert.equal(locale, "en");
});

test("an unsupported requested locale falls back to the cookie", async () => {
  cookieLocale = "zh";
  const { locale } = await requestConfig({ requestLocale: Promise.resolve("fr") });
  assert.equal(locale, "zh");
});

test("the default locale applies when neither source is supported", async () => {
  cookieLocale = "de";
  const { locale } = await requestConfig({ requestLocale: Promise.resolve("fr") });
  assert.equal(locale, "en");
});

test("a missing requested locale uses the cookie", async () => {
  cookieLocale = "zh";
  const { locale } = await requestConfig({ requestLocale: Promise.resolve(undefined) });
  assert.equal(locale, "zh");
});

test("the default locale applies when the cookie is absent", async () => {
  cookieLocale = undefined;
  const { locale } = await requestConfig({ requestLocale: Promise.resolve("fr") });
  assert.equal(locale, "en");
});

test("host and framework messages land in the same config", async () => {
  cookieLocale = undefined;
  const { messages } = await requestConfig({ requestLocale: Promise.resolve("en") });
  assert.ok("home" in messages, "host namespace is missing");
  const framework = messages.framework as { common: Record<string, string> };
  assert.equal(framework.common.done, "Done");
});
