const path = require("path");
const unusedStrings = require("./scripts/unused-strings");

const BASE_DIR = path.resolve(__dirname, "../../");

const OPTIONS = {
  // A list of one or more source files to process. You can
  // get a speed boost by being more specific here, but for now
  // this is set to process ALL code files
  projectSources: [path.resolve(BASE_DIR, "**/*.{js,jsx,ts,tsx}")],

  // A list of regex patterns that will be tested against
  // each project source file path
  ignoreFilePatterns: ["node_modules", "test"],

  // A list of all translation files for the PRIMARY language
  // of this project
  primaryTranslationFiles: [
    path.resolve(BASE_DIR, "apps/web/public/static/locales/en/common.json"),
    path.resolve(BASE_DIR, "apps/web/public/static/locales/en/vital.json"),
  ],
};

(async () => {
  await unusedStrings(OPTIONS);
})();

module.exports = { BASE_DIR };
