import { z } from "zod";

import { locales as i18nLocales } from "@calcom/lib/i18n";
import logger from "@calcom/lib/logger";
import { WorkflowStepTranslationRepository } from "@calcom/lib/server/repository/workflowStepTranslation";
import { LingoDotDevService } from "@calcom/lib/server/service/lingoDotDev";
import { WorkflowStepTranslatedField } from "@calcom/prisma/enums";

export const ZTranslateWorkflowStepDataPayloadSchema = z.object({
  workflowStepId: z.number(),
  userId: z.number(),
  emailSubject: z.string().nullable().optional(),
  reminderBody: z.string().nullable().optional(),
  userLocale: z.string(),
});

const SUPPORTED_LOCALES = [
  "en", // English
  "es", // Spanish
  "de", // German
  "pt", // Portuguese
  "pt-BR", // Portuguese Brazilian
  "fr", // French
  "it", // Italian
  "ar", // Arabic
  "ru", // Russian
  "zh-CN", // Simplified Chinese
  "nl", // Dutch
  "zh-TW", // Traditional Chinese
  "ko", // Korean
  "ja", // Japanese
  "sv", // Swedish
  "da", // Danish
] as const;

async function processTranslations({
  text,
  userLocale,
  workflowStepId,
  userId,
  field,
}: {
  text: string;
  field: WorkflowStepTranslatedField;
} & z.infer<typeof ZTranslateWorkflowStepDataPayloadSchema>) {
  try {
    const targetLocales = SUPPORTED_LOCALES.filter(
      (locale) => locale !== userLocale && i18nLocales.includes(locale)
    );

    const translations = await Promise.all(
      targetLocales.map((targetLocale) => LingoDotDevService.localizeText(text, userLocale, targetLocale))
    );

    const validTranslations = translations
      .filter((trans): trans is string => trans !== null)
      .map((trans, index) => ({
        translatedText: trans,
        targetLocale: targetLocales[index],
      }));

    if (validTranslations.length > 0) {
      const translationData = validTranslations.map(({ translatedText, targetLocale }) => ({
        workflowStepId,
        sourceLocale: userLocale,
        targetLocale,
        translatedText,
        userId,
      }));

      const upsertMany =
        field === WorkflowStepTranslatedField.WORKFLOW_SUBJECT
          ? WorkflowStepTranslationRepository.upsertManyEmailSubjectTranslations
          : WorkflowStepTranslationRepository.upsertManyReminderBodyTranslations;

      await upsertMany(translationData);
    }
  } catch (error) {
    logger.error(`Failed to process ${field} translations:`, error);
  }
}

export async function translateWorkflowStepData(payload: string): Promise<void> {
  const { workflowStepId, emailSubject, reminderBody, userLocale, userId } =
    ZTranslateWorkflowStepDataPayloadSchema.parse(JSON.parse(payload));

  await Promise.all([
    emailSubject &&
      processTranslations({
        text: emailSubject,
        userLocale,
        workflowStepId,
        userId,
        field: WorkflowStepTranslatedField.WORKFLOW_SUBJECT,
      }),
    reminderBody &&
      processTranslations({
        text: reminderBody,
        userLocale,
        workflowStepId,
        userId,
        field: WorkflowStepTranslatedField.WORKFLOW_BODY,
      }),
  ]);
}
