import { createContainer } from "@calcom/features/di/di";

import type { LockUserAccountAction } from "../actions/user/lock-user-account";
import type { RemoveTwoFactorAction } from "../actions/user/remove-two-factor";
import type { VerifyWorkflowsAction } from "../actions/workflow/verify-workflows";
import type { WhitelistUserWorkflowsAction } from "../actions/workflow/whitelist-user-workflows";
import type { DeleteOrganizationOnboardingAction } from "../actions/organization/delete-organization-onboarding";
import type { EditOrganizationOnboardingAction } from "../actions/organization/edit-organization-onboarding";

import { lockUserAccountActionModuleLoader } from "./modules/user/lock-user-account-action.module";
import { removeTwoFactorActionModuleLoader } from "./modules/user/remove-two-factor-action.module";
import { verifyWorkflowsActionModuleLoader } from "./modules/workflow/verify-workflows-action.module";
import { whitelistUserWorkflowsActionModuleLoader } from "./modules/workflow/whitelist-user-workflows-action.module";
import { deleteOrganizationOnboardingActionModuleLoader } from "./modules/organization/delete-organization-onboarding-action.module";
import { editOrganizationOnboardingActionModuleLoader } from "./modules/organization/edit-organization-onboarding-action.module";
import { ADMIN_DI_TOKENS } from "./tokens";

const container = createContainer();

export function getLockUserAccountAction(): LockUserAccountAction {
  lockUserAccountActionModuleLoader.loadModule(container);
  return container.get<LockUserAccountAction>(
    ADMIN_DI_TOKENS.user.LOCK_ACCOUNT_ACTION
  );
}

export function getRemoveTwoFactorAction(): RemoveTwoFactorAction {
  removeTwoFactorActionModuleLoader.loadModule(container);
  return container.get<RemoveTwoFactorAction>(
    ADMIN_DI_TOKENS.user.REMOVE_TWO_FACTOR_ACTION
  );
}

export function getVerifyWorkflowsAction(): VerifyWorkflowsAction {
  verifyWorkflowsActionModuleLoader.loadModule(container);
  return container.get<VerifyWorkflowsAction>(
    ADMIN_DI_TOKENS.workflow.VERIFY_ACTION
  );
}

export function getWhitelistUserWorkflowsAction(): WhitelistUserWorkflowsAction {
  whitelistUserWorkflowsActionModuleLoader.loadModule(container);
  return container.get<WhitelistUserWorkflowsAction>(
    ADMIN_DI_TOKENS.workflow.WHITELIST_ACTION
  );
}

export function getDeleteOrganizationOnboardingAction(): DeleteOrganizationOnboardingAction {
  deleteOrganizationOnboardingActionModuleLoader.loadModule(container);
  return container.get<DeleteOrganizationOnboardingAction>(
    ADMIN_DI_TOKENS.organization.DELETE_ONBOARDING_ACTION
  );
}

export function getEditOrganizationOnboardingAction(): EditOrganizationOnboardingAction {
  editOrganizationOnboardingActionModuleLoader.loadModule(container);
  return container.get<EditOrganizationOnboardingAction>(
    ADMIN_DI_TOKENS.organization.EDIT_ONBOARDING_ACTION
  );
}
