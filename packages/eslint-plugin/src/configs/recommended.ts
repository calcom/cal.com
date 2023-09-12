const recommended = {
  parser: "@typescript-eslint/parser",
  parserOptions: { sourceType: "module" },
  rules: {
    "@calcom/eslint/deprecated-imports": "error",
    "@calcom/eslint/avoid-web-storage": "error",
    "@calcom/eslint/avoid-prisma-client-import-for-enums": "error",
  },
};

export default recommended;
