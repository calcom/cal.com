import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { AbuseScoringSyncTasker } from "@calcom/features/abuse-scoring/lib/tasker/AbuseScoringSyncTasker";

import { moduleLoader as taskServiceModuleLoader } from "./AbuseScoringTaskService.module";
import { ABUSE_SCORING_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = ABUSE_SCORING_TASKER_DI_TOKENS.SYNC_TASKER;
const moduleToken = ABUSE_SCORING_TASKER_DI_TOKENS.SYNC_TASKER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: AbuseScoringSyncTasker,
  depsMap: {
    logger: loggerServiceModule,
    abuseScoringTaskService: taskServiceModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
