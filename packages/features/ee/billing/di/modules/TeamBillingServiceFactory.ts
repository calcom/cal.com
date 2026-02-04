import { createModule, ModuleLoader, bindModuleToClassOnToken } from "@calcom/features/di/di";

import { TeamBillingServiceFactory } from "../../service/teams/TeamBillingServiceFactory";
import { DI_TOKENS } from "../tokens";
import { billingProviderServiceModuleLoader } from "./BillingProviderService";
import { billingRepositoryFactoryModuleLoader } from "./BillingRepositoryFactory";
import { isTeamBillingEnabledModuleLoader } from "./IsTeamBillingEnabled";
import { teamBillingDataRepositoryModuleLoader } from "./TeamBillingDataRepositoryFactory";

const teamBillingServiceFactoryModule = createModule();
const token = DI_TOKENS.TEAM_BILLING_SERVICE_FACTORY;
const moduleToken = DI_TOKENS.TEAM_BILLING_SERVICE_FACTORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: teamBillingServiceFactoryModule,
  moduleToken,
  token,
  classs: TeamBillingServiceFactory,
  depsMap: {
    billingProviderService: billingProviderServiceModuleLoader,
    teamBillingDataRepository: teamBillingDataRepositoryModuleLoader,
    billingRepositoryFactory: billingRepositoryFactoryModuleLoader,
    isTeamBillingEnabled: isTeamBillingEnabledModuleLoader,
  },
});

export const teamBillingServiceFactoryModuleLoader: ModuleLoader = {
  token: DI_TOKENS.TEAM_BILLING_SERVICE_FACTORY,
  loadModule,
};
