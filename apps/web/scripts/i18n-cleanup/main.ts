import * as glob from "glob";
import * as path from "path";

import { cleanupTranslations } from "./cleanUpTranslations";
import { findUsedKeys } from "./findUsedKeys";
import { getAllTranslationKeys } from "./getAllTranslationKeys";

export type TranslationValue = string | { one: string; other: string };
export type TranslationObject = Record<string, TranslationValue>;
export const KEYS_TO_NOT_REMOVE: readonly string[] = [] as const;

const main = async (): Promise<void> => {
  const sourceDir = path.resolve("../../../");
  const translationsDir = path.resolve("public/static/locales");

  console.info("Scanning source directory:", sourceDir);
  console.info("Scanning translations directory:", translationsDir);

  const sourceFiles = glob.sync(`${sourceDir}/**/*.{ts,tsx,js,jsx, sql}`, {
    ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
  });

  const translationFiles = glob.sync(`${translationsDir}/**/common.json`);

  const allKeys = getAllTranslationKeys(translationFiles);
  console.info(`Total translation keys found: ${allKeys.size}`);

  const usedKeys = findUsedKeys(sourceFiles, allKeys);
  console.info(`Used translation keys found: ${usedKeys.size}`);

  await cleanupTranslations(usedKeys, translationFiles);
};

main().catch((err) => console.error("An error occurred:", err));
