import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLocalizeText = vi.fn();
const mockBatchLocalizeText = vi.fn();
const mockLocalizeChat = vi.fn();

vi.mock("lingo.dev/sdk", () => ({
  LingoDotDevEngine: class {
    localizeText = (...args: unknown[]) => mockLocalizeText(...args);
    batchLocalizeText = (...args: unknown[]) => mockBatchLocalizeText(...args);
    localizeChat = (...args: unknown[]) => mockLocalizeChat(...args);
  },
}));

vi.mock("@calcom/lib/constants", () => ({
  LINGO_DOT_DEV_API_KEY: "test-api-key",
}));

vi.mock("@calcom/lib/logger", () => ({
  default: { error: vi.fn() },
}));

import { LingoDotDevService } from "./lingoDotDev";

describe("LingoDotDevService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("localizeText", () => {
    it("returns localized text on success", async () => {
      mockLocalizeText.mockResolvedValueOnce("Bonjour");
      const result = await LingoDotDevService.localizeText("Hello", "en", "fr");
      expect(result).toBe("Bonjour");
      expect(mockLocalizeText).toHaveBeenCalledWith("Hello", {
        sourceLocale: "en",
        targetLocale: "fr",
      });
    });

    it("returns null for empty input", async () => {
      const result = await LingoDotDevService.localizeText("", "en", "fr");
      expect(result).toBeNull();
      expect(mockLocalizeText).not.toHaveBeenCalled();
    });

    it("returns null for whitespace-only input", async () => {
      const result = await LingoDotDevService.localizeText("   ", "en", "fr");
      expect(result).toBeNull();
      expect(mockLocalizeText).not.toHaveBeenCalled();
    });

    it("returns null on engine error", async () => {
      mockLocalizeText.mockRejectedValueOnce(new Error("API error"));
      const result = await LingoDotDevService.localizeText("Hello", "en", "fr");
      expect(result).toBeNull();
    });
  });

  describe("batchLocalizeText", () => {
    it("returns array of localized texts on success", async () => {
      mockBatchLocalizeText.mockResolvedValueOnce(["Bonjour", "Hola"]);
      const result = await LingoDotDevService.batchLocalizeText("Hello", "en", ["fr", "es"]);
      expect(result).toEqual(["Bonjour", "Hola"]);
    });

    it("passes correct sourceLocale and targetLocales", async () => {
      mockBatchLocalizeText.mockResolvedValueOnce(["Hallo"]);
      await LingoDotDevService.batchLocalizeText("Hello", "en", ["de"]);
      expect(mockBatchLocalizeText).toHaveBeenCalledWith("Hello", {
        sourceLocale: "en",
        targetLocales: ["de"],
      });
    });

    it("returns empty array on engine error", async () => {
      mockBatchLocalizeText.mockRejectedValueOnce(new Error("API error"));
      const result = await LingoDotDevService.batchLocalizeText("Hello", "en", ["fr"]);
      expect(result).toEqual([]);
    });
  });

  describe("localizeTexts", () => {
    it("returns localized texts array on success", async () => {
      mockLocalizeChat.mockResolvedValueOnce([
        { name: "NO_NAME", text: "Bonjour" },
        { name: "NO_NAME", text: "Au revoir" },
      ]);
      const result = await LingoDotDevService.localizeTexts(["Hello", "Goodbye"], "en", "fr");
      expect(result).toEqual(["Bonjour", "Au revoir"]);
    });

    it("returns original texts on empty array", async () => {
      const result = await LingoDotDevService.localizeTexts([], "en", "fr");
      expect(result).toEqual([]);
      expect(mockLocalizeChat).not.toHaveBeenCalled();
    });

    it("returns original texts on engine error", async () => {
      mockLocalizeChat.mockRejectedValueOnce(new Error("API error"));
      const result = await LingoDotDevService.localizeTexts(["Hello", "Goodbye"], "en", "fr");
      expect(result).toEqual(["Hello", "Goodbye"]);
    });

    it("trims text before sending to engine", async () => {
      mockLocalizeChat.mockResolvedValueOnce([{ name: "NO_NAME", text: "Bonjour" }]);
      await LingoDotDevService.localizeTexts(["  Hello  "], "en", "fr");
      expect(mockLocalizeChat).toHaveBeenCalledWith([{ name: "NO_NAME", text: "Hello" }], {
        sourceLocale: "en",
        targetLocale: "fr",
      });
    });

    it("constructs chat messages with NO_NAME name", async () => {
      mockLocalizeChat.mockResolvedValueOnce([{ name: "NO_NAME", text: "Hola" }]);
      await LingoDotDevService.localizeTexts(["Hi"], "en", "es");
      expect(mockLocalizeChat).toHaveBeenCalledWith(
        [{ name: "NO_NAME", text: "Hi" }],
        expect.objectContaining({ sourceLocale: "en", targetLocale: "es" })
      );
    });

    it("maps localizeChat result to text field only", async () => {
      mockLocalizeChat.mockResolvedValueOnce([{ name: "NO_NAME", text: "Translated", extra: "ignored" }]);
      const result = await LingoDotDevService.localizeTexts(["Original"], "en", "fr");
      expect(result).toEqual(["Translated"]);
    });
  });
});
