import { createContainer } from "@calcom/features/di/di";
import type { DeleteOrganizationOnboardingAction } from "../actions/delete-organization-onboarding";
import type { EditOrganizationOnboardingAction } from "../actions/edit-organization-onboarding";
import type { LockUserAccountAction } from "../actions/lock-user-account";
import type { RemoveTwoFactorAction } from "../actions/remove-two-factor";
import type { VerifyWorkflowsAction } from "../actions/verify-workflows";
import type { WhitelistUserWorkflowsAction } from "../actions/whitelist-user-workflows";
import { deleteOrganizationOnboardingActionModuleLoader } from "./modules/DeleteOrganizationOnboardingAction.module";
import { editOrganizationOnboardingActionModuleLoader } from "./modules/EditOrganizationOnboardingAction.module";
import { lockUserAccountActionModuleLoader } from "./modules/LockUserAccountAction.module";
import { removeTwoFactorActionModuleLoader } from "./modules/RemoveTwoFactorAction.module";
import { verifyWorkflowsActionModuleLoader } from "./modules/VerifyWorkflowsAction.module";
import { whitelistUserWorkflowsActionModuleLoader } from "./modules/whitelist-user-workflows-action.module";
import { ADMIN_DI_TOKENS } from "./tokens";

const container = createContainer();

export function getLockUserAccountAction(): LockUserAccountAction {
  lockUserAccountActionModuleLoader.loadModule(container);
  return container.get<LockUserAccountAction>(ADMIN_DI_TOKENS.LOCK_USER_ACCOUNT_ACTION);
}

export function getRemoveTwoFactorAction(): RemoveTwoFactorAction {
  removeTwoFactorActionModuleLoader.loadModule(container);
  return container.get<RemoveTwoFactorAction>(ADMIN_DI_TOKENS.REMOVE_TWO_FACTOR_ACTION);
}

export function getVerifyWorkflowsAction(): VerifyWorkflowsAction {
  verifyWorkflowsActionModuleLoader.loadModule(container);
  return container.get<VerifyWorkflowsAction>(ADMIN_DI_TOKENS.VERIFY_WORKFLOWS_ACTION);
}

export function getDeleteOrganizationOnboardingAction(): DeleteOrganizationOnboardingAction {
  deleteOrganizationOnboardingActionModuleLoader.loadModule(container);
  return container.get<DeleteOrganizationOnboardingAction>(ADMIN_DI_TOKENS.DELETE_ORG_ONBOARDING_ACTION);
}

export function getEditOrganizationOnboardingAction(): EditOrganizationOnboardingAction {
  editOrganizationOnboardingActionModuleLoader.loadModule(container);
  return container.get<EditOrganizationOnboardingAction>(ADMIN_DI_TOKENS.EDIT_ORG_ONBOARDING_ACTION);
}

export function getWhitelistUserWorkflowsAction(): WhitelistUserWorkflowsAction {
  whitelistUserWorkflowsActionModuleLoader.loadModule(container);
  return container.get<WhitelistUserWorkflowsAction>(ADMIN_DI_TOKENS.WHITELIST_USER_WORKFLOWS_ACTION);
}
