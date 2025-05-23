import { createPhoneCallSchema } from "@calcom/features/ee/cal-ai-phone/zod-utils";
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
import { ZCreateTeamsSchema } from "./createTeams.schema";
import { ZCreateWithPaymentIntentInputSchema } from "./createWithPaymentIntent.schema";
import { ZDeleteTeamInputSchema } from "./deleteTeam.schema";
import { ZGetMembersInput } from "./getMembers.schema";
import { ZGetOtherTeamInputSchema } from "./getOtherTeam.handler";
import { ZGetUserInput } from "./getUser.schema";
import { ZIntentToCreateOrgInputSchema } from "./intentToCreateOrg.schema";
import { ZListMembersInputSchema } from "./listMembers.schema";
import { ZListOtherTeamMembersSchema } from "./listOtherTeamMembers.handler";
import { ZRemoveHostsFromEventTypes } from "./removeHostsFromEventTypes.schema";
import { ZSetPasswordSchema } from "./setPassword.schema";
import { ZUpdateInputSchema } from "./update.schema";
import { ZUpdateUserInputSchema } from "./updateUser.schema";

const NAMESPACE = "organizations";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const viewerOrganizationsRouter = router({
  getOrganizationOnboarding: authedProcedure.query(async (opts) => {
    const handler = await import("./getOrganizationOnboarding.handler.js");
    return handler.default(opts);
  }),

  create: authedProcedure.input(ZCreateInputSchema).mutation(async (opts) => {
    const handler = await import("./create.handler.js");
    return handler.default(opts);
  }),
  intentToCreateOrg: authedProcedure.input(ZIntentToCreateOrgInputSchema).mutation(async (opts) => {
    const handler = await import("./intentToCreateOrg.handler.js");
    return handler.default(opts);
  }),
  createWithPaymentIntent: authedProcedure
    .input(ZCreateWithPaymentIntentInputSchema)
    .mutation(async (opts) => {
      const handler = await import("./createWithPaymentIntent.handler.js");
      return handler.default(opts);
    }),
  update: authedProcedure.input(ZUpdateInputSchema).mutation(async (opts) => {
    const handler = await import("./update.handler.js");
    return handler.default(opts);
  }),
  verifyCode: authedProcedure.input(ZVerifyCodeInputSchema).mutation(async (opts) => {
    const handler = await import("./verifyCode.handler.js");
    return handler.default(opts);
  }),
  createTeams: authedProcedure.input(ZCreateTeamsSchema).mutation(async (opts) => {
    const handler = await import("./createTeams.handler.js");
    return handler.default(opts);
  }),
  listCurrent: authedProcedure.query(async (opts) => {
    const handler = await import("./list.handler.js");
    return handler.default(opts);
  }),
  checkIfOrgNeedsUpgrade: authedProcedure.query(async (opts) => {
    const handler = await import("./checkIfOrgNeedsUpgrade.handler.js");
    return handler.default(opts);
  }),
  publish: authedProcedure.mutation(async (opts) => {
    const handler = await import("./publish.handler.js");
    return handler.default(opts);
  }),
  setPassword: authedProcedure.input(ZSetPasswordSchema).mutation(async (opts) => {
    const handler = await import("./setPassword.handler.js");
    return handler.default(opts);
  }),
  getMembers: authedProcedure.input(ZGetMembersInput).query(async (opts) => {
    const handler = await import("./getMembers.handler.js");
    return handler.default(opts);
  }),
  listMembers: authedProcedure.input(ZListMembersInputSchema).query(async (opts) => {
    const handler = await import("./listMembers.handler.js");
    return handler.default(opts);
  }),
  getBrand: authedProcedure.query(async (opts) => {
    const handler = await import("./getBrand.handler.js");
    return handler.default(opts);
  }),
  getUser: authedProcedure.input(ZGetUserInput).query(async (opts) => {
    const handler = await import("./getUser.handler.js");
    return handler.default(opts);
  }),
  updateUser: authedProcedure.input(ZUpdateUserInputSchema).mutation(async (opts) => {
    const handler = await import("./updateUser.handler.js");
    return handler.default(opts);
  }),
  getTeams: authedProcedure.query(async (opts) => {
    const handler = await import("./getTeams.handler.js");
    return handler.default(opts);
  }),
  addMembersToTeams: authedProcedure.input(ZAddMembersToTeams).mutation(async (opts) => {
    const handler = await import("./addMembersToTeams.handler.js");
    return handler.default(opts);
  }),
  addMembersToEventTypes: authedProcedure.input(ZAddMembersToEventTypes).mutation(async (opts) => {
    const handler = await import("./addMembersToEventTypes.handler.js");
    return handler.default(opts);
  }),
  removeHostsFromEventTypes: authedProcedure.input(ZRemoveHostsFromEventTypes).mutation(async (opts) => {
    const handler = await import("./removeHostsFromEventTypes.handler.js");
    return handler.default(opts);
  }),
  bulkDeleteUsers: authedProcedure.input(ZBulkUsersDelete).mutation(async (opts) => {
    const handler = await import("./bulkDeleteUsers.handler.js");
    return handler.default(opts);
  }),
  listOtherTeamMembers: authedOrgAdminProcedure.input(ZListOtherTeamMembersSchema).query(async (opts) => {
    const handler = await import("./listOtherTeamMembers.handler.js");
    return handler.default(opts);
  }),
  getOtherTeam: authedOrgAdminProcedure.input(ZGetOtherTeamInputSchema).query(async (opts) => {
    const handler = await import("./getOtherTeam.handler.js");
    return handler.default(opts);
  }),
  listOtherTeams: authedProcedure.query(async (opts) => {
    const handler = await import("./listOtherTeams.handler.js");
    return handler.default(opts);
  }),
  deleteTeam: authedOrgAdminProcedure.input(ZDeleteTeamInputSchema).mutation(async (opts) => {
    const handler = await import("./deleteTeam.handler.js");
    return handler.default(opts);
  }),

  adminGetAll: authedAdminProcedure.query(async (opts) => {
    const handler = await import("./adminGetAll.handler.js");
    return handler.default(opts);
  }),
  adminGet: authedAdminProcedure.input(ZAdminGet).query(async (opts) => {
    const handler = await import("./adminGet.handler.js");
    return handler.default(opts);
  }),
  adminUpdate: authedAdminProcedure.input(ZAdminUpdate).mutation(async (opts) => {
    const handler = await import("./adminUpdate.handler.js");
    return handler.default(opts);
  }),
  adminVerify: authedAdminProcedure.input(ZAdminVerifyInput).mutation(async (opts) => {
    const handler = await import("./adminVerify.handler.js");
    return handler.default(opts);
  }),
  adminDelete: authedAdminProcedure.input(ZAdminDeleteInput).mutation(async (opts) => {
    const handler = await import("./adminDelete.handler.js");
    return handler.default(opts);
  }),
  createPhoneCall: eventOwnerProcedure.input(createPhoneCallSchema).mutation(async (opts) => {
    const handler = await import("./createPhoneCall.handler.js");
    return handler.default(opts);
  }),
  getFacetedValues: authedProcedure.query(async (opts) => {
    const handler = await import("./getFacetedValues.handler.js");
    return handler.default(opts);
  }),
});
