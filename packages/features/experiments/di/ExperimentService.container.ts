import { createContainer } from "@calcom/features/di/di";
import {
  type ExperimentService,
  moduleLoader as experimentServiceModuleLoader,
} from "./ExperimentService.module";

const experimentServiceContainer = createContainer();

export function getExperimentService(): ExperimentService {
  experimentServiceModuleLoader.loadModule(experimentServiceContainer);
  return experimentServiceContainer.get<ExperimentService>(experimentServiceModuleLoader.token);
}
