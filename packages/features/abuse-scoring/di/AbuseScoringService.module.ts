import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as featureRepositoryModuleLoader } from "@calcom/features/flags/di/CachedFeatureRepository.module";
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
    featuresRepository: featureRepositoryModuleLoader,
    alerter: alerterModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { AbuseScoringService };
