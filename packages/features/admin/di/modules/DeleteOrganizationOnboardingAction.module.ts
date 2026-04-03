import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { DeleteOrganizationOnboardingAction } from "../../actions/delete-organization-onboarding";
import { ADMIN_DI_TOKENS } from "../tokens";
import { adminOrgOnboardingRepositoryModuleLoader } from "./AdminOrgOnboardingRepository.module";

const thisModule = createModule();
const token = ADMIN_DI_TOKENS.DELETE_ORG_ONBOARDING_ACTION;
const moduleToken = ADMIN_DI_TOKENS.DELETE_ORG_ONBOARDING_ACTION_MODULE;

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
