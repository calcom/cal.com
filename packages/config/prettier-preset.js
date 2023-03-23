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
  plugins: [
    "@trivago/prettier-plugin-sort-imports",
    /**
     * **NOTE** tailwind plugin must come last!
     * @see https://github.com/tailwindlabs/prettier-plugin-tailwindcss#compatibility-with-other-prettier-plugins
     */
    "prettier-plugin-tailwindcss",
  ],
  overrides: [
    {
      files: ["apps/website/lib/utils/wordlist/wordlist.ts"],
      options: {
        quoteProps: "consistent",
      },
    },
  ],
};
