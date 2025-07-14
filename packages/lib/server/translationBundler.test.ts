import { readFileSync } from "fs";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { getBundledTranslations, __resetTranslationCacheForTests } from "./translationBundler";

vi.mock("fs");
vi.mock("@calcom/lib/constants", () => ({
  CALCOM_VERSION: "test-version",
  CALCOM_ENV: "production",
}));

const mockReadFileSync = vi.mocked(readFileSync);

describe("translationBundler", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    __resetTranslationCacheForTests();
  });

  it("uses production path", () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ key: "prod-value" }));
    getBundledTranslations("en", "common");
    expect(mockReadFileSync).toHaveBeenCalledWith(
      expect.stringContaining("public/static/locales/en/common.json"),
      "utf-8"
    );
  });

  it("normalizes zh to zh-CN", () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ key: "chinese" }));
    getBundledTranslations("zh", "common");
    expect(mockReadFileSync).toHaveBeenCalledWith(expect.stringContaining("zh-CN/common.json"), "utf-8");
  });

  it("falls back to English when locale fails", () => {
    mockReadFileSync
      .mockImplementationOnce(() => {
        throw new Error("French not found");
      })
      .mockReturnValueOnce(JSON.stringify({ key: "english-fallback" }));
    const result = getBundledTranslations("fr", "common");
    expect(result).toEqual({ key: "english-fallback" });
  });

  it("returns empty object when all translations fail", () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error("Not found");
    });
    const result = getBundledTranslations("fr", "common");
    expect(result).toEqual({});
  });
});
