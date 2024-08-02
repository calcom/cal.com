import fs from "fs-extra";
import { glob } from "glob";
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  cleanTranslations,
  getUsedKeys,
  extractKeys,
  constantString,
  regex,
  regexConcatenated,
  getFiles,
} from "../../scripts/cleanTranslationsfuns";

vi.mock("fs-extra");
vi.mock("glob");

describe("i18n Translation Cleaning Functions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("extractKeys", () => {
    it("should extract translation keys from content", () => {
      const content = "`some.translation.key` 'another.key' \"yet.another.key\"";
      const keys = extractKeys(content, regex);
      expect(keys).toEqual(new Set(["some.translation.key", "another.key", "yet.another.key"]));
    });

    it("should extract concatenated translation keys", () => {
      const content = "t(`key.${dynamicPart}`)";
      const keys = extractKeys(content, regexConcatenated);
      expect(keys).toEqual(new Set(["key."]));
    });

    describe("extractKeys", () => {
      it("should extract keys using a given regex pattern", () => {
        const content = "t('key1') t(`key2`) t('key3') ${t('nestedKey')}";
        const result = extractKeys(content, regex);
        expect(result).toEqual(new Set(["key1", "key2", "key3", "nestedKey"]));
      });
    });
  });

  describe("getUsedKeys", () => {
    it("should return a set of used translation keys", () => {
      const mockSourceFiles = [
        "/mock/pkg/component1.tsx",
        "/mock/pgk/component2.tsx",
        "/mock/src/component1.tsx",
        "/mock/src/component2.tsx",
        "/mock/prisma/query1.sql",
        "/mock/prisma/query2.sql",
      ];

      vi.mocked(fs.statSync).mockImplementation((filePath: fs.PathLike): fs.Stats => {
        return {
          isDirectory: () => filePath.toString().endsWith("directory"),
        } as fs.Stats;
      });

      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce('t("this_is_the_Key1"); i18n.t("this_is_the_Key2");')
        .mockReturnValueOnce(' <div t="this_is_the_Key3" />')
        .mockReturnValueOnce(' <div t={"this_is_the_Key4"} />');

      const usedKeys = getUsedKeys(mockSourceFiles);
      expect(usedKeys).toEqual(
        new Set([
          "this_is_the_Key1",
          "this_is_the_Key2",
          "this_is_the_Key3",
          "this_is_the_Key4",
          ...constantString,
        ])
      );
    });
  });

  describe("cleanTranslations", () => {
    it("should clean translation files by removing unused keys", () => {
      const mockFiles = ["file1.json"];
      const mockTranslations = { usedKey: "value", unusedKey: "value" };
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        return JSON.stringify(mockTranslations);
      });

      vi.mocked(fs.statSync).mockImplementation((filePath: fs.PathLike): fs.Stats => {
        return {
          isDirectory: () => filePath.toString().endsWith("directory"),
        } as fs.Stats;
      });

      cleanTranslations(mockFiles, new Set(["usedKey"]));
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "file1.json",
        JSON.stringify({ usedKey: "value" }, null, 2)
      );
    });

    it("should log an error if a file cannot be cleaned", () => {
      const files = new Set(["/mock/en/common.json"]);
      const mockUsedKey = ["used_key_1"];

      vi.mocked(fs.readFileSync).mockImplementationOnce(() => {
        throw new Error("Mock file read error");
      });

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => null);

      cleanTranslations(mockUsedKey, files);

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error cleaning: used_key_1");
    });
  });

  describe("getFiles", () => {
    it("should return the list of files matching the pattern, excluding ignored folders", async () => {
      const mockFiles = ["file1.ts", "file2.tsx"];

      vi.mocked(glob.sync).mockImplementation(() => {
        return mockFiles;
      });
      const files = getFiles(".", []);
      expect(files).toEqual(mockFiles);
    });
  });
});
