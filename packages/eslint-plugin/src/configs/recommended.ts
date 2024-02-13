const recommended = {
  parser: "@typescript-eslint/parser",
  parserOptions: { sourceType: "module" },
  rules: {
    "@calcom/eslint/deprecated-imports": "error",
    "@calcom/eslint/avoid-web-storage": "error",
    "@calcom/eslint/avoid-prisma-client-import-for-enums": "error",
    "@calcom/eslint/disallow-prisma-include-only-true-not-field-selector": "error",
  },
};

export default recommended;
