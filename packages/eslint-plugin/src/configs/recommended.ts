const recommended = {
  parser: "@typescript-eslint/parser",
  parserOptions: { sourceType: "module" },
  rules: {
    "@calcom/eslint/deprecated-imports": "error",
    "@calcom/eslint/deprecated-imports-next-router": "error",
    "@calcom/eslint/avoid-web-storage": "error",
    "@calcom/eslint/avoid-prisma-client-import-for-enums": "error",
    "@calcom/eslint/no-prisma-include-true": "warn",
    "@calcom/eslint/no-scroll-into-view-embed": "error",
    "@calcom/eslint/no-direct-prisma-import": "error",
    "@calcom/eslint/no-this-in-static-method": "error",
  },
};

export default recommended;
