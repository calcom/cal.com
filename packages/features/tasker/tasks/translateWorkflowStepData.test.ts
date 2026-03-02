import type { ITranslationService } from "@calcom/features/translation/services/ITranslationService";
import { beforeEach, describe, expect, it, vi } from "vitest";
import logger from "@calcom/lib/logger";

const mockPrisma = vi.hoisted(() => ({
  workflowStep: {
    findUnique: vi.fn(),
  },
}));

const mockTranslationService: ITranslationService = {
  translateText: vi.fn(),
  getTargetLocales: vi.fn(),
  getWorkflowStepTranslation: vi.fn(),
  getEventTypeTranslation: vi.fn(),
};

const mockWorkflowStepTranslationRepository = {
  upsertManyBodyTranslations: vi.fn(),
  upsertManySubjectTranslations: vi.fn(),
  findByLocale: vi.fn(),
  deleteByWorkflowStepId: vi.fn(),
};

vi.mock("@calcom/features/di/containers/TranslationService", () => ({
  getTranslationService: vi.fn(() => Promise.resolve(mockTranslationService)),
}));

vi.mock("@calcom/features/ee/workflows/di/WorkflowStepTranslationRepository.container", () => ({
  getWorkflowStepTranslationRepository: vi.fn(() => mockWorkflowStepTranslationRepository),
}));

const mockLogger = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
}));

vi.mock("@calcom/lib/logger", () => ({
  default: mockLogger,
}));

vi.mock("@calcom/prisma", () => ({
  __esModule: true,
  default: mockPrisma,
}));

import { translateWorkflowStepData } from "./translateWorkflowStepData";

