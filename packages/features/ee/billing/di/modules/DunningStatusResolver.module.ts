import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as teamRepositoryModuleLoader } from "@calcom/features/oauth/di/TeamRepository.module";
import { DunningStatusResolver } from "@calcom/features/ee/billing/service/dunning/DunningStatusResolver";
import { DI_TOKENS } from "../tokens";
import { orgBillingRepositoryModuleLoader } from "./OrgBillingRepository.module";
import { orgDunningServiceModuleLoader } from "./OrgDunningService.module";
import { teamBillingRepositoryModuleLoader } from "./TeamBillingRepository.module";
import { teamDunningServiceModuleLoader } from "./TeamDunningService.module";

const thisModule = createModule();
const token = DI_TOKENS.DUNNING_STATUS_RESOLVER;
const moduleToken = DI_TOKENS.DUNNING_STATUS_RESOLVER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: DunningStatusResolver,
  depsMap: {
    teamDunningService: teamDunningServiceModuleLoader,
    orgDunningService: orgDunningServiceModuleLoader,
    teamRepository: teamRepositoryModuleLoader,
    teamBillingRepository: teamBillingRepositoryModuleLoader,
    orgBillingRepository: orgBillingRepositoryModuleLoader,
  },
});

export const dunningStatusResolverModuleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { DunningStatusResolver };
