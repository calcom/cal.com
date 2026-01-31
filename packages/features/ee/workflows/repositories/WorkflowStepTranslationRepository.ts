import { prisma } from "@calcom/prisma";
import type { WorkflowStepTranslation } from "@calcom/prisma/client";
import { WorkflowStepAutoTranslatedField } from "@calcom/prisma/enums";

export type CreateWorkflowStepTranslation = Omit<
  WorkflowStepTranslation,
  "uid" | "createdAt" | "updatedAt" | "workflowStep" | "field"
>;

export class WorkflowStepTranslationRepository {
  static async upsertManyBodyTranslations(translations: Array<CreateWorkflowStepTranslation>) {
    return await Promise.all(
      translations.map((translation) => {
        return prisma.workflowStepTranslation.upsert({
          where: {
            workflowStepId_field_targetLocale: {
              workflowStepId: translation.workflowStepId,
              field: WorkflowStepAutoTranslatedField.REMINDER_BODY,
              targetLocale: translation.targetLocale,
            },
          },
          update: {
            translatedText: translation.translatedText,
          },
          create: {
            ...translation,
            field: WorkflowStepAutoTranslatedField.REMINDER_BODY,
          },
        });
      })
    );
  }

  static async upsertManySubjectTranslations(translations: Array<CreateWorkflowStepTranslation>) {
    return await Promise.all(
      translations.map((translation) => {
        return prisma.workflowStepTranslation.upsert({
          where: {
            workflowStepId_field_targetLocale: {
              workflowStepId: translation.workflowStepId,
              field: WorkflowStepAutoTranslatedField.EMAIL_SUBJECT,
              targetLocale: translation.targetLocale,
            },
          },
          update: {
            translatedText: translation.translatedText,
          },
          create: {
            ...translation,
            field: WorkflowStepAutoTranslatedField.EMAIL_SUBJECT,
          },
        });
      })
    );
  }

  static async findByLocale(
    workflowStepId: number,
    field: WorkflowStepAutoTranslatedField,
    targetLocale: string
  ): Promise<WorkflowStepTranslation | null> {
    return prisma.workflowStepTranslation.findUnique({
      where: {
        workflowStepId_field_targetLocale: {
          workflowStepId,
          field,
          targetLocale,
        },
      },
    });
  }

  static async deleteByWorkflowStepId(workflowStepId: number) {
    return prisma.workflowStepTranslation.deleteMany({
      where: { workflowStepId },
    });
  }
}
