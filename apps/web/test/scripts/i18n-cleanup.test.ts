import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { cleanupTranslations } from "../../scripts/i18n-cleanup/cleanUpTranslations";
import { findUsedKeys } from "../../scripts/i18n-cleanup/findUsedKeys";
import { getAllTranslationKeys } from "../../scripts/i18n-cleanup/getAllTranslationKeys";
import { KEYS_TO_NOT_REMOVE } from "../../scripts/i18n-cleanup/main";

vi.mock("fs");
vi.mock("glob");

describe("i18n Translation Cleanup", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getAllTranslationKeys", () => {
    it("should get all translation keys from common.json files and include KEYS_TO_NOT_REMOVE", () => {
      const mockTranslationFiles = [
        "/mock/public/static/locales/en/common.json",
        "/mock/public/static/locales/es/common.json",
      ];

      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(JSON.stringify({ key1: "Value 1", key2: "Value 2" }))
        .mockReturnValueOnce(JSON.stringify({ key2: "Valor 2", key3: "Valor 3" }));

      const result = getAllTranslationKeys(mockTranslationFiles);

      expect(result).toEqual(new Set([...["key1", "key2", "key3"], ...KEYS_TO_NOT_REMOVE]));
    });

    it("should handle errors when reading translation files", () => {
      const mockTranslationFiles = ["/mock/public/static/locales/en/common.json"];

      vi.mocked(fs.readFileSync).mockImplementationOnce(() => {
        throw new Error("Mock file read error");
      });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => null);

      const result = getAllTranslationKeys(mockTranslationFiles);

      expect(result).toEqual(new Set(KEYS_TO_NOT_REMOVE));
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error reading file /mock/public/static/locales/en/common.json:",
        expect.any(Error)
      );
    });
  });

  describe("findUsedKeys", () => {
    it("should find used keys in source files, including ternary and nested ternary operators", () => {
      const mockSourceFiles = [
        "/mock/src/component1.tsx",
        "/mock/src/component2.tsx",
        "/mock/src/component3.tsx",
        "/mock/src/component4.tsx",
        "/mock/src/directory",
      ];

      const mockAllKeys = new Set([
        "key1",
        "key2",
        "key3",
        "key4",
        "key5",
        "key6",
        "key7",
        ...KEYS_TO_NOT_REMOVE,
      ]);

      vi.mocked(fs.statSync).mockImplementation((filePath: fs.PathLike): fs.Stats => {
        return {
          isDirectory: () => filePath.toString().endsWith("directory"),
        } as fs.Stats;
      });

      vi
        .mocked(fs.readFileSync)
        .mockReturnValueOnce('t("key1"); i18n.t("key2");')
        .mockReturnValueOnce('function Component() { return <div t="key3" />; }')
        .mockReturnValueOnce('function Component() { return <div t={"key4"} />; }').mockReturnValueOnce(`
          function Component() {
            return (
              <div>
                {condition ? t('key5') : t('key6')}
                {conditionA ? t('key1') : conditionB ? t('key7') : t('key2')}
              </div>
            );
          }
        `);

      const result = findUsedKeys(mockSourceFiles, mockAllKeys);

      expect(result).toEqual(new Set(["key1", "key2", "key3", "key4", "key5", "key6", "key7"]));
      expect(fs.readFileSync).toHaveBeenCalledTimes(4);
    });
  });

  describe("cleanupTranslations", () => {
    it("should remove unused translation keys from each common.json file", async () => {
      const mockTranslationsPath = "/mock/public/static/locales";
      const mockUsedKeys = new Set(["used_key1", "used_key2"]);

      const mockTranslationFiles = [
        `${mockTranslationsPath}/en/common.json`,
        `${mockTranslationsPath}/es/common.json`,
      ];

      const mockFileSystem: Record<string, Record<string, { "common.json": string }>> = {
        [mockTranslationsPath]: {
          en: {
            "common.json": JSON.stringify({
              used_key1: "Value 1",
              used_key2: "Value 2",
              unused_key: "Unused value",
            }),
          },
          es: {
            "common.json": JSON.stringify({
              used_key2: "Valor 2",
              unused_key: "Valor no utilizado",
            }),
          },
        },
      };

      vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
        const parts = filePath.toString().split(path.sep);
        const lang = parts[parts.length - 2];

        if (lang in mockFileSystem[mockTranslationsPath]) {
          return mockFileSystem[mockTranslationsPath][lang]["common.json"];
        }
        throw new Error(`Unexpected language: ${lang}`);
      });

      const writeFileSyncMock = vi.fn();
      vi.mocked(fs.writeFileSync).mockImplementation(writeFileSyncMock);

      const consoleLogMock = vi.fn();
      vi.spyOn(console, "log").mockImplementation(consoleLogMock);

      await cleanupTranslations(mockUsedKeys, mockTranslationFiles);

      expect(writeFileSyncMock).toHaveBeenCalledTimes(2);

      expect(writeFileSyncMock).toHaveBeenCalledWith(
        `${mockTranslationsPath}/en/common.json`,
        JSON.stringify({ used_key1: "Value 1", used_key2: "Value 2" }, null, 2),
        "utf8"
      );

      expect(writeFileSyncMock).toHaveBeenCalledWith(
        `${mockTranslationsPath}/es/common.json`,
        JSON.stringify({ used_key2: "Valor 2" }, null, 2),
        "utf8"
      );

      expect(consoleLogMock).toHaveBeenCalledWith(
        expect.stringContaining("Unused translation keys have been removed from all common.json files.")
      );
    });

    it("should handle errors when cleaning up translation files", async () => {
      const mockTranslationFiles = ["/mock/public/static/locales/en/common.json"];
      const mockUsedKeys = new Set(["used_key"]);

      vi.mocked(fs.readFileSync).mockImplementationOnce(() => {
        throw new Error("Mock file read error");
      });

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => null);

      await cleanupTranslations(mockUsedKeys, mockTranslationFiles);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error reading file /mock/public/static/locales/en/common.json:",
        expect.any(Error)
      );
    });
  });
});
