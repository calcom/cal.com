import { authedAdminProcedure } from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZAdminAssignFeatureToTeamSchema } from "./assignFeatureToTeam.schema";
import { ZCreateSelfHostedLicenseSchema } from "./createSelfHostedLicenseKey.schema";
import { ZAdminGetTeamsForFeatureSchema } from "./getTeamsForFeature.schema";
import {
  ZUpdateDeploymentSchema,
  ZSendLicenseEmailSchema,
  ZGetDeploymentStripeInfoSchema,
  ZUpdateLicenseKeySchema,
  ZGetLicenseKeyStripeInfoSchema,
} from "./license/deploymentMutations.schema";
import { ZListDeploymentsSchema } from "./license/listDeployments.schema";
import { ZListMembersSchema } from "./listPaginated.schema";
import { ZAdminLockUserAccountSchema } from "./lockUserAccount.schema";
import { ZAdminRemoveTwoFactor } from "./removeTwoFactor.schema";
import { ZAdminPasswordResetSchema } from "./sendPasswordReset.schema";
import { ZSetSMSLockState } from "./setSMSLockState.schema";
import { toggleFeatureFlag } from "./toggleFeatureFlag.procedure";
import { ZAdminUnassignFeatureFromTeamSchema } from "./unassignFeatureFromTeam.schema";
import { ZAdminVerifyWorkflowsSchema } from "./verifyWorkflows.schema";
import { ZWhitelistUserWorkflows } from "./whitelistUserWorkflows.schema";
import {
  workspacePlatformCreateSchema,
  workspacePlatformUpdateSchema,
  workspacePlatformUpdateServiceAccountSchema,
  workspacePlatformToggleEnabledSchema,
} from "./workspacePlatform/schema";

export const adminRouter = router({
  listPaginated: authedAdminProcedure.input(ZListMembersSchema).query(async (opts) => {
    const { default: handler } = await import("./listPaginated.handler");
    return handler(opts);
  }),
  sendPasswordReset: authedAdminProcedure.input(ZAdminPasswordResetSchema).mutation(async (opts) => {
    const { default: handler } = await import("./sendPasswordReset.handler");
    return handler(opts);
  }),
  lockUserAccount: authedAdminProcedure.input(ZAdminLockUserAccountSchema).mutation(async (opts) => {
    const { default: handler } = await import("./lockUserAccount.handler");
    return handler(opts);
  }),
  toggleFeatureFlag,
  removeTwoFactor: authedAdminProcedure.input(ZAdminRemoveTwoFactor).mutation(async (opts) => {
    const { default: handler } = await import("./removeTwoFactor.handler");
    return handler(opts);
  }),
  getSMSLockStateTeamsUsers: authedAdminProcedure.query(async (opts) => {
    const { default: handler } = await import("./getSMSLockStateTeamsUsers.handler");
    return handler(opts);
  }),
  setSMSLockState: authedAdminProcedure.input(ZSetSMSLockState).mutation(async (opts) => {
    const { default: handler } = await import("./setSMSLockState.handler");
    return handler(opts);
  }),
  createSelfHostedLicense: authedAdminProcedure
    .input(ZCreateSelfHostedLicenseSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./createSelfHostedLicenseKey.handler");
      return handler(opts);
    }),
  verifyWorkflows: authedAdminProcedure.input(ZAdminVerifyWorkflowsSchema).mutation(async (opts) => {
    const { default: handler } = await import("./verifyWorkflows.handler");
    return handler(opts);
  }),
  whitelistUserWorkflows: authedAdminProcedure.input(ZWhitelistUserWorkflows).mutation(async (opts) => {
    const { default: handler } = await import("./whitelistUserWorkflows.handler");
    return handler(opts);
  }),
  getTeamsForFeature: authedAdminProcedure.input(ZAdminGetTeamsForFeatureSchema).query(async (opts) => {
    const { default: handler } = await import("./getTeamsForFeature.handler");
    return handler(opts);
  }),
  assignFeatureToTeam: authedAdminProcedure.input(ZAdminAssignFeatureToTeamSchema).mutation(async (opts) => {
    const { default: handler } = await import("./assignFeatureToTeam.handler");
    return handler(opts);
  }),
  unassignFeatureFromTeam: authedAdminProcedure
    .input(ZAdminUnassignFeatureFromTeamSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./unassignFeatureFromTeam.handler");
      return handler(opts);
    }),
  workspacePlatform: router({
    list: authedAdminProcedure.query(async () => {
      const { default: handler } = await import("./workspacePlatform/list.handler");
      return handler();
    }),
    add: authedAdminProcedure.input(workspacePlatformCreateSchema).mutation(async (opts) => {
      const { default: handler } = await import("./workspacePlatform/add.handler");
      return handler(opts);
    }),
    update: authedAdminProcedure.input(workspacePlatformUpdateSchema).mutation(async (opts) => {
      const { default: handler } = await import("./workspacePlatform/update.handler");
      return handler(opts);
    }),
    updateServiceAccount: authedAdminProcedure
      .input(workspacePlatformUpdateServiceAccountSchema)
      .mutation(async (opts) => {
        const { default: handler } = await import("./workspacePlatform/updateServiceAccount.handler");
        return handler(opts);
      }),
    toggleEnabled: authedAdminProcedure.input(workspacePlatformToggleEnabledSchema).mutation(async (opts) => {
      const { default: handler } = await import("./workspacePlatform/toggleEnabled.handler");
      return handler(opts);
    }),
  }),
  license: router({
    listDeployments: authedAdminProcedure.input(ZListDeploymentsSchema).query(async (opts) => {
      const { default: handler } = await import("./license/listDeployments.handler");
      return handler(opts);
    }),
    updateDeployment: authedAdminProcedure.input(ZUpdateDeploymentSchema).mutation(async (opts) => {
      const { updateDeploymentHandler } = await import("./license/deploymentMutations.handler");
      return updateDeploymentHandler(opts);
    }),
    sendLicenseEmail: authedAdminProcedure.input(ZSendLicenseEmailSchema).mutation(async (opts) => {
      const { sendLicenseEmailHandler } = await import("./license/deploymentMutations.handler");
      return sendLicenseEmailHandler(opts);
    }),
    getDeploymentStripeInfo: authedAdminProcedure
      .input(ZGetDeploymentStripeInfoSchema)
      .query(async (opts) => {
        const { getDeploymentStripeInfoHandler } = await import("./license/deploymentMutations.handler");
        return getDeploymentStripeInfoHandler(opts);
      }),
    updateLicenseKey: authedAdminProcedure.input(ZUpdateLicenseKeySchema).mutation(async (opts) => {
      const { updateLicenseKeyHandler } = await import("./license/deploymentMutations.handler");
      return updateLicenseKeyHandler(opts);
    }),
    getLicenseKeyStripeInfo: authedAdminProcedure
      .input(ZGetLicenseKeyStripeInfoSchema)
      .query(async (opts) => {
        const { getLicenseKeyStripeInfoHandler } = await import("./license/deploymentMutations.handler");
        return getLicenseKeyStripeInfoHandler(opts);
      }),
  }),
});
