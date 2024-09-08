import fs from "fs-extra";
import * as glob from "glob";
import path from "path";

// Define directories
const PROJECT_DIR = path.resolve("./**/*.{ts,tsx,sql}"); // Directory to scan for used translation keys
const TRANSLATION_DIR = path.resolve("./apps/web/public/static/locales/**/*"); // Translation files directory

// Folders to be ignored during file scanning
const ignoredFolders = ["node_modules/**"];

// Constants for specific string keys that should not be removed
export const constantString = ["ADD_NEW_STRINGS_ABOVE_THIS_LINE_TO_PREVENT_MERGE_CONFLICTS"];

// Define regex patterns for extracting translation keys
// Define regex patterns for extracting translation keys
export const regexPatterns = [
  /([`'"])(.*?)\1/g, // Matches strings enclosed in single, double, or backticks
  /t\(\s*(['"`])([^'"`]*?)\${[^}]*}[^'"`]*?\1\s*\)/g, // Matches concatenated translation keys
  /\[`?\$\{t\((['"`])(.*?)\1\)\}\]?/g, // Matches template literals containing translation keys
];

/**
 * Extracts translation keys from the given file content based on a specific regex pattern.
 * @param {string} content - The content of the file to extract keys from.
 * @param {RegExp} regexPattern - The regex pattern to use for extracting keys.
 * @returns {Set<string>} A set of extracted translation keys.
 */
export const extractKeys = (content: string, regexPattern: RegExp): Set<string> => {
  const keys = new Set<string>();

  let match;
  while ((match = regexPattern.exec(content)) !== null) {
    const key = match[2]
      .replace(/[`'"]/g, "")
      .split(/\s*\+\s*/)
      .join("");

    // Handle nested template literals within the keys
    const nestedTemplateRegex = /\$\{t\(([^,)]+)(?:,\s*{[^}]*})?\)\}/g;
    let nestedMatch;
    while ((nestedMatch = nestedTemplateRegex.exec(key)) !== null) {
      keys.add(nestedMatch[1]);
    }
    keys.add(key);
  }

  return keys;
};

/**
 * Scans the provided files for used translation keys.
 * @param {string[]} files - The files to scan for translation keys.
 * @returns {Set<string>} A set of all used translation keys.
 */
export const getUsedKeys = (files: string[]): Set<string> => {
  const usedKeys = new Set<string>();

  files.forEach((file: string) => {
    if (!fs.statSync(file).isFile()) return;

    try {
      const content = fs.readFileSync(file, "utf8");

      // Loop through each regex pattern and extract keys
      regexPatterns.forEach((pattern) => {
        const keys = extractKeys(content, pattern);
        keys.forEach((key) => usedKeys.add(key));
      });
    } catch (error) {
      console.error(`Error reading file: ${file}`, error);
    }
  });

  // Always retain the constant strings
  constantString.forEach((key) => usedKeys.add(key));

  return usedKeys;
};

/**
 * Cleans the given translation files by removing unused keys.
 * @param {string[]} files - The translation files to clean.
 * @param {Set<string>} usedKeys - The set of used translation keys.
 */
export const translationCleaner = (files: string[], usedKeys: Set<string>): void => {
  files.forEach((file: string) => {
    if (!fs.statSync(file).isFile()) return;

    try {
      const translations = JSON.parse(fs.readFileSync(file, "utf8"));
      const cleanedTranslations = Object.fromEntries(
        Object.entries(translations).filter(([key]) => usedKeys.has(key))
      );

      // Write cleaned translations back to file
      fs.writeFileSync(file, JSON.stringify(cleanedTranslations, null, 2));
      console.log(`Cleaned: ${file}`);
    } catch (error) {
      console.error(`Error cleaning file: ${file}`, error);
    }
  });
};

/**
 * Retrieves the list of files matching the provided path pattern and excludes ignored folders.
 * @param {string} pathPattern - The path pattern to match files.
 * @param {string[]} ignoredFolders - Folders to ignore during the scan.
 * @returns {string[]} An array of matching file paths.
 */
export const getFiles = (pathPattern: string, ignoredFolders: string[]): string[] => {
  return glob.sync(pathPattern, { ignore: ignoredFolders });
};

/**
 * Main function to execute the translation cleaning process.
 */
export const main = (): void => {
  try {
    // Step 1: Get all files that may contain translation keys
    const sourceFiles = getFiles(PROJECT_DIR, ignoredFolders);
    const usedKeys = getUsedKeys(sourceFiles);

    // Step 2: Get translation files and clean them
    const translationFiles = getFiles(TRANSLATION_DIR, []);
    translationCleaner(translationFiles, usedKeys);
  } catch (error) {
    console.error("Error during translation cleaning process", error);
  }
};

// Run the main function if this file is executed directly
if (require.main === module) {
  main();
}
