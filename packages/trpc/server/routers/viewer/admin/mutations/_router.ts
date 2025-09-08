import { authedAdminProcedure } from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { toggleFeatureFlag } from "../toggleFeatureFlag.procedure";
import { ZCreateSelfHostedLicenseSchema } from "./createSelfHostedLicenseKey.schema";
import { ZAdminLockUserAccountSchema } from "./lockUserAccount.schema";
import { ZAdminRemoveTwoFactor } from "./removeTwoFactor.schema";
import { ZAdminPasswordResetSchema } from "./sendPasswordReset.schema";
import { ZSetSMSLockState } from "./setSMSLockState.schema";
import { ZAdminVerifyWorkflowsSchema } from "./verifyWorkflows.schema";
import { ZWhitelistUserWorkflows } from "./whitelistUserWorkflows.schema";
import {
  workspacePlatformCreateSchema,
  workspacePlatformUpdateSchema,
  workspacePlatformUpdateServiceAccountSchema,
  workspacePlatformToggleEnabledSchema,
} from "./workspacePlatform/schema";

export const adminMutationsRouter = router({
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
  workspacePlatform: router({
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
});
