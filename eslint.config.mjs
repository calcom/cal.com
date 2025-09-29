import { config, forbid } from "@calcom/eslint-config/base";

export default [
  ...config,
  forbid({
    from: "tests/libs/__mocks__/prismaMock.ts",
    target: ".",
    message: "Please don't use prismaMock",
  }),
];
