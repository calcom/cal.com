import { forbid } from "@calcom/eslint-config/base";
import { config } from "@calcom/eslint-config/react-internal";

export default [
  ...config,
  forbid({
    from: "../features/**",
    target: ".",
    message: "app-store package should not import from features to avoid circular dependencies.",
  }),
  forbid({
    from: "../trpc/**",
    target: ".",
    message: "app-store package should not import from trpc to avoid circular dependencies.",
  }),
];
