import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";

import { EditOrganizationOnboardingAction } from "../../../actions/organization/edit-organization-onboarding";
import { ADMIN_DI_TOKENS } from "../../tokens";
import { adminOrgOnboardingRepositoryModuleLoader } from "./admin-org-onboarding-repository.module";

const thisModule = createModule();
const token = ADMIN_DI_TOKENS.organization.EDIT_ONBOARDING_ACTION;
const moduleToken = ADMIN_DI_TOKENS.organization.EDIT_ONBOARDING_ACTION_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: EditOrganizationOnboardingAction,
  depsMap: {
    orgOnboardingRepo: adminOrgOnboardingRepositoryModuleLoader,
  },
});

export const editOrganizationOnboardingActionModuleLoader: ModuleLoader = {
  token,
  loadModule,
};
