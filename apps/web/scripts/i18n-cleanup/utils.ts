import fs from "fs";

import type { TranslationObject } from "./main";

export const readJsonFile = (filePath: string): TranslationObject => {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content) as TranslationObject;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return {};
  }
};

export const writeJsonFile = (filePath: string, data: TranslationObject): void => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
  }
};
