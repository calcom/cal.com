import { readFileSync } from "fs";
import { describe, beforeEach, expect, it, vi } from "vitest";

vi.mock("fs");
const mockReadFileSync = vi.mocked(readFileSync);

describe("translationBundler", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("uses development path when CALCOM_ENV=development", async () => {
    vi.doMock("@calcom/lib/constants", () => ({
      CALCOM_VERSION: "test-version",
      CALCOM_ENV: "development",
    }));
    const { getBundledTranslations } = await import("./translationBundler");
    mockReadFileSync.mockReturnValue(JSON.stringify({ key: "dev-value" }));
    getBundledTranslations("en", "common");
    expect(mockReadFileSync).toHaveBeenCalledWith(
      expect.stringContaining("packages/lib/server/locales/en/common.json"),
      "utf-8"
    );
  });

  it("uses production path when CALCOM_ENV=production", async () => {
    vi.doMock("@calcom/lib/constants", () => ({
      CALCOM_VERSION: "test-version",
      CALCOM_ENV: "production",
    }));
    const { getBundledTranslations } = await import("./translationBundler");
    mockReadFileSync.mockReturnValue(JSON.stringify({ key: "prod-value" }));
    getBundledTranslations("en", "common");
    expect(mockReadFileSync).toHaveBeenCalledWith(
      expect.stringContaining("public/static/locales/en/common.json"),
      "utf-8"
    );
  });

  it("normalizes zh to zh-CN", async () => {
    vi.doMock("@calcom/lib/constants", () => ({
      CALCOM_VERSION: "test-version",
      CALCOM_ENV: "development",
    }));
    const { getBundledTranslations } = await import("./translationBundler");
    mockReadFileSync.mockReturnValue(JSON.stringify({ key: "chinese" }));
    getBundledTranslations("zh", "common");
    expect(mockReadFileSync).toHaveBeenCalledWith(expect.stringContaining("zh-CN/common.json"), "utf-8");
  });

  it("falls back to English when locale fails", async () => {
    vi.doMock("@calcom/lib/constants", () => ({
      CALCOM_VERSION: "test-version",
      CALCOM_ENV: "development",
    }));
    const { getBundledTranslations } = await import("./translationBundler");
    mockReadFileSync
      .mockImplementationOnce(() => {
        throw new Error("French not found");
      })
      .mockReturnValueOnce(JSON.stringify({ key: "english-fallback" }));
    const result = getBundledTranslations("fr", "common");
    expect(result).toEqual({ key: "english-fallback" });
  });

  it("returns empty object when all translations fail", async () => {
    vi.doMock("@calcom/lib/constants", () => ({
      CALCOM_VERSION: "test-version",
      CALCOM_ENV: "development",
    }));
    const { getBundledTranslations } = await import("./translationBundler");
    mockReadFileSync.mockImplementation(() => {
      throw new Error("Not found");
    });
    const result = getBundledTranslations("fr", "common");
    expect(result).toEqual({});
  });
});
