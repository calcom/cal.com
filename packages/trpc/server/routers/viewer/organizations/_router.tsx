import { createPhoneCallSchema } from "@calcom/features/calAIPhone/zod-utils";
import { ZVerifyCodeInputSchema } from "@calcom/prisma/zod-utils";

import authedProcedure, {
  authedAdminProcedure,
  authedOrgAdminProcedure,
} from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { eventOwnerProcedure } from "../eventTypes/util";
import { ZAddMembersToEventTypes } from "./addMembersToEventTypes.schema";
import { ZAddMembersToTeams } from "./addMembersToTeams.schema";
import { ZAdminDeleteInput } from "./adminDelete.schema";
import { ZAdminGet } from "./adminGet.schema";
import { ZAdminUpdate } from "./adminUpdate.schema";
import { ZAdminVerifyInput } from "./adminVerify.schema";
import { ZBulkUsersDelete } from "./bulkDeleteUsers.schema.";
import { ZCreateInputSchema } from "./create.schema";
import { ZCreateSelfHostedInputSchema } from "./createSelfHosted.schema";
import { ZCreateTeamsSchema } from "./createTeams.schema";
import { ZCreateWatchlistEntryInputSchema } from "./createWatchlistEntry.schema";
import { ZCreateWithPaymentIntentInputSchema } from "./createWithPaymentIntent.schema";
import { ZDeleteTeamInputSchema } from "./deleteTeam.schema";
import { ZDeleteWatchlistEntryInputSchema } from "./deleteWatchlistEntry.schema";
import { ZGetMembersInput } from "./getMembers.schema";
import { ZGetOtherTeamInputSchema } from "./getOtherTeam.handler";
import { ZGetUserInput } from "./getUser.schema";
import { ZGetWatchlistEntryDetailsInputSchema } from "./getWatchlistEntryDetails.schema";
import { ZIntentToCreateOrgInputSchema } from "./intentToCreateOrg.schema";
import { ZAddToWatchlistInputSchema } from "./addToWatchlist.schema";
import { ZDismissBookingReportInputSchema } from "./dismissBookingReport.schema";
import { ZListBookingReportsInputSchema } from "./listBookingReports.schema";
import { ZListMembersInputSchema } from "./listMembers.schema";
import { ZListOtherTeamMembersSchema } from "./listOtherTeamMembers.handler";
import { ZListWatchlistEntriesInputSchema } from "./listWatchlistEntries.schema";
import { ZRemoveHostsFromEventTypes } from "./removeHostsFromEventTypes.schema";
import { ZSetPasswordSchema } from "./setPassword.schema";
import { ZUpdateInputSchema } from "./update.schema";
import { ZUpdateUserInputSchema } from "./updateUser.schema";

export const viewerOrganizationsRouter = router({
  getOrganizationOnboarding: authedProcedure.query(async (opts) => {
    const { default: handler } = await import("./getOrganizationOnboarding.handler");
    return handler(opts);
  }),

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
  listCurrent: authedProcedure.query(async (opts) => {
    const { default: handler } = await import("./list.handler");
    return handler(opts);
  }),
  checkIfOrgNeedsUpgrade: authedProcedure.query(async (opts) => {
    const { default: handler } = await import("./checkIfOrgNeedsUpgrade.handler");
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
  getMembers: authedProcedure.input(ZGetMembersInput).query(async (opts) => {
    const { default: handler } = await import("./getMembers.handler");
    return handler(opts);
  }),
  listMembers: authedProcedure.input(ZListMembersInputSchema).query(async (opts) => {
    const { default: handler } = await import("./listMembers.handler");
    return handler(opts);
  }),
  getBrand: authedProcedure.query(async (opts) => {
    const { default: handler } = await import("./getBrand.handler");
    return handler(opts);
  }),
  getUser: authedProcedure.input(ZGetUserInput).query(async (opts) => {
    const { default: handler } = await import("./getUser.handler");
    return handler(opts);
  }),
  updateUser: authedProcedure.input(ZUpdateUserInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./updateUser.handler");
    return handler(opts);
  }),
  getTeams: authedProcedure.query(async (opts) => {
    const { default: handler } = await import("./getTeams.handler");
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
  listOtherTeamMembers: authedOrgAdminProcedure.input(ZListOtherTeamMembersSchema).query(async (opts) => {
    const { default: handler } = await import("./listOtherTeamMembers.handler");
    return handler(opts);
  }),
  getOtherTeam: authedOrgAdminProcedure.input(ZGetOtherTeamInputSchema).query(async (opts) => {
    const { default: handler } = await import("./getOtherTeam.handler");
    return handler(opts);
  }),
  listOtherTeams: authedProcedure.query(async (opts) => {
    const { default: handler } = await import("./listOtherTeams.handler");
    return handler(opts);
  }),
  deleteTeam: authedOrgAdminProcedure.input(ZDeleteTeamInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./deleteTeam.handler");
    return handler(opts);
  }),

  adminGetAll: authedAdminProcedure.query(async (opts) => {
    const { default: handler } = await import("./adminGetAll.handler");
    return handler(opts);
  }),
  adminGet: authedAdminProcedure.input(ZAdminGet).query(async (opts) => {
    const { default: handler } = await import("./adminGet.handler");
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
  listWatchlistEntries: authedOrgAdminProcedure
    .input(ZListWatchlistEntriesInputSchema)
    .query(async (opts) => {
      const { default: handler } = await import("./listWatchlistEntries.handler");
      return handler(opts);
    }),
  createWatchlistEntry: authedOrgAdminProcedure
    .input(ZCreateWatchlistEntryInputSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./createWatchlistEntry.handler");
      return handler(opts);
    }),
  deleteWatchlistEntry: authedOrgAdminProcedure
    .input(ZDeleteWatchlistEntryInputSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./deleteWatchlistEntry.handler");
      return handler(opts);
    }),
  getWatchlistEntryDetails: authedOrgAdminProcedure
    .input(ZGetWatchlistEntryDetailsInputSchema)
    .query(async (opts) => {
      const { default: handler } = await import("./getWatchlistEntryDetails.handler");
      return handler(opts);
    }),
  listBookingReports: authedOrgAdminProcedure
    .input(ZListBookingReportsInputSchema)
    .query(async (opts) => {
      const { default: handler } = await import("./listBookingReports.handler");
      return handler(opts);
    }),
  addToWatchlist: authedOrgAdminProcedure
    .input(ZAddToWatchlistInputSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./addToWatchlist.handler");
      return handler(opts);
    }),
  dismissBookingReport: authedOrgAdminProcedure
    .input(ZDismissBookingReportInputSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./dismissBookingReport.handler");
      return handler(opts);
    }),

});
