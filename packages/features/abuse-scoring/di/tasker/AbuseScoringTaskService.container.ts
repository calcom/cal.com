import { createContainer } from "@calcom/features/di/di";
import { AbuseScoringTaskService } from "@calcom/features/abuse-scoring/lib/tasker/AbuseScoringTaskService";

import { moduleLoader as taskServiceModuleLoader } from "./AbuseScoringTaskService.module";

const container = createContainer();

export function getAbuseScoringTaskService(): AbuseScoringTaskService {
  taskServiceModuleLoader.loadModule(container);
  return container.get<AbuseScoringTaskService>(taskServiceModuleLoader.token);
}
