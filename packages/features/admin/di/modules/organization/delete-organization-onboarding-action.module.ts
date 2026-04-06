import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";

import { DeleteOrganizationOnboardingAction } from "../../../actions/organization/delete-organization-onboarding";
import { ADMIN_DI_TOKENS } from "../../tokens";
import { adminOrgOnboardingRepositoryModuleLoader } from "./admin-org-onboarding-repository.module";

const thisModule = createModule();
const token = ADMIN_DI_TOKENS.organization.DELETE_ONBOARDING_ACTION;
const moduleToken = ADMIN_DI_TOKENS.organization.DELETE_ONBOARDING_ACTION_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: DeleteOrganizationOnboardingAction,
  depsMap: {
    orgOnboardingRepo: adminOrgOnboardingRepositoryModuleLoader,
  },
});

export const deleteOrganizationOnboardingActionModuleLoader: ModuleLoader = {
  token,
  loadModule,
};
