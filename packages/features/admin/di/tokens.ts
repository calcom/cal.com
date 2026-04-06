export const ADMIN_DI_TOKENS = {
  user: {
    REPOSITORY: Symbol("AdminUserRepository"),
    REPOSITORY_MODULE: Symbol("AdminUserRepositoryModule"),
    LOCK_ACCOUNT_ACTION: Symbol("LockUserAccountAction"),
    LOCK_ACCOUNT_ACTION_MODULE: Symbol("LockUserAccountActionModule"),
    REMOVE_TWO_FACTOR_ACTION: Symbol("RemoveTwoFactorAction"),
    REMOVE_TWO_FACTOR_ACTION_MODULE: Symbol("RemoveTwoFactorActionModule"),
    UNBLOCK_SERVICE: Symbol("UserUnblockService"),
    UNBLOCK_SERVICE_MODULE: Symbol("UserUnblockServiceModule"),
  },

  workflow: {
    REPOSITORY: Symbol("AdminWorkflowRepository"),
    REPOSITORY_MODULE: Symbol("AdminWorkflowRepositoryModule"),
    VERIFY_ACTION: Symbol("VerifyWorkflowsAction"),
    VERIFY_ACTION_MODULE: Symbol("VerifyWorkflowsActionModule"),
    WHITELIST_ACTION: Symbol("WhitelistUserWorkflowsAction"),
    WHITELIST_ACTION_MODULE: Symbol("WhitelistUserWorkflowsActionModule"),
    REMINDER_REPOSITORY: Symbol("WorkflowReminderRepository"),
    REMINDER_REPOSITORY_MODULE: Symbol("WorkflowReminderRepositoryModule"),
    REMOVAL_SERVICE: Symbol("WorkflowRemovalService"),
    REMOVAL_SERVICE_MODULE: Symbol("WorkflowRemovalServiceModule"),
  },

  organization: {
    ONBOARDING_REPOSITORY: Symbol("AdminOrgOnboardingRepository"),
    ONBOARDING_REPOSITORY_MODULE: Symbol("AdminOrgOnboardingRepositoryModule"),
    DELETE_ONBOARDING_ACTION: Symbol("DeleteOrganizationOnboardingAction"),
    DELETE_ONBOARDING_ACTION_MODULE: Symbol(
      "DeleteOrganizationOnboardingActionModule"
    ),
    EDIT_ONBOARDING_ACTION: Symbol("EditOrganizationOnboardingAction"),
    EDIT_ONBOARDING_ACTION_MODULE: Symbol(
      "EditOrganizationOnboardingActionModule"
    ),
  },
};
