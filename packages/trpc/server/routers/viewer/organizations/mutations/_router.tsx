import { createPhoneCallSchema } from "@calcom/features/calAIPhone/zod-utils";
import { ZVerifyCodeInputSchema } from "@calcom/prisma/zod-utils";

import authedProcedure, {
  authedAdminProcedure,
  authedOrgAdminProcedure,
} from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { eventOwnerProcedure } from "../../eventTypes/util";
import { ZAddMembersToEventTypes } from "./addMembersToEventTypes.schema";
import { ZAddMembersToTeams } from "./addMembersToTeams.schema";
import { ZAdminDeleteInput } from "./adminDelete.schema";
import { ZAdminUpdate } from "./adminUpdate.schema";
import { ZAdminVerifyInput } from "./adminVerify.schema";
import { ZBulkUsersDelete } from "./bulkDeleteUsers.schema";
import { ZCreateInputSchema } from "./create.schema";
import { ZCreateSelfHostedInputSchema } from "./createSelfHosted.schema";
import { ZCreateTeamsSchema } from "./createTeams.schema";
import { ZCreateWithPaymentIntentInputSchema } from "./createWithPaymentIntent.schema";
import { ZDeleteTeamInputSchema } from "./deleteTeam.schema";
import { ZIntentToCreateOrgInputSchema } from "./intentToCreateOrg.schema";
import { ZRemoveHostsFromEventTypes } from "./removeHostsFromEventTypes.schema";
import { ZSetPasswordSchema } from "./setPassword.schema";
import { ZUpdateInputSchema } from "./update.schema";
import { ZUpdateUserInputSchema } from "./updateUser.schema";

export const organizationsMutationsRouter = router({
  create: authedProcedure.input(ZCreateInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./create.handler");
    return handler(opts);
  }),

  intentToCreateOrg: authedProcedure.input(ZIntentToCreateOrgInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./intentToCreateOrg.handler");
    return handler(opts);
  }),

  createWithPaymentIntent: authedProcedure
    .input(ZCreateWithPaymentIntentInputSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./createWithPaymentIntent.handler");
      return handler(opts);
    }),

  update: authedProcedure.input(ZUpdateInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./update.handler");
    return handler(opts);
  }),

  verifyCode: authedProcedure.input(ZVerifyCodeInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./verifyCode.handler");
    return handler(opts);
  }),

  createTeams: authedProcedure.input(ZCreateTeamsSchema).mutation(async (opts) => {
    const { default: handler } = await import("./createTeams.handler");
    return handler(opts);
  }),

  publish: authedProcedure.mutation(async (opts) => {
    const { default: handler } = await import("./publish.handler");
    return handler(opts);
  }),

  setPassword: authedProcedure.input(ZSetPasswordSchema).mutation(async (opts) => {
    const { default: handler } = await import("./setPassword.handler");
    return handler(opts);
  }),

  updateUser: authedProcedure.input(ZUpdateUserInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./updateUser.handler");
    return handler(opts);
  }),

  addMembersToTeams: authedProcedure.input(ZAddMembersToTeams).mutation(async (opts) => {
    const { default: handler } = await import("./addMembersToTeams.handler");
    return handler(opts);
  }),

  addMembersToEventTypes: authedProcedure.input(ZAddMembersToEventTypes).mutation(async (opts) => {
    const { default: handler } = await import("./addMembersToEventTypes.handler");
    return handler(opts);
  }),

  removeHostsFromEventTypes: authedProcedure.input(ZRemoveHostsFromEventTypes).mutation(async (opts) => {
    const { default: handler } = await import("./removeHostsFromEventTypes.handler");
    return handler(opts);
  }),

  bulkDeleteUsers: authedProcedure.input(ZBulkUsersDelete).mutation(async (opts) => {
    const { default: handler } = await import("./bulkDeleteUsers.handler");
    return handler(opts);
  }),

  deleteTeam: authedOrgAdminProcedure.input(ZDeleteTeamInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./deleteTeam.handler");
    return handler(opts);
  }),

  adminUpdate: authedAdminProcedure.input(ZAdminUpdate).mutation(async (opts) => {
    const { default: handler } = await import("./adminUpdate.handler");
    return handler(opts);
  }),

  adminVerify: authedAdminProcedure.input(ZAdminVerifyInput).mutation(async (opts) => {
    const { default: handler } = await import("./adminVerify.handler");
    return handler(opts);
  }),

  adminDelete: authedAdminProcedure.input(ZAdminDeleteInput).mutation(async (opts) => {
    const { default: handler } = await import("./adminDelete.handler");
    return handler(opts);
  }),

  createPhoneCall: eventOwnerProcedure.input(createPhoneCallSchema).mutation(async (opts) => {
    const { default: handler } = await import("./createPhoneCall.handler");
    return handler(opts);
  }),

  createSelfHosted: authedProcedure.input(ZCreateSelfHostedInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./createSelfHosted.handler");
    return handler(opts);
  }),
});
