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
  forbid({
    from: "../trpc/**",
    target: ".",
    message: "lib package should not import from trpc to avoid circular dependencies.",
  }),
  {
    // Block @trpc/server imports to keep packages/lib framework-agnostic.
    // defaultResponder.ts is temporarily excluded until it can be refactored.
    ignores: ["server/defaultResponder.ts", "server/defaultResponder.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@trpc/server",
              message: "packages/lib should not import from @trpc/server to keep it framework-agnostic.",
            },
          ],
        },
      ],
    },
  },
];
