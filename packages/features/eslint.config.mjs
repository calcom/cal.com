import { forbid } from "@calcom/eslint-config/base";
import { config } from "@calcom/eslint-config/base";

export default [
  ...config,
  forbid({
    from: "../trpc/**",
    target: ".",
    message: "features package should not import from trpc to avoid circular dependencies.",
  }),
];
