import { createContainer } from "@calcom/features/di/di";
import { AbuseScoringTasker } from "@calcom/features/abuse-scoring/lib/tasker/AbuseScoringTasker";

import { moduleLoader as taskerModuleLoader } from "./AbuseScoringTasker.module";

const container = createContainer();

export function getAbuseScoringTasker(): AbuseScoringTasker {
  taskerModuleLoader.loadModule(container);
  return container.get<AbuseScoringTasker>(taskerModuleLoader.token);
}
