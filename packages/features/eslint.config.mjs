import { config, forbid } from "@calcom/eslint-config/base";

export default [
  ...config,
  forbid({
    from: "../app-store/**",
    target: ".",
  }),
];
