import type { NextConfig } from "next";

/**
 * Framework defaults (ADR-035). A host overrides any of them by passing its own
 * value to `withFewbie()` from its `next.config.ts`.
 */
const FRAMEWORK_DEFAULTS: NextConfig = {
  // Memoize components and hooks at build time. Hosts that need to debug
  // without the compiler pass `reactCompiler: false`.
  reactCompiler: true,
};

/**
 * Framework invariants: applied last, so a host cannot switch them off. Each
 * field here is a contract with the template (the Dockerfile copies
 * `.next/standalone`); adding one is a framework decision, not a host one.
 */
function applyInvariants(config: NextConfig): NextConfig {
  return {
    ...config,
    // Emit a self-contained server bundle for the production Docker image.
    output: "standalone",
  };
}

/**
 * Compose the framework layer with the host config. Deliberately a shallow
 * merge: `rewrites()` / `headers()` are host-owned functions handed over whole
 * (ADR-035 rules out deep and three-way merges).
 */
export function withFewbie(hostConfig: NextConfig = {}): NextConfig {
  return applyInvariants({ ...FRAMEWORK_DEFAULTS, ...hostConfig });
}
