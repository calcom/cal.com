import { moduleLoader as workflowStepTranslationRepositoryModuleLoader } from "@calcom/features/ee/workflows/di/WorkflowStepTranslationRepository.module";
import type { WorkflowStepTranslationRepository } from "@calcom/features/ee/workflows/repositories/WorkflowStepTranslationRepository";
import { moduleLoader as eventTypeTranslationRepositoryModuleLoader } from "@calcom/features/eventTypeTranslation/di/EventTypeTranslationRepository.module";
import type { EventTypeTranslationRepository } from "@calcom/features/eventTypeTranslation/repositories/EventTypeTranslationRepository";
import { TRANSLATION_DI_TOKENS } from "@calcom/features/translation/di/tokens";
import { TranslationService } from "@calcom/features/translation/services/TranslationService";
import type { Container } from "@evyweb/ioctopus";
import { createModule, type ModuleLoader } from "../di";

const token: symbol = TRANSLATION_DI_TOKENS.TRANSLATION_SERVICE;
const moduleToken: symbol = TRANSLATION_DI_TOKENS.TRANSLATION_SERVICE_MODULE;

const loadModule = (container: Container) => {
  workflowStepTranslationRepositoryModuleLoader.loadModule(container);
  eventTypeTranslationRepositoryModuleLoader.loadModule(container);

  const workflowStepTranslationRepository = container.get<WorkflowStepTranslationRepository>(
    TRANSLATION_DI_TOKENS.WORKFLOW_STEP_TRANSLATION_REPOSITORY
  );
  const eventTypeTranslationRepository = container.get<EventTypeTranslationRepository>(
    TRANSLATION_DI_TOKENS.EVENT_TYPE_TRANSLATION_REPOSITORY
  );

  const thisModule = createModule();
  thisModule.bind(token).toFactory(async () => {
    const { LingoDotDevService } = await import("@calcom/lib/server/service/lingoDotDev");
    return new TranslationService({
      localizeText: (text, sourceLocale, targetLocale) =>
        LingoDotDevService.localizeText(text, sourceLocale, targetLocale),
      workflowStepTranslationRepository,
      eventTypeTranslationRepository,
    });
  });

  container.load(moduleToken, thisModule);
};

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { TranslationService };
