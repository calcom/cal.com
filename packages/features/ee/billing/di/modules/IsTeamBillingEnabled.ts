import { type Container, createModule, ModuleLoader } from "@calcom/features/di/di";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";

import { DI_TOKENS } from "../tokens";

const isTeamBillingEnabledModule = createModule();
const token = DI_TOKENS.IS_TEAM_BILLING_ENABLED;
isTeamBillingEnabledModule.bind(token).toFactory(() => {
  return IS_TEAM_BILLING_ENABLED;
});

export const isTeamBillingEnabledModuleLoader: ModuleLoader = {
  token,
  loadModule: function (container: Container) {
    container.load(token, isTeamBillingEnabledModule);
  },
};
