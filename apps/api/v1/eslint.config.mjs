import { nextJsConfig } from "@calcom/eslint-config/next-js";
import calcomEslintPlugin from "@calcom/eslint-plugin-eslint";

export default [
  ...nextJsConfig,
  {
    plugins: {
      "@calcom/eslint": calcomEslintPlugin,
    },
    rules: {
      ...calcomEslintPlugin.configs.recommended.rules,
    },
  },
];
