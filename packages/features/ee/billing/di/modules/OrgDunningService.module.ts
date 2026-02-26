import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { OrgDunningService } from "@calcom/features/ee/billing/service/dunning/OrgDunningService";
import { DI_TOKENS } from "../tokens";
import { orgDunningRepositoryModuleLoader } from "./OrgDunningRepository.module";

const thisModule = createModule();
const token = DI_TOKENS.ORG_DUNNING_SERVICE;
const moduleToken = DI_TOKENS.ORG_DUNNING_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: OrgDunningService,
  depsMap: {
    dunningRepository: orgDunningRepositoryModuleLoader,
  },
});

export const orgDunningServiceModuleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { OrgDunningService };
