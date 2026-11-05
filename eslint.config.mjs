import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Archived UI, kept for reference only (see src/archive/README.md).
    "src/archive/**",
    // Capacitor native projects: generated code and copies of the built
    // bundle (android/app/src/main/assets/public), not source.
    "android/**",
    "ios/**",
  ]),
]);

export default eslintConfig;
