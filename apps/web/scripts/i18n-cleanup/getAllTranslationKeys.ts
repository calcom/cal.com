import { KEYS_TO_NOT_REMOVE } from "./main";
import { readJsonFile } from "./utils";

export const getAllTranslationKeys = (translationFiles: string[]): Set<string> => {
  const allKeys = new Set<string>();

  translationFiles.forEach((file) => {
    const translations = readJsonFile(file);
    Object.keys(translations).forEach((key) => allKeys.add(key));
  });

  KEYS_TO_NOT_REMOVE.forEach((key) => allKeys.add(key));

  return allKeys;
};
