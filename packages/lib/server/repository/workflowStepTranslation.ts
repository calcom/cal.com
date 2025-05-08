import { prisma } from "@calcom/prisma";
import type { WorkflowStepTranslation } from "@calcom/prisma/client";
import { WorkflowStepTranslatedField } from "@calcom/prisma/enums";

export type CreateWorkflowStepTranslation = Omit<
  WorkflowStepTranslation,
  | "uid"
  | "createdAt"
  | "createdBy"
  | "updatedAt"
  | "updatedBy"
  | "workflowStep"
  | "field"
  | "creator"
  | "updater"
> & { userId: number };

export class WorkflowStepTranslationRepository {
  static async upsertManyEmailSubjectTranslations(translations: Array<CreateWorkflowStepTranslation>) {
    return await Promise.all(
      translations.map(({ userId, ...translation }) => {
        return prisma.workflowStepTranslation.upsert({
          where: {
            workflowStepId_field_targetLocale: {
              workflowStepId: translation.workflowStepId,
              field: WorkflowStepTranslatedField.WORKFLOW_SUBJECT,
              targetLocale: translation.targetLocale,
            },
          },
          update: {
            translatedText: translation.translatedText,
            updatedBy: userId,
          },
          create: {
            ...translation,
            field: WorkflowStepTranslatedField.WORKFLOW_SUBJECT,
            createdBy: userId,
          },
        });
      })
    );
  }

  static async upsertManyReminderBodyTranslations(translations: Array<CreateWorkflowStepTranslation>) {
    return await Promise.all(
      translations.map(({ userId, ...translation }) => {
        return prisma.workflowStepTranslation.upsert({
          where: {
            workflowStepId_field_targetLocale: {
              workflowStepId: translation.workflowStepId,
              field: WorkflowStepTranslatedField.WORKFLOW_BODY,
              targetLocale: translation.targetLocale,
            },
          },
          update: {
            translatedText: translation.translatedText,
            updatedBy: userId,
          },
          create: {
            ...translation,
            field: WorkflowStepTranslatedField.WORKFLOW_BODY,
            createdBy: userId,
          },
        });
      })
    );
  }
}
