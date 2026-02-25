import type { PrismaClient, WorkflowStepTranslation } from "@calcom/prisma/client";
import { WorkflowStepAutoTranslatedField } from "@calcom/prisma/enums";

export type CreateWorkflowStepTranslation = Omit<
  WorkflowStepTranslation,
  "uid" | "createdAt" | "updatedAt" | "workflowStep" | "field"
>;

export class WorkflowStepTranslationRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async upsertManyBodyTranslations(translations: Array<CreateWorkflowStepTranslation>) {
    return await Promise.all(
      translations.map((translation) => {
        return this.prismaClient.workflowStepTranslation.upsert({
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

  async upsertManySubjectTranslations(translations: Array<CreateWorkflowStepTranslation>) {
    return await Promise.all(
      translations.map((translation) => {
        return this.prismaClient.workflowStepTranslation.upsert({
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

  async findByLocale(
    workflowStepId: number,
    field: WorkflowStepAutoTranslatedField,
    targetLocale: string
  ): Promise<WorkflowStepTranslation | null> {
    return this.prismaClient.workflowStepTranslation.findUnique({
      where: {
        workflowStepId_field_targetLocale: {
          workflowStepId,
          field,
          targetLocale,
        },
      },
    });
  }

  async deleteByWorkflowStepId(workflowStepId: number) {
    return this.prismaClient.workflowStepTranslation.deleteMany({
      where: { workflowStepId },
    });
  }
}
