import type { Metadata } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale, setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { normalizeTheme, THEME_COOKIE, type ThemePreference } from "@/framework/theme/theme";
import { type Locale } from "@/i18n/config";
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

export const metadata: Metadata = {
  title: "fewbie",
  description: "Basic template: Next.js App Router + Tailwind CSS + shadcn/ui",
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
        <NextIntlClientProvider locale={locale} messages={messages}>
          <TooltipProvider>
            <HostProviders>{children}</HostProviders>
          </TooltipProvider>
          <Toaster position="top-right" duration={2000} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
