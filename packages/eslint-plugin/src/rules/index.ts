/* eslint-disable @typescript-eslint/no-var-requires*/
import type { ESLint } from "eslint";

export default {
  "my-first-rule": require("./my-first-rule").default,
  "deprecated-imports": require("./deprecated-imports").default,
} as ESLint.Plugin["rules"];
