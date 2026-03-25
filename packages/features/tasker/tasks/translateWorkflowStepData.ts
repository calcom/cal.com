import { getTranslationService } from "@calcom/features/di/containers/TranslationService";
import { getWorkflowStepTranslationRepository } from "@calcom/features/ee/workflows/di/WorkflowStepTranslationRepository.container";
import { WorkflowStepRepository } from "@calcom/features/ee/workflows/repositories/WorkflowStepRepository";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { WorkflowStepAutoTranslatedField } from "@calcom/prisma/enums";
import { z } from "zod";

const ZTranslateWorkflowStepDataPayloadSchema = z.object({
  workflowStepId: z.number(),
  reminderBody: z.string().nullable().optional(),
  emailSubject: z.string().nullable().optional(),
  sourceLocale: z.string(),
});

async function processTranslations({
  text,
  sourceLocale,
  workflowStepId,
  field,
}: {
  text: string;
  sourceLocale: string;
  workflowStepId: number;
  field: WorkflowStepAutoTranslatedField;
}): Promise<void> {
  try {
    const translationService = await getTranslationService();
    const result = await translationService.translateText({ text, sourceLocale });

    if (result.translations.length > 0) {
      const translationData = result.translations.map(({ translatedText, targetLocale }) => ({
        workflowStepId,
        sourceLocale,
        targetLocale,
        translatedText,
      }));

      const workflowStepTranslationRepository = getWorkflowStepTranslationRepository();
      if (field === WorkflowStepAutoTranslatedField.REMINDER_BODY) {
        await workflowStepTranslationRepository.upsertManyBodyTranslations(translationData);
      } else {
        await workflowStepTranslationRepository.upsertManySubjectTranslations(translationData);
      }
    }

    if (result.failedLocales.length > 0) {
      logger.warn(
        `Failed to translate workflow step ${field} to locales: ${result.failedLocales.join(", ")}`
      );
    }
  } catch (error) {
    logger.error(`Failed to process workflow step ${field} translations:`, error);
  }
}

async function translateWorkflowStepData(payload: string): Promise<void> {
  const { workflowStepId, reminderBody, emailSubject, sourceLocale } =
    ZTranslateWorkflowStepDataPayloadSchema.parse(JSON.parse(payload));

  const workflowStepRepository = new WorkflowStepRepository(prisma);
  const workflowStep = await workflowStepRepository.findTranslationDataById(workflowStepId);

  if (!workflowStep) {
    logger.warn(`Workflow step ${workflowStepId} not found for translation task`);
    return;
  }

  const sourceLocaleMatches = workflowStep.sourceLocale === sourceLocale;
  const shouldTranslateBody =
    Boolean(reminderBody) && sourceLocaleMatches && workflowStep.reminderBody === reminderBody;
  const shouldTranslateSubject =
    Boolean(emailSubject) && sourceLocaleMatches && workflowStep.emailSubject === emailSubject;

  if (!shouldTranslateBody && !shouldTranslateSubject) {
    logger.info(`Skipping stale translation task for workflow step ${workflowStepId}`);
    return;
  }

  await Promise.all([
    shouldTranslateBody &&
      processTranslations({
        text: reminderBody as string,
        sourceLocale,
        workflowStepId,
        field: WorkflowStepAutoTranslatedField.REMINDER_BODY,
      }),
    shouldTranslateSubject &&
      processTranslations({
        text: emailSubject as string,
        sourceLocale,
        workflowStepId,
        field: WorkflowStepAutoTranslatedField.EMAIL_SUBJECT,
      }),
  ]);
}

export { ZTranslateWorkflowStepDataPayloadSchema, translateWorkflowStepData };
