import { config } from "@calcom/eslint-config/base";

export default [
  ...config,
  {
    ignores: ["./types/**"],
  },
];
