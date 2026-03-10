import { beforeEach, describe, expect, it, vi } from "vitest";
import { TranslationService } from "./TranslationService";

vi.mock("@calcom/lib/logger", () => ({
  default: { error: vi.fn() },
}));

describe("TranslationService", () => {
  let mockLocalizeText: ReturnType<typeof vi.fn>;
  let mockWorkflowStepTranslationRepository: {
    findByLocale: ReturnType<typeof vi.fn>;
  };
  let mockEventTypeTranslationRepository: {
    findByLocale: ReturnType<typeof vi.fn>;
  };
  let service: TranslationService;

  beforeEach(() => {
    vi.resetAllMocks();
    mockLocalizeText = vi.fn();
    mockWorkflowStepTranslationRepository = {
      findByLocale: vi.fn(),
    };
    mockEventTypeTranslationRepository = {
      findByLocale: vi.fn(),
    };
    service = new TranslationService({
      localizeText: mockLocalizeText,
      workflowStepTranslationRepository: mockWorkflowStepTranslationRepository as never,
      eventTypeTranslationRepository: mockEventTypeTranslationRepository as never,
    });
  });

  describe("getTargetLocales", () => {
    it("should exclude source locale from target locales", () => {
      const targets = service.getTargetLocales("en");
      expect(targets).not.toContain("en");
    });

    it("should return supported locales that are in i18n", () => {
      const targets = service.getTargetLocales("en");
      expect(targets.length).toBeGreaterThan(0);
      expect(targets).toContain("es");
      expect(targets).toContain("de");
    });

    it("should exclude different source locale", () => {
      const targets = service.getTargetLocales("es");
      expect(targets).not.toContain("es");
      expect(targets).toContain("en");
    });
  });

  describe("translateText", () => {
    it("should return empty results for empty text", async () => {
      const result = await service.translateText({ text: "", sourceLocale: "en" });
      expect(result.translations).toHaveLength(0);
      expect(result.failedLocales).toHaveLength(0);
      expect(mockLocalizeText).not.toHaveBeenCalled();
    });

    it("should return empty results for whitespace-only text", async () => {
      const result = await service.translateText({ text: "   ", sourceLocale: "en" });
      expect(result.translations).toHaveLength(0);
      expect(result.failedLocales).toHaveLength(0);
      expect(mockLocalizeText).not.toHaveBeenCalled();
    });

    it("should return empty results for null text", async () => {
      const result = await service.translateText({ text: null as unknown as string, sourceLocale: "en" });
      expect(result.translations).toHaveLength(0);
      expect(result.failedLocales).toHaveLength(0);
    });

    it("should translate text to all supported locales", async () => {
      mockLocalizeText.mockResolvedValue("Translated");

      const result = await service.translateText({ text: "Hello", sourceLocale: "en" });

      expect(result.translations.length).toBeGreaterThan(0);
      expect(result.translations[0]).toEqual(
        expect.objectContaining({
          translatedText: "Translated",
        })
      );
    });

    it("should filter out null translations and track failed locales", async () => {
      mockLocalizeText
        .mockResolvedValueOnce("Hola")
        .mockResolvedValueOnce(null)
        .mockResolvedValue("Translated");

      const result = await service.translateText({ text: "Hello", sourceLocale: "en" });

      expect(result.failedLocales.length).toBe(1);
      expect(result.translations.every((t) => t.translatedText !== null)).toBe(true);
    });

    it("should skip source locale when translating", async () => {
      mockLocalizeText.mockResolvedValue("Translation");

      await service.translateText({ text: "Hello", sourceLocale: "es" });

      const calls = mockLocalizeText.mock.calls;
      const targetLocales = calls.map((call) => call[2]);
      expect(targetLocales).not.toContain("es");
    });

    it("should handle translation service errors gracefully", async () => {
      mockLocalizeText.mockRejectedValue(new Error("API Error"));

      const result = await service.translateText({ text: "Hello", sourceLocale: "en" });

      expect(result.translations).toHaveLength(0);
      expect(result.failedLocales.length).toBeGreaterThan(0);
    });

    it("should preserve locale alignment in results", async () => {
      mockLocalizeText.mockImplementation((_text, _source, target) =>
        Promise.resolve(`Translated to ${target}`)
      );

      const result = await service.translateText({ text: "Hello", sourceLocale: "en" });

      for (const translation of result.translations) {
        expect(translation.translatedText).toBe(`Translated to ${translation.targetLocale}`);
      }
    });

    it("should call localizeText with correct parameters", async () => {
      mockLocalizeText.mockResolvedValue("Translated");

      await service.translateText({ text: "Hello World", sourceLocale: "en" });

      expect(mockLocalizeText).toHaveBeenCalledWith("Hello World", "en", expect.any(String));
    });
  });

  describe("getWorkflowStepTranslation", () => {
    it("should return translated body when includeBody is true", async () => {
      mockWorkflowStepTranslationRepository.findByLocale.mockResolvedValue({
        translatedText: "Translated body",
      });

      const result = await service.getWorkflowStepTranslation(1, "es", { includeBody: true });

      expect(result.translatedBody).toBe("Translated body");
      expect(mockWorkflowStepTranslationRepository.findByLocale).toHaveBeenCalledWith(
        1,
        "REMINDER_BODY",
        "es"
      );
    });

    it("should return translated subject when includeSubject is true", async () => {
      mockWorkflowStepTranslationRepository.findByLocale.mockResolvedValue({
        translatedText: "Translated subject",
      });

      const result = await service.getWorkflowStepTranslation(1, "es", { includeSubject: true });

      expect(result.translatedSubject).toBe("Translated subject");
      expect(mockWorkflowStepTranslationRepository.findByLocale).toHaveBeenCalledWith(
        1,
        "EMAIL_SUBJECT",
        "es"
      );
    });

    it("should return both body and subject when both options are true", async () => {
      mockWorkflowStepTranslationRepository.findByLocale
        .mockResolvedValueOnce({ translatedText: "Translated body" })
        .mockResolvedValueOnce({ translatedText: "Translated subject" });

      const result = await service.getWorkflowStepTranslation(1, "es", {
        includeBody: true,
        includeSubject: true,
      });

      expect(result.translatedBody).toBe("Translated body");
      expect(result.translatedSubject).toBe("Translated subject");
    });

    it("should return empty object when no translation found", async () => {
      mockWorkflowStepTranslationRepository.findByLocale.mockResolvedValue(null);

      const result = await service.getWorkflowStepTranslation(1, "es", { includeBody: true });

      expect(result.translatedBody).toBeUndefined();
    });

    it("should default to includeBody: true when no options provided", async () => {
      mockWorkflowStepTranslationRepository.findByLocale.mockResolvedValue({
        translatedText: "Translated body",
      });

      await service.getWorkflowStepTranslation(1, "es");

      expect(mockWorkflowStepTranslationRepository.findByLocale).toHaveBeenCalledWith(
        1,
        "REMINDER_BODY",
        "es"
      );
    });
  });

  describe("getEventTypeTranslation", () => {
    it("should return translated description when includeDescription is true", async () => {
      mockEventTypeTranslationRepository.findByLocale.mockResolvedValue({
        translatedText: "Translated description",
      });

      const result = await service.getEventTypeTranslation(1, "es", { includeDescription: true });

      expect(result.translatedDescription).toBe("Translated description");
      expect(mockEventTypeTranslationRepository.findByLocale).toHaveBeenCalledWith(1, "DESCRIPTION", "es");
    });

    it("should return translated title when includeTitle is true", async () => {
      mockEventTypeTranslationRepository.findByLocale.mockResolvedValue({
        translatedText: "Translated title",
      });

      const result = await service.getEventTypeTranslation(1, "es", { includeTitle: true });

      expect(result.translatedTitle).toBe("Translated title");
      expect(mockEventTypeTranslationRepository.findByLocale).toHaveBeenCalledWith(1, "TITLE", "es");
    });

    it("should return both title and description when both options are true", async () => {
      mockEventTypeTranslationRepository.findByLocale
        .mockResolvedValueOnce({ translatedText: "Translated title" })
        .mockResolvedValueOnce({ translatedText: "Translated description" });

      const result = await service.getEventTypeTranslation(1, "es", {
        includeTitle: true,
        includeDescription: true,
      });

      expect(result.translatedTitle).toBe("Translated title");
      expect(result.translatedDescription).toBe("Translated description");
    });

    it("should return empty object when no translation found", async () => {
      mockEventTypeTranslationRepository.findByLocale.mockResolvedValue(null);

      const result = await service.getEventTypeTranslation(1, "es", { includeDescription: true });

      expect(result.translatedDescription).toBeUndefined();
    });

    it("should default to includeDescription: true when no options provided", async () => {
      mockEventTypeTranslationRepository.findByLocale.mockResolvedValue({
        translatedText: "Translated description",
      });

      await service.getEventTypeTranslation(1, "es");

      expect(mockEventTypeTranslationRepository.findByLocale).toHaveBeenCalledWith(1, "DESCRIPTION", "es");
    });
  });
});
