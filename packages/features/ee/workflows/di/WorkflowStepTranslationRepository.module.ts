import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { TRANSLATION_DI_TOKENS } from "@calcom/features/translation/di/tokens";

import { WorkflowStepTranslationRepository } from "../repositories/WorkflowStepTranslationRepository";

const thisModule = createModule();
const token = TRANSLATION_DI_TOKENS.WORKFLOW_STEP_TRANSLATION_REPOSITORY;
const moduleToken = TRANSLATION_DI_TOKENS.WORKFLOW_STEP_TRANSLATION_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: WorkflowStepTranslationRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { WorkflowStepTranslationRepository };
