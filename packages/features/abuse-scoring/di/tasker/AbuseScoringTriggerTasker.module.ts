import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { AbuseScoringTriggerTasker } from "@calcom/features/abuse-scoring/lib/tasker/AbuseScoringTriggerTasker";

import { ABUSE_SCORING_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = ABUSE_SCORING_TASKER_DI_TOKENS.TRIGGER_TASKER;
const moduleToken = ABUSE_SCORING_TASKER_DI_TOKENS.TRIGGER_TASKER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: AbuseScoringTriggerTasker,
  depsMap: {
    logger: loggerServiceModule,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
