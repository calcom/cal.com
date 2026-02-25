import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";
import { WorkflowStepAutoTranslatedField } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkflowStepTranslationRepository } from "./WorkflowStepTranslationRepository";

describe("WorkflowStepTranslationRepository", () => {
  const repository = new WorkflowStepTranslationRepository(prismaMock);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("upsertManyBodyTranslations", () => {
    it("should upsert body translations with correct field", async () => {
      prismaMock.workflowStepTranslation.upsert.mockResolvedValue({} as never);

      const translations = [
        { workflowStepId: 1, sourceLocale: "en", targetLocale: "es", translatedText: "Hola" },
        { workflowStepId: 1, sourceLocale: "en", targetLocale: "fr", translatedText: "Bonjour" },
      ];

      await repository.upsertManyBodyTranslations(translations);

      expect(prismaMock.workflowStepTranslation.upsert).toHaveBeenCalledTimes(2);
      expect(prismaMock.workflowStepTranslation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            workflowStepId_field_targetLocale: {
              workflowStepId: 1,
              field: WorkflowStepAutoTranslatedField.REMINDER_BODY,
              targetLocale: "es",
            },
          },
          create: expect.objectContaining({
            field: WorkflowStepAutoTranslatedField.REMINDER_BODY,
          }),
        })
      );
    });
  });

  describe("upsertManySubjectTranslations", () => {
    it("should upsert subject translations with correct field", async () => {
      prismaMock.workflowStepTranslation.upsert.mockResolvedValue({} as never);

      const translations = [
        { workflowStepId: 1, sourceLocale: "en", targetLocale: "de", translatedText: "Betreff" },
      ];

      await repository.upsertManySubjectTranslations(translations);

      expect(prismaMock.workflowStepTranslation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            workflowStepId_field_targetLocale: {
              workflowStepId: 1,
              field: WorkflowStepAutoTranslatedField.EMAIL_SUBJECT,
              targetLocale: "de",
            },
          },
          create: expect.objectContaining({
            field: WorkflowStepAutoTranslatedField.EMAIL_SUBJECT,
          }),
        })
      );
    });
  });

  describe("findByLocale", () => {
    it("should find translation by locale", async () => {
      const mockTranslation = {
        uid: "123",
        workflowStepId: 1,
        field: WorkflowStepAutoTranslatedField.REMINDER_BODY,
        sourceLocale: "en",
        targetLocale: "es",
        translatedText: "Hola",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaMock.workflowStepTranslation.findUnique.mockResolvedValue(mockTranslation);

      const result = await repository.findByLocale(1, WorkflowStepAutoTranslatedField.REMINDER_BODY, "es");

      expect(result).toEqual(mockTranslation);
      expect(prismaMock.workflowStepTranslation.findUnique).toHaveBeenCalledWith({
        where: {
          workflowStepId_field_targetLocale: {
            workflowStepId: 1,
            field: WorkflowStepAutoTranslatedField.REMINDER_BODY,
            targetLocale: "es",
          },
        },
      });
    });

    it("should return null when translation not found", async () => {
      prismaMock.workflowStepTranslation.findUnique.mockResolvedValue(null);

      const result = await repository.findByLocale(1, WorkflowStepAutoTranslatedField.REMINDER_BODY, "xx");

      expect(result).toBeNull();
    });
  });

  describe("deleteByWorkflowStepId", () => {
    it("should delete all translations for a workflow step", async () => {
      prismaMock.workflowStepTranslation.deleteMany.mockResolvedValue({ count: 18 });

      await repository.deleteByWorkflowStepId(1);

      expect(prismaMock.workflowStepTranslation.deleteMany).toHaveBeenCalledWith({
        where: { workflowStepId: 1 },
      });
    });
  });
});
