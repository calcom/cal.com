import { createContainer } from "@calcom/features/di/di";
import {
  type AbuseScoringService,
  moduleLoader as abuseScoringServiceModuleLoader,
} from "./AbuseScoringService.module";

const abuseScoringServiceContainer = createContainer();

export function getAbuseScoringService(): AbuseScoringService {
  abuseScoringServiceModuleLoader.loadModule(abuseScoringServiceContainer);

  return abuseScoringServiceContainer.get<AbuseScoringService>(abuseScoringServiceModuleLoader.token);
}
