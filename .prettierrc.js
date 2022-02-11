module.exports = {
  bracketSpacing: true,
  bracketSameLine: true,
  singleQuote: false,
  jsxSingleQuote: false,
  trailingComma: "es5",
  semi: true,
  printWidth: 110,
  arrowParens: "always",
  importOrder: ["^@(calcom|components|ee|lib|server|trpc)/(.*)$", "^[./]"],
  importOrderSeparation: true,
  plugins: [require("./merged-prettier-plugin")],
};
