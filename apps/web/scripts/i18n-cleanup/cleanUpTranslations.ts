import type { TranslationValue } from "./main";
import { KEYS_TO_NOT_REMOVE, type TranslationObject } from "./main";
import { readJsonFile, writeJsonFile } from "./utils";

interface CleanupResult {
  removedCount: number;
  cleanedTranslations: TranslationObject;
}

export const cleanupTranslations = async (
  usedKeys: Set<string>,
  translationFiles: string[]
): Promise<void> => {
  let totalRemoved = 0;

  translationFiles.forEach((file) => {
    const { removedCount } = cleanupTranslationFile(file, usedKeys);
    totalRemoved += removedCount;
    console.info(`Removed ${removedCount} unused translation keys from: ${file}`);
  });

  console.info(`Total unused translation keys removed: ${totalRemoved}`);
  console.info("Unused translation keys have been removed from all common.json files.");
};

const cleanupTranslationFile = (file: string, usedKeys: Set<string>): CleanupResult => {
  const translations = readJsonFile(file);
  const cleanedTranslations: TranslationObject = {};

  let removedCount = 0;

  Object.entries(translations).forEach(([key, value]) => {
    const keyIsBeingUsed = usedKeys.has(key) || KEYS_TO_NOT_REMOVE.includes(key);

    if (keyIsBeingUsed && isValidTranslationValue(value)) {
      cleanedTranslations[key] = value;
    } else {
      removedCount++;
    }
  });

  writeJsonFile(file, cleanedTranslations);

  return { removedCount, cleanedTranslations };
};

const isValidTranslationValue = (value: unknown): value is TranslationValue => {
  if (typeof value === "string") return true;

  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    return typeof obj.one === "string" && typeof obj.other === "string" && Object.keys(obj).length === 2;
  }

  return false;
};
