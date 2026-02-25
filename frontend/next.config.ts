import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  turbopack: {},
  // Allow standalone :global() selectors in CSS modules (matches Turbopack behavior)
  webpack: (config) => {
    const rules = config.module?.rules;
    if (rules) {
      for (const rule of rules) {
        if (rule && typeof rule === "object" && rule.oneOf) {
          for (const oneOf of rule.oneOf) {
            if (oneOf?.use) {
              const uses = Array.isArray(oneOf.use) ? oneOf.use : [oneOf.use];
              for (const use of uses) {
                if (
                  use?.loader?.includes("css-loader") &&
                  use.options?.modules
                ) {
                  use.options.modules.mode = "local";
                }
              }
            }
          }
        }
      }
    }
    return config;
  },
};

export default withSerwist(nextConfig);
