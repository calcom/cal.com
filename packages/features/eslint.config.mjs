import { forbid } from "@calcom/eslint-config/base";
import { config } from "@calcom/eslint-config/react-internal";

export default [
  ...config,
  forbid({
    from: "../app-store/**",
    target: ".",
  }),
  forbid({
    from: "../../tests/libs/__mocks__/prismaMock.ts",
    target: ".",
    message: "Please don't use prismaMock",
  }),
];
