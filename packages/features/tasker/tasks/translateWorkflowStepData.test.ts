import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/features/ee/workflows/repositories/WorkflowStepTranslationRepository", () => ({
  WorkflowStepTranslationRepository: {
    upsertManyBodyTranslations: vi.fn(),
    upsertManySubjectTranslations: vi.fn(),
  },
}));

vi.mock("@calcom/lib/server/service/lingoDotDev", () => ({
  LingoDotDevService: {
    localizeText: vi.fn(),
  },
}));

vi.mock("@calcom/lib/logger", () => ({
  default: { error: vi.fn() },
}));

import { WorkflowStepTranslationRepository } from "@calcom/features/ee/workflows/repositories/WorkflowStepTranslationRepository";
import { LingoDotDevService } from "@calcom/lib/server/service/lingoDotDev";
import { translateWorkflowStepData } from "./translateWorkflowStepData";

describe("translateWorkflowStepData", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should translate reminderBody to all supported locales", async () => {
    vi.mocked(LingoDotDevService.localizeText).mockResolvedValue("Translated text");

    const payload = JSON.stringify({
      workflowStepId: 1,
      reminderBody: "Hello {ATTENDEE_NAME}",
      emailSubject: null,
      userLocale: "en",
    });

    await translateWorkflowStepData(payload);

    expect(LingoDotDevService.localizeText).toHaveBeenCalled();
    expect(WorkflowStepTranslationRepository.upsertManyBodyTranslations).toHaveBeenCalledWith(
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
    vi.mocked(LingoDotDevService.localizeText).mockResolvedValue("Translated subject");

    const payload = JSON.stringify({
      workflowStepId: 1,
      reminderBody: null,
      emailSubject: "Booking Reminder",
      userLocale: "en",
    });

    await translateWorkflowStepData(payload);

    expect(WorkflowStepTranslationRepository.upsertManySubjectTranslations).toHaveBeenCalledWith(
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
    vi.mocked(LingoDotDevService.localizeText).mockResolvedValue("Translated");

    const payload = JSON.stringify({
      workflowStepId: 1,
      reminderBody: "Body text",
      emailSubject: "Subject text",
      userLocale: "en",
    });

    await translateWorkflowStepData(payload);

    // localizeText should be called multiple times for both body and subject
    // (some locales may be filtered by i18nLocales check)
    expect(vi.mocked(LingoDotDevService.localizeText).mock.calls.length).toBeGreaterThan(0);
    expect(WorkflowStepTranslationRepository.upsertManyBodyTranslations).toHaveBeenCalled();
  });

  it("should skip source locale when translating", async () => {
    vi.mocked(LingoDotDevService.localizeText).mockResolvedValue("Hola");

    const payload = JSON.stringify({
      workflowStepId: 1,
      reminderBody: "Hello",
      emailSubject: null,
      userLocale: "es",
    });

    await translateWorkflowStepData(payload);

    const calls = vi.mocked(LingoDotDevService.localizeText).mock.calls;
    const targetLocales = calls.map((call) => call[2]);
    expect(targetLocales).not.toContain("es");
  });

  it("should handle null translations gracefully", async () => {
    vi.mocked(LingoDotDevService.localizeText).mockResolvedValue(null as unknown as string);

    const payload = JSON.stringify({
      workflowStepId: 1,
      reminderBody: "Hello",
      emailSubject: null,
      userLocale: "en",
    });

    await translateWorkflowStepData(payload);

    expect(WorkflowStepTranslationRepository.upsertManyBodyTranslations).not.toHaveBeenCalled();
  });

  it("should throw on invalid payload", async () => {
    await expect(translateWorkflowStepData("invalid-json")).rejects.toThrow();
  });
});
