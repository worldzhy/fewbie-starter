import createNextIntlPlugin from "next-intl/plugin";
import { withFewbie } from "./next.config.framework";

const withNextIntl = createNextIntlPlugin("./src/i18n/config.ts");

// Host configuration only. Framework defaults and invariants live in
// next.config.framework.ts and reach this file through `fewbie template update`;
// `template update` never rewrites this file.
export default withNextIntl(
  withFewbie({
    // Host-specific Next.js options go here.
  }),
);
