import { config } from "@calcom/eslint-config/base";
import { forbid } from "@calcom/eslint-config/base";

export default [
  ...config,
  {
    ignores: ["./types/**"],
  },
  forbid({
    from: "../apps/web/**",
    target: ".",
    message: "trpc package should not import from apps/web to avoid circular dependencies.",
  }),
];
