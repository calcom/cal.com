const fs = require("fs-extra");
const glob = require("glob");

const PROJECT_DIR = "./"; // Directory to scan for used translation keys
const TRANSLATION_DIR = "./apps/web/public/static/locales"; // Directory containing translation files

// Regex patterns to match different types of translation keys in the code
const regex = /([`'"])(.*?)\1/g; // Matches strings enclosed in single, double, or backticks
const regexConcatenated = /t\(\s*(['"`])([^'"`]*?)\${[^}]*}[^'"`]*?\1\s*\)/g; // Matches concatenated translation keys
const regexTemplateLiteral = /\[`?\$\{t\((['"`])(.*?)\1\)\}\]?/g; // Matches template literals containing translation keys

// The keys that we want to keep in the translation files even if they are not used in the code
const constantString = ["ADD_NEW_STRINGS_ABOVE_THIS_LINE_TO_PREVENT_MERGE_CONFLICTS"];

// Helper function to extract keys using a given regex pattern
const extractKeys = (content, regex) => {
  const keys = new Set();
  let match;
  while ((match = regex.exec(content)) !== null) {
    let key = match[2];
    key = key
      .replace(/[`'"]/g, "")
      .split(/\s*\+\s*/)
      .join("");

    // Check for nested template literals like ${t(...)}
    const regex = /\$\{t\(([^,)]+)(?:,\s*{[^}]*})?\)\}/g;
    let nestedMatch;
    while ((nestedMatch = regex.exec(key)) !== null) {
      keys.add(nestedMatch[1]);
    }
    keys.add(key);
  }
  return keys;
};

/**
 * Scans the given directory for translation keys used in TypeScript and TSX files.
 * @returns {Set} A set of used translation keys.
 */
const getUsedKeys = (dir) => {
  const usedKeys = new Set();

  // Scan for TypeScript and TSX files in the directory
  glob.sync(`${dir}/**/*.{ts,tsx,sql}`).forEach((file) => {
    if (fs.statSync(file).isDirectory()) return;
    const content = fs.readFileSync(file, "utf8");

    // Extract keys from different patterns
    extractKeys(content, regex).forEach((key) => usedKeys.add(key));
    extractKeys(content, regexConcatenated).forEach((key) => usedKeys.add(key));
    extractKeys(content, regexTemplateLiteral).forEach((key) => usedKeys.add(key));
  });

  for (const key of constantString) {
    usedKeys.add(key);
  }

  return usedKeys;
};

/**
 * Cleans the translation files by removing unused keys.
 * @param {string} translationDir - The directory containing translation files.
 * @param {Set} usedKeys - The set of used translation keys.
 */
const cleanTranslations = (translationDir, usedKeys) => {
  // Scan for common.json translation files in the directory
  glob.sync(`${translationDir}/**/common.json`).forEach((file) => {
    try {
      const translations = JSON.parse(fs.readFileSync(file, "utf8"));
      // Filter translations to keep only the used keys
      const cleanedTranslations = Object.fromEntries(
        Object.entries(translations).filter(([key]) => usedKeys.has(key))
      );
      fs.writeFileSync(file, JSON.stringify(cleanedTranslations, null, 2));
      console.log(`Cleaned: ${file}`);
    } catch (error) {
      console.error(`Error cleaning: ${file}`);
      console.log(error);
    }
  });
};

/**
 * Main function to execute the cleaning process.
 */
const main = () => {
  const usedKeys = getUsedKeys(PROJECT_DIR);
  cleanTranslations(TRANSLATION_DIR, usedKeys);
};

main();