describe("translateWorkflowStepData", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(mockPrisma.workflowStep.findUnique).mockResolvedValue({
      reminderBody: "Hello",
      emailSubject: null,
      sourceLocale: "en",
    });
  });

  it("should translate reminderBody to all supported locales", async () => {
    vi.mocked(mockPrisma.workflowStep.findUnique).mockResolvedValue({
      reminderBody: "Hello {ATTENDEE_NAME}",
      emailSubject: null,
      sourceLocale: "en",
    });
    vi.mocked(mockTranslationService.translateText).mockResolvedValue({
      translations: [
        { translatedText: "Translated text", targetLocale: "es" },
        { translatedText: "Translated text", targetLocale: "de" },
      ],
      failedLocales: [],
    });

    const payload = JSON.stringify({
      workflowStepId: 1,
      reminderBody: "Hello {ATTENDEE_NAME}",
      emailSubject: null,
      sourceLocale: "en",
    });

    await translateWorkflowStepData(payload);

    expect(mockTranslationService.translateText).toHaveBeenCalledWith({
      text: "Hello {ATTENDEE_NAME}",
      sourceLocale: "en",
    });
    expect(mockWorkflowStepTranslationRepository.upsertManyBodyTranslations).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          workflowStepId: 1,
          sourceLocale: "en",
          translatedText: "Translated text",
        }),
      ])
    );
  });

  it("should translate emailSubject when provided", async () => {
    vi.mocked(mockPrisma.workflowStep.findUnique).mockResolvedValue({
      reminderBody: null,
      emailSubject: "Booking Reminder",
      sourceLocale: "en",
    });
    vi.mocked(mockTranslationService.translateText).mockResolvedValue({
      translations: [{ translatedText: "Translated subject", targetLocale: "es" }],
      failedLocales: [],
    });

    const payload = JSON.stringify({
      workflowStepId: 1,
      reminderBody: null,
      emailSubject: "Booking Reminder",
      sourceLocale: "en",
    });

    await translateWorkflowStepData(payload);

    expect(mockWorkflowStepTranslationRepository.upsertManySubjectTranslations).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          workflowStepId: 1,
          sourceLocale: "en",
          translatedText: "Translated subject",
        }),
      ])
    );
  });

  it("should translate both body and subject when provided", async () => {
    vi.mocked(mockPrisma.workflowStep.findUnique).mockResolvedValue({
      reminderBody: "Body text",
      emailSubject: "Subject text",
      sourceLocale: "en",
    });
    vi.mocked(mockTranslationService.translateText).mockResolvedValue({
      translations: [{ translatedText: "Translated", targetLocale: "es" }],
      failedLocales: [],
    });

    const payload = JSON.stringify({
      workflowStepId: 1,
      reminderBody: "Body text",
      emailSubject: "Subject text",
      sourceLocale: "en",
    });

    await translateWorkflowStepData(payload);

    expect(mockTranslationService.translateText).toHaveBeenCalledTimes(2);
    expect(mockWorkflowStepTranslationRepository.upsertManyBodyTranslations).toHaveBeenCalled();
    expect(mockWorkflowStepTranslationRepository.upsertManySubjectTranslations).toHaveBeenCalled();
  });

  it("should not call repository when no translations are returned", async () => {
    vi.mocked(mockPrisma.workflowStep.findUnique).mockResolvedValue({
      reminderBody: "Hello",
      emailSubject: null,
      sourceLocale: "en",
    });
    vi.mocked(mockTranslationService.translateText).mockResolvedValue({
      translations: [],
      failedLocales: ["es", "de"],
    });

    const payload = JSON.stringify({
      workflowStepId: 1,
      reminderBody: "Hello",
      emailSubject: null,
      sourceLocale: "en",
    });

    await translateWorkflowStepData(payload);

    expect(mockWorkflowStepTranslationRepository.upsertManyBodyTranslations).not.toHaveBeenCalled();
  });

  it("should throw on invalid payload", async () => {
    await expect(translateWorkflowStepData("invalid-json")).rejects.toThrow();
  });

  it("should preserve targetLocale in translation data", async () => {
    vi.mocked(mockPrisma.workflowStep.findUnique).mockResolvedValue({
      reminderBody: "Hello",
      emailSubject: null,
      sourceLocale: "en",
    });
    vi.mocked(mockTranslationService.translateText).mockResolvedValue({
      translations: [
        { translatedText: "Hola", targetLocale: "es" },
        { translatedText: "Bonjour", targetLocale: "fr" },
      ],
      failedLocales: [],
    });

    const payload = JSON.stringify({
      workflowStepId: 1,
      reminderBody: "Hello",
      emailSubject: null,
      sourceLocale: "en",
    });

    await translateWorkflowStepData(payload);

    expect(mockWorkflowStepTranslationRepository.upsertManyBodyTranslations).toHaveBeenCalledWith([
      expect.objectContaining({ targetLocale: "es", translatedText: "Hola" }),
      expect.objectContaining({ targetLocale: "fr", translatedText: "Bonjour" }),
    ]);
  });

  describe("stale task detection", () => {
    it("should skip translation when workflow step is not found", async () => {
      vi.mocked(mockPrisma.workflowStep.findUnique).mockResolvedValue(null);

      const payload = JSON.stringify({
        workflowStepId: 999,
        reminderBody: "Hello",
        emailSubject: null,
        sourceLocale: "en",
      });

      await translateWorkflowStepData(payload);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Workflow step 999 not found for translation task"
      );
      expect(mockTranslationService.translateText).not.toHaveBeenCalled();
    });

    it("should skip translation when source locale has changed", async () => {
      vi.mocked(mockPrisma.workflowStep.findUnique).mockResolvedValue({
        reminderBody: "Hello",
        emailSubject: null,
        sourceLocale: "fr", // Different from payload
      });

      const payload = JSON.stringify({
        workflowStepId: 1,
        reminderBody: "Hello",
        emailSubject: null,
        sourceLocale: "en",
      });

      await translateWorkflowStepData(payload);

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Skipping stale translation task for workflow step 1"
      );
      expect(mockTranslationService.translateText).not.toHaveBeenCalled();
    });

    it("should skip translation when reminderBody has changed", async () => {
      vi.mocked(mockPrisma.workflowStep.findUnique).mockResolvedValue({
        reminderBody: "Updated body", // Different from payload
        emailSubject: null,
        sourceLocale: "en",
      });

      const payload = JSON.stringify({
        workflowStepId: 1,
        reminderBody: "Original body",
        emailSubject: null,
        sourceLocale: "en",
      });

      await translateWorkflowStepData(payload);

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Skipping stale translation task for workflow step 1"
      );
      expect(mockTranslationService.translateText).not.toHaveBeenCalled();
    });

    it("should skip translation when emailSubject has changed", async () => {
      vi.mocked(mockPrisma.workflowStep.findUnique).mockResolvedValue({
        reminderBody: null,
        emailSubject: "Updated subject", // Different from payload
        sourceLocale: "en",
      });

      const payload = JSON.stringify({
        workflowStepId: 1,
        reminderBody: null,
        emailSubject: "Original subject",
        sourceLocale: "en",
      });

      await translateWorkflowStepData(payload);

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Skipping stale translation task for workflow step 1"
      );
      expect(mockTranslationService.translateText).not.toHaveBeenCalled();
    });

    it("should only translate body when subject has changed but body matches", async () => {
      vi.mocked(mockPrisma.workflowStep.findUnique).mockResolvedValue({
        reminderBody: "Hello body",
        emailSubject: "Updated subject", // Different from payload
        sourceLocale: "en",
      });
      vi.mocked(mockTranslationService.translateText).mockResolvedValue({
        translations: [{ translatedText: "Hola cuerpo", targetLocale: "es" }],
        failedLocales: [],
      });

      const payload = JSON.stringify({
        workflowStepId: 1,
        reminderBody: "Hello body",
        emailSubject: "Original subject",
        sourceLocale: "en",
      });

      await translateWorkflowStepData(payload);

      expect(mockTranslationService.translateText).toHaveBeenCalledTimes(1);
      expect(mockTranslationService.translateText).toHaveBeenCalledWith({
        text: "Hello body",
        sourceLocale: "en",
      });
      expect(mockWorkflowStepTranslationRepository.upsertManyBodyTranslations).toHaveBeenCalled();
      expect(mockWorkflowStepTranslationRepository.upsertManySubjectTranslations).not.toHaveBeenCalled();
    });
  });
});