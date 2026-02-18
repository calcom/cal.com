import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as featuresRepositoryModuleLoader } from "@calcom/features/di/modules/FeaturesRepository";
import { AbuseScoringService } from "../services/AbuseScoringService";
import { moduleLoader as repositoryModuleLoader } from "./AbuseScoringRepository.module";
import { moduleLoader as alerterModuleLoader } from "./SlackAbuseAlerter.module";
import { ABUSE_SCORING_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = ABUSE_SCORING_DI_TOKENS.SERVICE;
const moduleToken = ABUSE_SCORING_DI_TOKENS.SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: AbuseScoringService,
  depsMap: {
    repository: repositoryModuleLoader,
    featuresRepository: featuresRepositoryModuleLoader,
    alerter: alerterModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { AbuseScoringService };
