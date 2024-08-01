import fs from "fs";

export const findUsedKeys = (sourceFiles: string[], allKeys: Set<string>): Set<string> => {
  const usedKeys = new Set<string>();

  sourceFiles.forEach((file) => {
    if (fs.statSync(file).isDirectory()) return;

    const content = fs.readFileSync(file, "utf8");
    allKeys.forEach((key) => {
      if (content.includes(key)) {
        usedKeys.add(key);
      }
    });
  });

  return usedKeys;
};
