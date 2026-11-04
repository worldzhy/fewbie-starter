import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/config.ts");

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle for the production Docker image
  // (Dockerfile copies .next/standalone). Kept in the framework-owned config
  // so `fewbie template update` cannot silently drop it from a host.
  output: "standalone",
};

export default withNextIntl(nextConfig);
