import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { AbuseScoringTaskService } from "@calcom/features/abuse-scoring/lib/tasker/AbuseScoringTaskService";

import { moduleLoader as abuseScoringServiceModuleLoader } from "../AbuseScoringService.module";
import { ABUSE_SCORING_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = ABUSE_SCORING_TASKER_DI_TOKENS.TASK_SERVICE;
const moduleToken = ABUSE_SCORING_TASKER_DI_TOKENS.TASK_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: AbuseScoringTaskService,
  depsMap: {
    logger: loggerServiceModule,
    abuseScoringService: abuseScoringServiceModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
