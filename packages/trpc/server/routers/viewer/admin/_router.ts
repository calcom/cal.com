import { createAdminDataViewRouter } from "@calcom/features/admin-dataview/server/trpc-router";

import { authedAdminProcedure } from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { z } from "zod";

import { ZAdminAssignFeatureToTeamSchema } from "./assignFeatureToTeam.schema";
import { ZBillingPortalLinkSchema } from "./billingPortalLink.schema";
import { ZCreateCouponSchema } from "./createCoupon.schema";
import { ZCreateSelfHostedLicenseSchema } from "./createSelfHostedLicenseKey.schema";
import { ZGetDeploymentInfoSchema } from "./getDeploymentInfo.schema";
import { ZAdminGetTeamsForFeatureSchema } from "./getTeamsForFeature.schema";
import { ZListMembersSchema } from "./listPaginated.schema";
import { ZAdminLockUserAccountSchema } from "./lockUserAccount.schema";
import { ZLookupBillingCustomerSchema } from "./lookupBillingCustomer.schema";
import { ZRefreshDunningSchema } from "./refreshDunning.schema";
import { ZAdminRemoveTwoFactor } from "./removeTwoFactor.schema";
import { ZResendPurchaseCompleteEmailSchema } from "./resendPurchaseCompleteEmail.schema";
import { ZAdminPasswordResetSchema } from "./sendPasswordReset.schema";
import { ZSetSMSLockState } from "./setSMSLockState.schema";
import { toggleFeatureFlag } from "./toggleFeatureFlag.procedure";
import { ZGetTeamOwnersSchema } from "./getTeamOwners.schema";
import { ZSearchUsersByEmailSchema } from "./searchUsersByEmail.schema";
import { ZTransferBillingSchema } from "./transferBilling.schema";
import { ZRecreateOwnershipSchema } from "./recreateOwnership.schema";
import { ZTransferOwnershipSchema } from "./transferOwnership.schema";
import { ZAdminUnassignFeatureFromTeamSchema } from "./unassignFeatureFromTeam.schema";
import { ZUpdateBillingModeSchema } from "./updateBillingMode.schema";
import { ZUpdateDeploymentBillingSchema } from "./updateDeploymentBilling.schema";
import { ZAdminVerifyWorkflowsSchema } from "./verifyWorkflows.schema";
import { abuseRulesRouter } from "./abuseRules/_router";
import { abuseScoringRouter } from "./abuseScoring/_router";
import { watchlistRouter } from "./watchlist/_router";
import { ZWhitelistUserWorkflows } from "./whitelistUserWorkflows.schema";
import {
  workspacePlatformCreateSchema,
  workspacePlatformToggleEnabledSchema,
  workspacePlatformUpdateSchema,
  workspacePlatformUpdateServiceAccountSchema,
} from "./workspacePlatform/schema";
import { experimentsRouter } from "./experiments/_router";

const NAMESPACE = "admin";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

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
  createCoupon: authedAdminProcedure.input(ZCreateCouponSchema).mutation(async (opts) => {
    const { default: handler } = await import("./createCoupon.handler");
    return handler(opts);
  }),
  resendPurchaseCompleteEmail: authedAdminProcedure
    .input(ZResendPurchaseCompleteEmailSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./resendPurchaseCompleteEmail.handler");
      return handler(opts);
    }),
  billingPortalLink: authedAdminProcedure.input(ZBillingPortalLinkSchema).mutation(async (opts) => {
    const { default: handler } = await import("./billingPortalLink.handler");
    return handler(opts);
  }),
  getDeploymentInfo: authedAdminProcedure.input(ZGetDeploymentInfoSchema).query(async (opts) => {
    const { default: handler } = await import("./getDeploymentInfo.handler");
    return handler(opts);
  }),
  updateDeploymentBilling: authedAdminProcedure
    .input(ZUpdateDeploymentBillingSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./updateDeploymentBilling.handler");
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
  lookupBillingCustomer: authedAdminProcedure.input(ZLookupBillingCustomerSchema).query(async (opts) => {
    const { default: handler } = await import("./lookupBillingCustomer.handler");
    return handler(opts);
  }),
  refreshDunning: authedAdminProcedure.input(ZRefreshDunningSchema).mutation(async (opts) => {
    const { default: handler } = await import("./refreshDunning.handler");
    return handler(opts);
  }),
  transferBilling: authedAdminProcedure.input(ZTransferBillingSchema).mutation(async (opts) => {
    const { default: handler } = await import("./transferBilling.handler");
    return handler(opts);
  }),
  experiments: experimentsRouter,
  searchUsersByEmail: authedAdminProcedure.input(ZSearchUsersByEmailSchema).query(async (opts) => {
    const { default: handler } = await import("./searchUsersByEmail.handler");
    return handler(opts);
  }),
  getTeamOwners: authedAdminProcedure.input(ZGetTeamOwnersSchema).query(async (opts) => {
    const { default: handler } = await import("./getTeamOwners.handler");
    return handler(opts);
  }),
  transferOwnership: authedAdminProcedure.input(ZTransferOwnershipSchema).mutation(async (opts) => {
    const { default: handler } = await import("./transferOwnership.handler");
    return handler(opts);
  }),
  recreateOwnership: authedAdminProcedure.input(ZRecreateOwnershipSchema).mutation(async (opts) => {
    const { default: handler } = await import("./recreateOwnership.handler");
    return handler(opts);
  }),
  updateBillingMode: authedAdminProcedure.input(ZUpdateBillingModeSchema).mutation(async (opts) => {
    const { default: handler } = await import("./updateBillingMode.handler");
    return handler(opts);
  }),
  abuseRules: abuseRulesRouter,
  abuseScoring: abuseScoringRouter,
  watchlist: watchlistRouter,
  dataview: createAdminDataViewRouter(router, authedAdminProcedure),
  globalSearch: authedAdminProcedure
    .input(z.object({ query: z.string().min(1).max(200) }))
    .query(async ({ input }) => {
      const { getAdminDataViewService } = await import(
        "@calcom/features/admin-dataview/di/container"
      );
      const service = getAdminDataViewService();
      return service.globalSearch(input.query);
    }),
});
