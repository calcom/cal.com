import type { TranslationSupportedLocale } from "@calcom/lib/translationConstants";

export type TranslationResult = {
  translatedText: string;
  targetLocale: TranslationSupportedLocale;
};

export type TranslateTextParams = {
  text: string;
  sourceLocale: string;
};

export type TranslateTextResult = {
  translations: TranslationResult[];
  failedLocales: string[];
};

export type EventTypeTranslationLookupResult = {
  translatedTitle?: string;
  translatedDescription?: string;
};

export type EventTypeTranslationLookupOptions = {
  includeTitle?: boolean;
  includeDescription?: boolean;
};

export interface ITranslationService {
  translateText(params: TranslateTextParams): Promise<TranslateTextResult>;
  getTargetLocales(sourceLocale: string): TranslationSupportedLocale[];
  getEventTypeTranslation(
    eventTypeId: number,
    targetLocale: string,
    options?: EventTypeTranslationLookupOptions
  ): Promise<EventTypeTranslationLookupResult>;
}
