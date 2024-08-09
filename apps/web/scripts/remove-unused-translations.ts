import fs from "fs";
import glob from "glob";
import path from "path";

// All the paths are relative to the web app as the script will be run from there
const ROOT_DIR = "../../"; // Directory to scan for used translation keys -> entire repository
const TRANSLATIONS_DIR = "./public/static/locales"; // Directory containing translation files

/**
 * # Regex for translation keys
 * This regex matches the following function calls and attribute:
 * 1. t("<some_key>"),
 * 2. t(`<some_key>`),
 * 3. t("<some_key>", {key: "<some_string>"}),
 * 4. t(`<some_key>`, {key: "<some_string>"}),
 * 5. i18nKey="home_hero_subtitle",
 * 6. i18nKey={`home_hero_subtitle`},
 *
 * It also ensure that we don't match any other similar function calls (e.g. `format("dddd")`).
 **/
const translationKeyRegex =
  /(?<!\w)(?:(?:t|language)\((?:"|`)([^$"]*)(?:"|`)(?:,\s*\{[^}]*\})?\)|i18nKey=(?:{`|")([^$"]*)(?:`}|")[^\w])/g;

// Add keys that should not be removed here even if not being used in the source code
const KEYS_TO_IGNORE = ["ADD_NEW_STRINGS_ABOVE_THIS_LINE_TO_PREVENT_MERGE_CONFLICTS"];

// Main Function of the script
async function main() {
  const sourceFiles = glob.sync(`${path.resolve(ROOT_DIR)}/**/*.{ts,tsx,js,jsx,sql}`, {
    ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
  });
  const translationFiles = glob.sync(`${path.resolve(TRANSLATIONS_DIR)}/**/common.json`);

  const usedKeys = scanForUsedKeys(sourceFiles);
  await removeUnusedTranslations(translationFiles, usedKeys);
}

const scanForUsedKeys = (sourceFiles: string[]) => {
  const usedKeys = new Set<string>();

  sourceFiles.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");

    let match;
    while ((match = translationKeyRegex.exec(content)) !== null) {
      const key = match[1] || match[2];
      usedKeys.add(key.replace(/_(one|other)$/, ""));
    }
  });

  return usedKeys;
};

const removeUnusedTranslations = async (translationFiles: string[], usedKeys: Set<string>): Promise<void> => {
  let totalRemoved = 0;
  const removedKeys = new Set<string>();

  translationFiles.forEach((file) => {
    const translations = readTranslationsFile(file);
    const usedTranslations: Record<string, string> = {};

    Object.entries(translations).forEach(([key, value]) => {
      const isKeyUsed = usedKeys.has(key.replace(/_(one|other)$/, "")) || KEYS_TO_IGNORE.includes(key);

      if (isKeyUsed) {
        usedTranslations[key] = value;
      } else {
        totalRemoved++;
        removedKeys.add(key);
      }
    });

    writeTranslationsFile(file, usedTranslations);
  });

  console.table(Array.from(removedKeys).map((key) => ({ key })));
  console.info(`Total unused translation keys removed from all locales: ${totalRemoved}`);
  console.info(`Unique unused translation keys removed are: ${removedKeys.size}`);
};

const readTranslationsFile = (filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content) as Record<string, string>;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return {};
  }
};

const writeTranslationsFile = (filePath: string, data: Record<string, string>) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
  }
};

main().catch((err) => console.error("An error occurred:", err));
