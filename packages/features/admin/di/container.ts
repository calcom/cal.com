import { createContainer } from "@calcom/features/di/di";
import type { DeleteOrganizationOnboardingAction } from "../actions/delete-organization-onboarding";
import type { EditOrganizationOnboardingAction } from "../actions/edit-organization-onboarding";
import type { LockUserAccountAction } from "../actions/lock-user-account";
import { deleteOrganizationOnboardingActionModuleLoader } from "./modules/DeleteOrganizationOnboardingAction.module";
import { editOrganizationOnboardingActionModuleLoader } from "./modules/EditOrganizationOnboardingAction.module";
import { lockUserAccountActionModuleLoader } from "./modules/LockUserAccountAction.module";
import { ADMIN_DI_TOKENS } from "./tokens";

const container = createContainer();

export function getLockUserAccountAction(): LockUserAccountAction {
  lockUserAccountActionModuleLoader.loadModule(container);
  return container.get<LockUserAccountAction>(ADMIN_DI_TOKENS.LOCK_USER_ACCOUNT_ACTION);
}

export function getDeleteOrganizationOnboardingAction(): DeleteOrganizationOnboardingAction {
  deleteOrganizationOnboardingActionModuleLoader.loadModule(container);
  return container.get<DeleteOrganizationOnboardingAction>(ADMIN_DI_TOKENS.DELETE_ORG_ONBOARDING_ACTION);
}

export function getEditOrganizationOnboardingAction(): EditOrganizationOnboardingAction {
  editOrganizationOnboardingActionModuleLoader.loadModule(container);
  return container.get<EditOrganizationOnboardingAction>(ADMIN_DI_TOKENS.EDIT_ORG_ONBOARDING_ACTION);
}
