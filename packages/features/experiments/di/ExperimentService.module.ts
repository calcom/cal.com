import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { ExperimentService } from "../services/ExperimentService";
import { moduleLoader as cachedExperimentRepositoryModuleLoader } from "./CachedExperimentRepository.module";
import { EXPERIMENTS_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = EXPERIMENTS_DI_TOKENS.EXPERIMENT_SERVICE;
const moduleToken = EXPERIMENTS_DI_TOKENS.EXPERIMENT_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: ExperimentService,
  depsMap: {
    experimentRepo: cachedExperimentRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { ExperimentService };
