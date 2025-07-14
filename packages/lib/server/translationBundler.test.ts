import { readFileSync, existsSync } from "node:fs";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { getBundledTranslations, __resetTranslationCacheForTests } from "./translationBundler";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

vi.mock("@calcom/lib/constants", () => ({
  CALCOM_VERSION: "test-version",
}));

describe("translationBundler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetTranslationCacheForTests();
  });

  it("uses __dirname-based path", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ key: "prod-value" }));
    getBundledTranslations("en", "common");
    expect(vi.mocked(readFileSync)).toHaveBeenCalledWith(
      expect.stringContaining("locales/en/common.json"),
      "utf-8"
    );
  });

  it("normalizes zh to zh-CN", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ key: "chinese" }));
    getBundledTranslations("zh", "common");
    expect(vi.mocked(readFileSync)).toHaveBeenCalledWith(
      expect.stringContaining("zh-CN/common.json"),
      "utf-8"
    );
  });

  it("falls back to English when locale fails", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync)
      .mockImplementationOnce(() => {
        throw new Error("French not found");
      })
      .mockImplementationOnce(() => JSON.stringify({ key: "english" }));
    const result = getBundledTranslations("fr", "common");
    expect(result).toEqual({ key: "english" });
  });

  it("returns empty object when all translations fail", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error("Not found");
    });
    const result = getBundledTranslations("fr", "common");
    expect(result).toEqual({});
  });

  it("returns empty object when translation file doesn't exist", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const result = getBundledTranslations("fr", "common");
    expect(result).toEqual({});
    expect(vi.mocked(readFileSync)).not.toHaveBeenCalled();
  });
});
