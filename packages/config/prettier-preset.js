module.exports = {
  bracketSpacing: true,
  bracketSameLine: true,
  singleQuote: false,
  jsxSingleQuote: false,
  trailingComma: "es5",
  semi: true,
  printWidth: 110,
  arrowParens: "always",
  importOrder: [
    "^@(calcom|ee)/(.*)$",
    "^@lib/(.*)$",
    "^@components/(.*)$",
    "^@(server|trpc)/(.*)$",
    "^~/(.*)$",
    "^[./]",
  ],
  importOrderSeparation: true,
  plugins: [require("./merged-prettier-plugin")],
  overrides: [
    {
      files: ["apps/website/lib/utils/wordlist/wordlist.ts"],
      options: {
        quoteProps: "consistent",
      },
    },
  ],
};
