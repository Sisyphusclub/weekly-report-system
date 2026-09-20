import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".next-browser-test/**",
    "src/components/base/**",
    "src/components/application/**",
    "src/components/motion/**",
    "src/components/premium/**",
    ".agents/**",
    ".codex-backups/**",
  ]),
]);
