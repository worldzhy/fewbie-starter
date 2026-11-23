import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";
import { cookies } from "next/headers";

export const routing = defineRouting({
  locales: ["en", "zh"],
  defaultLocale: "en",
  // Routes are flat (no `[locale]` segment), so a locale can never appear in
  // the URL. The locale travels in the NEXT_LOCALE cookie instead.
  localePrefix: "never",
});

export type Locale = (typeof routing.locales)[number];

const LOCALE_COOKIE = "NEXT_LOCALE";

/**
 * Framework namespace of one locale.
 *
 * The import used to fall back to `{}` on any failure, so a host that upgraded
 * without the framework message files emitted a green build and then threw
 * `MISSING_MESSAGE` the first time a framework component opened (R82-16). A
 * missing file is now a build error with the fix in the message.
 */
async function loadFrameworkMessages(locale: Locale): Promise<Record<string, unknown>> {
  try {
    return (await import(`@/i18n/messages/framework.${locale}.json`)).default;
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "MODULE_NOT_FOUND" || code === "ERR_MODULE_NOT_FOUND") {
      throw new Error(
        `Missing framework messages for locale '${locale}'. ` +
          "Run `npx fewbie template update` to add src/i18n/messages/framework." +
          `${locale}.json.`,
      );
    }
    throw error;
  }
}

// The next-intl plugin aliases `next-intl/config` to this module, so the
// default export must be the request configuration (not the routing object).
//
// No routing middleware is used: next-intl's middleware rewrites requests to
// an internal `/{locale}/...` path that a flat route tree cannot serve. The
// locale is resolved from the NEXT_LOCALE cookie (see `LOCALE_COOKIE`); mount
// `src/components/locale-switcher.tsx` in the host header to write it.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;

  let locale: Locale = routing.defaultLocale;
  if (hasLocale(routing.locales, requested)) {
    locale = requested;
  } else if (hasLocale(routing.locales, cookieLocale)) {
    locale = cookieLocale;
  }

  // Host copy and framework copy are separate files so `template update` can
  // own the framework namespace without touching host messages. The framework
  // namespace wins on a collision (ADR-056 D8).
  const hostMessages = (await import(`@/i18n/messages/${locale}.json`)).default;
  const frameworkMessages = await loadFrameworkMessages(locale);

  return {
    locale,
    messages: { ...hostMessages, framework: frameworkMessages },
  };
});

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
