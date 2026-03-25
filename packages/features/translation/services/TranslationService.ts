import type { WorkflowStepTranslationRepository } from "@calcom/features/ee/workflows/repositories/WorkflowStepTranslationRepository";
import type { EventTypeTranslationRepository } from "@calcom/features/eventTypeTranslation/repositories/EventTypeTranslationRepository";
import { locales as i18nLocales } from "@calcom/lib/i18n";
import logger from "@calcom/lib/logger";
import {
  TRANSLATION_SUPPORTED_LOCALES,
  type TranslationSupportedLocale,
} from "@calcom/lib/translationConstants";
import { EventTypeAutoTranslatedField, WorkflowStepAutoTranslatedField } from "@calcom/prisma/enums";
import type {
  EventTypeTranslationLookupOptions,
  EventTypeTranslationLookupResult,
  ITranslationService,
  TranslateTextParams,
  TranslateTextResult,
  TranslationResult,
  WorkflowStepTranslationLookupOptions,
  WorkflowStepTranslationLookupResult,
} from "./ITranslationService";

export interface ITranslationServiceDeps {
  localizeText: (text: string, sourceLocale: string, targetLocale: string) => Promise<string | null>;
  workflowStepTranslationRepository: WorkflowStepTranslationRepository;
  eventTypeTranslationRepository: EventTypeTranslationRepository;
}

export class TranslationService implements ITranslationService {
  constructor(private deps: ITranslationServiceDeps) {}

  getTargetLocales(sourceLocale: string): TranslationSupportedLocale[] {
    return TRANSLATION_SUPPORTED_LOCALES.filter(
      (locale) => locale !== sourceLocale && i18nLocales.includes(locale)
    );
  }

  async translateText(params: TranslateTextParams): Promise<TranslateTextResult> {
    const { text, sourceLocale } = params;

    if (!text?.trim()) {
      return { translations: [], failedLocales: [] };
    }

    const targetLocales = this.getTargetLocales(sourceLocale);
    const failedLocales: string[] = [];

    try {
      const translationPromises = targetLocales.map(async (targetLocale) => {
        const translatedText = await this.deps.localizeText(text, sourceLocale, targetLocale);
        return { translatedText, targetLocale };
      });

      const results = await Promise.all(translationPromises);

      const translations: TranslationResult[] = [];
      for (const result of results) {
        if (result.translatedText !== null) {
          translations.push({
            translatedText: result.translatedText,
            targetLocale: result.targetLocale,
          });
        } else {
          failedLocales.push(result.targetLocale);
        }
      }

      return { translations, failedLocales };
    } catch (error) {
      logger.error("TranslationService.translateText() failed:", error);
      return { translations: [], failedLocales: targetLocales };
    }
  }

  async getWorkflowStepTranslation(
    workflowStepId: number,
    targetLocale: string,
    options: WorkflowStepTranslationLookupOptions = { includeBody: true, includeSubject: false }
  ): Promise<WorkflowStepTranslationLookupResult> {
    const result: WorkflowStepTranslationLookupResult = {};
    const promises: Promise<void>[] = [];

    if (options.includeBody) {
      promises.push(
        this.deps.workflowStepTranslationRepository
          .findByLocale(workflowStepId, WorkflowStepAutoTranslatedField.REMINDER_BODY, targetLocale)
          .then((translation) => {
            if (translation?.translatedText) {
              result.translatedBody = translation.translatedText;
            }
          })
      );
    }

    if (options.includeSubject) {
      promises.push(
        this.deps.workflowStepTranslationRepository
          .findByLocale(workflowStepId, WorkflowStepAutoTranslatedField.EMAIL_SUBJECT, targetLocale)
          .then((translation) => {
            if (translation?.translatedText) {
              result.translatedSubject = translation.translatedText;
            }
          })
      );
    }

    await Promise.all(promises);
    return result;
  }

  async getEventTypeTranslation(
    eventTypeId: number,
    targetLocale: string,
    options: EventTypeTranslationLookupOptions = { includeTitle: false, includeDescription: true }
  ): Promise<EventTypeTranslationLookupResult> {
    const result: EventTypeTranslationLookupResult = {};
    const promises: Promise<void>[] = [];

    if (options.includeTitle) {
      promises.push(
        this.deps.eventTypeTranslationRepository
          .findByLocale(eventTypeId, EventTypeAutoTranslatedField.TITLE, targetLocale)
          .then((translation) => {
            if (translation?.translatedText) {
              result.translatedTitle = translation.translatedText;
            }
          })
      );
    }

    if (options.includeDescription) {
      promises.push(
        this.deps.eventTypeTranslationRepository
          .findByLocale(eventTypeId, EventTypeAutoTranslatedField.DESCRIPTION, targetLocale)
          .then((translation) => {
            if (translation?.translatedText) {
              result.translatedDescription = translation.translatedText;
            }
          })
      );
    }

    await Promise.all(promises);
    return result;
  }
}
