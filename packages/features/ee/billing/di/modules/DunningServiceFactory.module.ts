import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { DunningServiceFactory } from "@calcom/features/ee/billing/service/dunning/DunningServiceFactory";
import { DI_TOKENS } from "../tokens";
import { orgBillingRepositoryModuleLoader } from "./OrgBillingRepository.module";
import { orgDunningServiceModuleLoader } from "./OrgDunningService.module";
import { teamBillingRepositoryModuleLoader } from "./TeamBillingRepository.module";
import { teamDunningServiceModuleLoader } from "./TeamDunningService.module";

const thisModule = createModule();
const token = DI_TOKENS.DUNNING_SERVICE_FACTORY;
const moduleToken = DI_TOKENS.DUNNING_SERVICE_FACTORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: DunningServiceFactory,
  depsMap: {
    teamDunningService: teamDunningServiceModuleLoader,
    orgDunningService: orgDunningServiceModuleLoader,
    teamBillingRepository: teamBillingRepositoryModuleLoader,
    orgBillingRepository: orgBillingRepositoryModuleLoader,
  },
});

export const dunningServiceFactoryModuleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { DunningServiceFactory };
