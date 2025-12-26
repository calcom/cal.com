const eslintConfigExpo = require("eslint-config-expo/flat");
const eslintPluginPrettier = require("eslint-plugin-prettier/recommended");

module.exports = [
  // Extend Expo's ESLint flat config
  ...eslintConfigExpo,

  // Prettier integration - must come after other configs to override conflicting rules
  eslintPluginPrettier,

  // Global ignores
  {
    ignores: ["node_modules/", ".expo/", "dist/", ".output/", "*.d.ts", "package-lock.json"],
  },

  // Node.js environment for config files
  {
    files: [
      "babel.config.js",
      "metro.config.js",
      "tailwind.config.js",
      ".prettierrc.js",
      "eslint.config.js",
    ],
    languageOptions: {
      globals: {
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
        process: "readonly",
      },
    },
  },

  // Browser extension environment
  {
    files: ["extension/**/*.ts", "extension/**/*.tsx"],
    languageOptions: {
      globals: {
        chrome: "readonly",
        browser: "readonly",
      },
    },
  },
];
