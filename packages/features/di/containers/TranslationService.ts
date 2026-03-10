import type { ITranslationService } from "@calcom/features/translation/services/ITranslationService";
import { createContainer } from "../di";
import { moduleLoader as translationServiceModuleLoader } from "../modules/TranslationService";

const translationServiceContainer = createContainer();

export function getTranslationService(): Promise<ITranslationService> {
  translationServiceModuleLoader.loadModule(translationServiceContainer);
  return translationServiceContainer.get<Promise<ITranslationService>>(translationServiceModuleLoader.token);
}
