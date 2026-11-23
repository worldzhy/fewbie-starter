import type { Metadata } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale, setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { Toaster } from "@/fewbie/ui/sonner";
import { TooltipProvider } from "@/fewbie/ui/tooltip";
import { ConfirmProvider } from "@/fewbie/framework/feedback/confirm-dialog";
import { ApiErrorToast } from "@/fewbie/framework/feedback/api-error-toast";
import { NavigationProgressProvider } from "@/fewbie/framework/feedback/navigation-progress";
import { ThemeProvider } from "@/fewbie/framework/theme/theme-provider";
import { normalizeTheme, THEME_COOKIE, type ThemePreference } from "@/fewbie/framework/theme/theme";
import { type Locale } from "@/fewbie/i18n/config";
import { HostProviders } from "./host-providers";
import "./globals.css";

// Locale resolution reads the NEXT_LOCALE cookie, so every render depends on
// request state. Force the root layout to render dynamically instead of
// prerendering a single baked locale.
export const dynamic = "force-dynamic";

// Both faces are self-hosted under ./fonts. next/font/google downloads at
// build time, and when that fetch fails (blocked fonts.googleapis.com,
// air-gapped CI) every family silently degrades to a metric-matched Arial
// lookalike.
const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  weight: "100 900",
  variable: "--font-geist-mono",
  display: "swap",
});

// The root layout is framework-owned, so hosts cannot edit these strings.
// They come from build-time environment variables with a neutral fallback
// instead of hard-coding the template name into every product page (R83-20).
// NEXT_PUBLIC_* values are inlined by `next build`, so set them before building.
export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? "fewbie",
  description: process.env.NEXT_PUBLIC_APP_DESCRIPTION ?? "Next.js App Router application",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = (await getLocale()) as Locale;
  setRequestLocale(locale);
  const messages = await getMessages();
  // Rendering the theme class server-side keeps the first paint in the user's
  // preference; a system preference is resolved by the inline script before
  // anything is painted.
  const theme: ThemePreference = normalizeTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html lang={locale} className={theme === "DARK" ? "dark" : undefined} suppressHydrationWarning>
      <body className={`${inter.variable} ${geistMono.variable}`}>
        {theme === "SYSTEM" ? (
          <script
            dangerouslySetInnerHTML={{
              __html:
                'try{if(window.matchMedia("(prefers-color-scheme: dark)").matches){document.documentElement.classList.add("dark")}}catch(e){}',
            }}
          />
        ) : null}
        {/* Framework providers mount here so the hooks they expose work in
            every host without the host remembering to wire them (ADR-001). */}
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider initialTheme={theme}>
            <ConfirmProvider>
              <NavigationProgressProvider>
                <TooltipProvider>
                  <HostProviders>{children}</HostProviders>
                </TooltipProvider>
              </NavigationProgressProvider>
            </ConfirmProvider>
            {/* Inside ThemeProvider so the toast can follow the active theme;
                outside HostProviders so a host re-mounting its tree never drops
                the api-client error subscription (R82-17, R82-21). */}
            <ApiErrorToast />
            <Toaster
              position="top-right"
              duration={2000}
              theme={theme === "DARK" ? "dark" : theme === "LIGHT" ? "light" : "system"}
            />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
