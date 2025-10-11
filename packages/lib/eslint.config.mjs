import { forbid } from "@calcom/eslint-config/base";
import { config } from "@calcom/eslint-config/base";

export default [
  ...config,
  forbid({
    from: "../app-store/**",
    target: ".",
    message: "lib package should not import from app-store to avoid circular dependencies.",
  }),
  forbid({
    from: "../features/**",
    target: ".",
    message: "lib package should not import from features to avoid circular dependencies.",
  }),
];
