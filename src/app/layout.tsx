import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale, setRequestLocale } from "next-intl/server";
import { FrontendMonitor } from "@/components/frontend-monitor";
import { type Locale } from "@/i18n/config";
import "./globals.css";

// Locale resolution reads the NEXT_LOCALE cookie, so every render depends on
// request state. Force the root layout to render dynamically instead of
// prerendering a single baked locale.
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "fewbie",
  description: "Basic template: Next.js App Router + Tailwind CSS + shadcn/ui",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = (await getLocale()) as Locale;
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <FrontendMonitor />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
