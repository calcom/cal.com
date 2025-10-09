import { forbid } from "@calcom/eslint-config/base";
import { config } from "@calcom/eslint-config/react-internal";

export default [
  ...config,
  forbid({
    from: "../features/**",
    target: ".",
  }),
];
