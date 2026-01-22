import { z } from "zod";

import { WorkflowStepTranslationRepository } from "@calcom/features/ee/workflows/repositories/WorkflowStepTranslationRepository";
import { locales as i18nLocales } from "@calcom/lib/i18n";
import logger from "@calcom/lib/logger";
import { WorkflowStepAutoTranslatedField } from "@calcom/prisma/enums";

const ZTranslateWorkflowStepDataPayloadSchema = z.object({
  workflowStepId: z.number(),
  reminderBody: z.string().nullable().optional(),
  emailSubject: z.string().nullable().optional(),
  userLocale: z.string(),
});

const SUPPORTED_LOCALES = [
  "en",
  "es",
  "de",
  "pt",
  "pt-BR",
  "fr",
  "it",
  "ar",
  "ru",
  "zh-CN",
  "nl",
  "zh-TW",
  "ko",
  "ja",
  "sv",
  "da",
  "is",
  "lt",
  "nb",
] as const;

type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

async function processTranslations({
  text,
  userLocale,
  workflowStepId,
  field,
}: {
  text: string;
  field: WorkflowStepAutoTranslatedField;
} & Pick<z.infer<typeof ZTranslateWorkflowStepDataPayloadSchema>, "userLocale" | "workflowStepId">): Promise<void> {
  const { LingoDotDevService } = await import("@calcom/lib/server/service/lingoDotDev");

  try {
    const targetLocales = SUPPORTED_LOCALES.filter(
      (locale) => locale !== userLocale && i18nLocales.includes(locale)
    );

    const translations = await Promise.all(
      targetLocales.map((targetLocale) => LingoDotDevService.localizeText(text, userLocale, targetLocale))
    );

    const translationsWithLocales = translations.map((trans, index) => ({
      translatedText: trans,
      targetLocale: targetLocales[index],
    }));

    const validTranslations = translationsWithLocales.filter(
      (item): item is { translatedText: string; targetLocale: SupportedLocale } => item.translatedText !== null
    );

    if (validTranslations.length > 0) {
      const translationData = validTranslations.map(({ translatedText, targetLocale }) => ({
        workflowStepId,
        sourceLocale: userLocale,
        targetLocale,
        translatedText,
      }));

      if (field === WorkflowStepAutoTranslatedField.REMINDER_BODY) {
        await WorkflowStepTranslationRepository.upsertManyBodyTranslations(translationData);
      } else {
        await WorkflowStepTranslationRepository.upsertManySubjectTranslations(translationData);
      }
    }
  } catch (error) {
    logger.error(`Failed to process workflow step ${field} translations:`, error);
  }
}

async function translateWorkflowStepData(payload: string): Promise<void> {
  const { workflowStepId, reminderBody, emailSubject, userLocale } =
    ZTranslateWorkflowStepDataPayloadSchema.parse(JSON.parse(payload));

  await Promise.all([
    reminderBody &&
      processTranslations({
        text: reminderBody,
        userLocale,
        workflowStepId,
        field: WorkflowStepAutoTranslatedField.REMINDER_BODY,
      }),
    emailSubject &&
      processTranslations({
        text: emailSubject,
        userLocale,
        workflowStepId,
        field: WorkflowStepAutoTranslatedField.EMAIL_SUBJECT,
      }),
  ]);
}

export { ZTranslateWorkflowStepDataPayloadSchema, translateWorkflowStepData };
