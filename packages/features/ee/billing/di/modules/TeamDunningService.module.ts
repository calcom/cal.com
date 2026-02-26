import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { TeamDunningService } from "@calcom/features/ee/billing/service/dunning/TeamDunningService";
import { DI_TOKENS } from "../tokens";
import { teamDunningRepositoryModuleLoader } from "./TeamDunningRepository.module";

const thisModule = createModule();
const token = DI_TOKENS.TEAM_DUNNING_SERVICE;
const moduleToken = DI_TOKENS.TEAM_DUNNING_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: TeamDunningService,
  depsMap: {
    dunningRepository: teamDunningRepositoryModuleLoader,
  },
});

export const teamDunningServiceModuleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { TeamDunningService };
