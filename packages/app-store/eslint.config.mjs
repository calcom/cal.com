import { forbid } from "@calcom/eslint-config/base";
import { config } from "@calcom/eslint-config/react-internal";

export default [
  ...config,
  // Disable no-explicit-any in test files: reason: 
  // Often times we want to pass partial parameters rather than the full expected object.
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/__mocks__/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  forbid({
    from: "../features/**",
    target: ".",
  }),
];
