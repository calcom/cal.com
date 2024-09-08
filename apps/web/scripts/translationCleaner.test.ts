import fs from "fs-extra";
import { glob } from "glob";
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  translationCleaner,
  getUsedKeys,
  extractKeys,
  constantString,
  regexPatterns,
  getFiles,
} from "../../../translationCleaner";

// Mocking file system and glob library
vi.mock("fs-extra");
vi.mock("glob");

describe("i18n Translation Cleaning Functions", () => {
  beforeEach(() => {
    // Reset all mocks before each test to avoid state leakage between tests
    vi.resetAllMocks();
  });

  describe("extractKeys", () => {
    it("should extract translation keys from content using regexPatterns", () => {
      const content = "`some.translation.key` 'another.key' \"yet.another.key\"";

      // Loop through each regex pattern and call extractKeys
      const keys = new Set<string>();
      regexPatterns.forEach((pattern) => {
        const result = extractKeys(content, pattern);
        result.forEach((key) => keys.add(key)); // Add extracted keys
      });

      expect(keys).toEqual(new Set(["some.translation.key", "another.key", "yet.another.key"]));
    });

    it("should extract concatenated translation keys", () => {
      const content = "t(`key.${dynamicPart}`)";

      const keys = new Set<string>();
      regexPatterns.forEach((pattern) => {
        const result = extractKeys(content, pattern);
        result.forEach((key) => keys.add(key));
      });

      expect(keys).toEqual(new Set(["key."]));
    });

    it("should extract keys using multiple formats", () => {
      const content = "t('key1') t(`key2`) t('key3') ${t('nestedKey')}";

      const keys = new Set<string>();
      regexPatterns.forEach((pattern) => {
        const result = extractKeys(content, pattern);
        result.forEach((key) => keys.add(key));
      });

      expect(keys).toEqual(new Set(["key1", "key2", "key3", "nestedKey"]));
    });
  });

  describe("getUsedKeys", () => {
    it("should return a set of used translation keys from multiple files", () => {
      const mockSourceFiles = [
        "/mock/pkg/component1.tsx",
        "/mock/pkg/component2.tsx",
        "/mock/src/component1.tsx",
        "/mock/src/component2.tsx",
      ];

      // Mocking file system behavior for reading content from files
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce('t("key1") t("key2")')
        .mockReturnValueOnce('t("key3") t("key4")');

      const usedKeys = getUsedKeys(mockSourceFiles);
      expect(usedKeys).toEqual(new Set(["key1", "key2", "key3", "key4", ...constantString]));
    });

    it("should return an empty set if no translation keys are found", () => {
      const mockSourceFiles = ["/mock/pkg/emptyFile.tsx"];

      // Simulate empty content in files
      vi.mocked(fs.readFileSync).mockReturnValueOnce("");

      const usedKeys = getUsedKeys(mockSourceFiles);
      expect(usedKeys).toEqual(new Set([...constantString])); // Only constant keys should be returned
    });
  });

  describe("translationCleaner", () => {
    it("should clean translation files by removing unused keys", () => {
      const mockFiles = ["file1.json"];
      const mockTranslations = { usedKey: "value", unusedKey: "value" };

      // Mock file read operation
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockTranslations));

      // Mock filesystem check
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => false,
      } as fs.Stats);

      // Execute translationCleaner
      translationCleaner(mockFiles, new Set(["usedKey"]));

      // Verify the cleaned content is written back correctly
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "file1.json",
        JSON.stringify({ usedKey: "value" }, null, 2)
      );
    });

    it("should log an error when a file cannot be cleaned", () => {
      const files = ["file1.json"];
      const usedKeys = new Set(["usedKey"]);

      // Simulate error during file read
      vi.mocked(fs.readFileSync).mockImplementationOnce(() => {
        throw new Error("Mock file read error");
      });

      // Spy on console error to verify logging
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => null);

      // Execute translationCleaner
      translationCleaner(files, usedKeys);

      // Verify error logging
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Error cleaning"));
    });
  });

  describe("getFiles", () => {
    it("should return files matching the pattern, excluding ignored folders", async () => {
      const mockFiles = ["file1.ts", "file2.tsx"];

      // Mock glob sync to return predefined files
      vi.mocked(glob.sync).mockReturnValue(mockFiles);

      const files = getFiles(".", []);
      expect(files).toEqual(mockFiles);
    });

    it("should return an empty array if no files match the pattern", () => {
      // Mock glob sync to return no files
      vi.mocked(glob.sync).mockReturnValue([]);

      const files = getFiles(".", []);
      expect(files).toEqual([]);
    });
  });
});
