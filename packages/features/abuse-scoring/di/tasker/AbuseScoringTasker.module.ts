import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { AbuseScoringTasker } from "@calcom/features/abuse-scoring/lib/tasker/AbuseScoringTasker";

import { moduleLoader as syncTaskerModuleLoader } from "./AbuseScoringSyncTasker.module";
import { moduleLoader as triggerTaskerModuleLoader } from "./AbuseScoringTriggerTasker.module";
import { ABUSE_SCORING_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = ABUSE_SCORING_TASKER_DI_TOKENS.TASKER;
const moduleToken = ABUSE_SCORING_TASKER_DI_TOKENS.TASKER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: AbuseScoringTasker,
  depsMap: {
    logger: loggerServiceModule,
    syncTasker: syncTaskerModuleLoader,
    asyncTasker: triggerTaskerModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
