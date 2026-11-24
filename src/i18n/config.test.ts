import assert from "node:assert/strict";
import { before, mock, test } from "node:test";

/**
 * The request config reads the locale cookie through `next/headers` and is
 * registered through `next-intl/server`; both are mocked so the callback runs
 * without a Next request scope. The cookie value stays mutable per test.
 *
 * This is a host integration test: it asserts the host message namespace loads
 * alongside the framework one, so it lives outside the framework-owned
 * `src/fewbie/i18n/` surface (ADR-070 D3).
 */
let cookieLocale: string | undefined;
let cookieTimeZone: string | undefined;

mock.module("next/headers", {
  namedExports: {
    cookies: async () => ({
      get: (name: string) => {
        if (name === "NEXT_LOCALE" && cookieLocale) return { value: cookieLocale };
        if (name === "NEXT_TIMEZONE" && cookieTimeZone) return { value: cookieTimeZone };
        return undefined;
      },
    }),
  },
});

mock.module("next-intl/server", {
  namedExports: { getRequestConfig: (config: unknown) => config },
});

interface RequestConfig {
  locale: string;
  timeZone: string;
  messages: Record<string, unknown> & { framework: Record<string, unknown> };
}

type RequestConfigFn = (params: { requestLocale: Promise<string | undefined> }) => Promise<RequestConfig>;

let requestConfig: RequestConfigFn;

// The config module is loaded after the mocks are in place, and the callback
// is reached here because the CommonJS output cannot use top-level await.
before(async () => {
  // tsx loads this module through the CommonJS interop path, so the default
  // export may be nested on the module namespace.
  const namespace = (await import("../fewbie/i18n/config")) as unknown as {
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

test("the timezone cookie becomes the request time zone", async () => {
  cookieTimeZone = "Asia/Shanghai";
  const { timeZone } = await requestConfig({ requestLocale: Promise.resolve("en") });
  assert.equal(timeZone, "Asia/Shanghai");
});

test("an invalid timezone cookie falls back to UTC", async () => {
  cookieTimeZone = "Mars/Olympus_Mons";
  const { timeZone } = await requestConfig({ requestLocale: Promise.resolve("en") });
  assert.equal(timeZone, "UTC");
});

test("an absent timezone cookie falls back to UTC", async () => {
  cookieTimeZone = undefined;
  const { timeZone } = await requestConfig({ requestLocale: Promise.resolve("en") });
  assert.equal(timeZone, "UTC");
});
