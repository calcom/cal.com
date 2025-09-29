import { forbid } from "@calcom/eslint-config/base";
import { nextJsConfig } from "@calcom/eslint-config/next-js";

export default [
  ...nextJsConfig,
  forbid({
    from: "../../tests/libs/__mocks__/prismaMock.ts",
    target: ".",
    message: "Please don't use prismaMock",
  }),
];
