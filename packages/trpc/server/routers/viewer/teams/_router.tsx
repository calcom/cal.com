import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZAcceptOrLeaveInputSchema } from "./acceptOrLeave.schema";
import { ZAddMembersToEventTypes } from "./addMembersToEventTypes.schema";
import { ZChangeMemberRoleInputSchema } from "./changeMemberRole.schema";
import { ZCheckIfMembershipExistsInputSchema } from "./checkIfMembershipExists.schema";
import { ZCreateInputSchema } from "./create.schema";
import { ZCreateInviteInputSchema } from "./createInvite.schema";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZDeleteInviteInputSchema } from "./deleteInvite.schema";
import { ZGetSchema } from "./get.schema";
import { ZGetInternalNotesPresetsInputSchema } from "./getInternalNotesPresets.schema";
import { ZGetMemberAvailabilityInputSchema } from "./getMemberAvailability.schema";
import { ZGetMembershipbyUserInputSchema } from "./getMembershipbyUser.schema";
import { ZGetUserConnectedAppsInputSchema } from "./getUserConnectedApps.schema";
import { ZHasEditPermissionForUserSchema } from "./hasEditPermissionForUser.schema";
import { ZInviteMemberInputSchema } from "./inviteMember/inviteMember.schema";
import { ZInviteMemberByTokenSchemaInputSchema } from "./inviteMemberByToken.schema";
import { ZLegacyListMembersInputSchema } from "./legacyListMembers.schema";
import { ZGetListSchema } from "./list.schema";
import { ZListMembersInputSchema } from "./listMembers.schema";
import { hasTeamPlan } from "./procedures/hasTeamPlan";
import { ZPublishInputSchema } from "./publish.schema";
import { ZRemoveHostsFromEventTypes } from "./removeHostsFromEventTypes.schema";
import { ZRemoveMemberInputSchema } from "./removeMember.schema";
import { ZResendInvitationInputSchema } from "./resendInvitation.schema";
import { ZGetRoundRobinHostsInputSchema } from "./roundRobin/getRoundRobinHostsToReasign.schema";
import { ZRoundRobinManualReassignInputSchema } from "./roundRobin/roundRobinManualReassign.schema";
import { ZRoundRobinReassignInputSchema } from "./roundRobin/roundRobinReassign.schema";
import { ZSetInviteExpirationInputSchema } from "./setInviteExpiration.schema";
import { ZSkipTeamTrialsInputSchema } from "./skipTeamTrials.schema";
import { ZUpdateInputSchema } from "./update.schema";
import { ZUpdateInternalNotesPresetsInputSchema } from "./updateInternalNotesPresets.schema";
import { ZUpdateMembershipInputSchema } from "./updateMembership.schema";

const NAMESPACE = "teams";
const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const viewerTeamsRouter = router({
  // Retrieves team by id
  get: authedProcedure.input(ZGetSchema).query(async (opts) => {
    const handler = await import("./get.handler.js");
    return handler.default(opts);
  }),
  // Returns teams I a member of
  list: authedProcedure.input(ZGetListSchema).query(async (opts) => {
    const handler = await import("./list.handler.js");
    return handler.default(opts);
  }),
  // Returns Teams I am a owner/admin of
  listOwnedTeams: authedProcedure.query(async (opts) => {
    const handler = await import("./list.handler.js");
    return handler.default(opts);
  }),
  create: authedProcedure.input(ZCreateInputSchema).mutation(async (opts) => {
    const handler = await import("./create.handler.js");
    return handler.default(opts);
  }),
  // Allows team owner to update team metadata
  update: authedProcedure.input(ZUpdateInputSchema).mutation(async (opts) => {
    const handler = await import("./update.handler.js");
    return handler.default(opts);
  }),
  delete: authedProcedure.input(ZDeleteInputSchema).mutation(async (opts) => {
    const handler = await import("./delete.handler.js");
    return handler.default(opts);
  }),
  removeMember: authedProcedure.input(ZRemoveMemberInputSchema).mutation(async (opts) => {
    const handler = await import("./removeMember.handler.js");
    return handler.default(opts);
  }),
  inviteMember: authedProcedure.input(ZInviteMemberInputSchema).mutation(async (opts) => {
    const handler = await import("./inviteMember/inviteMember.handler.js");
    return handler.default(opts);
  }),
  acceptOrLeave: authedProcedure.input(ZAcceptOrLeaveInputSchema).mutation(async (opts) => {
    const handler = await import("./acceptOrLeave.handler.js");
    return handler.default(opts);
  }),
  changeMemberRole: authedProcedure.input(ZChangeMemberRoleInputSchema).mutation(async (opts) => {
    const handler = await import("./changeMemberRole.handler.js");
    return handler.default(opts);
  }),
  getMemberAvailability: authedProcedure.input(ZGetMemberAvailabilityInputSchema).query(async (opts) => {
    const handler = await import("./getMemberAvailability.handler.js");
    return handler.default(opts);
  }),
  getMembershipbyUser: authedProcedure.input(ZGetMembershipbyUserInputSchema).query(async (opts) => {
    const handler = await import("./getMembershipbyUser.handler.js");
    return handler.default(opts);
  }),
  updateMembership: authedProcedure.input(ZUpdateMembershipInputSchema).mutation(async (opts) => {
    const handler = await import("./updateMembership.handler.js");
    return handler.default(opts);
  }),
  publish: authedProcedure.input(ZPublishInputSchema).mutation(async (opts) => {
    const handler = await import("./publish.handler.js");
    return handler.default(opts);
  }),
  /** This is a temporal endpoint so we can progressively upgrade teams to the new billing system. */
  getUpgradeable: authedProcedure.query(async ({ ctx }) => {
    const handler = await import("./getUpgradeable.handler.js");
    return handler.default({ userId: ctx.user.id });
  }),
  listMembers: authedProcedure.input(ZListMembersInputSchema).query(async (opts) => {
    const handler = await import("./listMembers.handler.js");
    return handler.default(opts);
  }),
  listSimpleMembers: authedProcedure.query(async (opts) => {
    const handler = await import("./listSimpleMembers.handler.js");
    return handler.default(opts);
  }),
  legacyListMembers: authedProcedure.input(ZLegacyListMembersInputSchema).query(async (opts) => {
    const handler = await import("./legacyListMembers.handler.js");
    return handler.default(opts);
  }),
  getUserConnectedApps: authedProcedure.input(ZGetUserConnectedAppsInputSchema).query(async (opts) => {
    const handler = await import("./getUserConnectedApps.handler.js");
    return handler.default(opts);
  }),
  hasTeamPlan,
  listInvites: authedProcedure.query(async (opts) => {
    const handler = await import("./listInvites.handler.js");
    return handler.default(opts);
  }),
  createInvite: authedProcedure.input(ZCreateInviteInputSchema).mutation(async (opts) => {
    const handler = await import("./createInvite.handler.js");
    return handler.default(opts);
  }),
  setInviteExpiration: authedProcedure.input(ZSetInviteExpirationInputSchema).mutation(async (opts) => {
    const handler = await import("./setInviteExpiration.handler.js");
    return handler.default(opts);
  }),
  deleteInvite: authedProcedure.input(ZDeleteInviteInputSchema).mutation(async (opts) => {
    const handler = await import("./deleteInvite.handler.js");
    return handler.default(opts);
  }),
  inviteMemberByToken: authedProcedure.input(ZInviteMemberByTokenSchemaInputSchema).mutation(async (opts) => {
    const handler = await import("./inviteMemberByToken.handler.js");
    return handler.default(opts);
  }),
  hasEditPermissionForUser: authedProcedure.input(ZHasEditPermissionForUserSchema).query(async (opts) => {
    const handler = await import("./hasEditPermissionForUser.handler.js");
    return handler.default(opts);
  }),
  resendInvitation: authedProcedure.input(ZResendInvitationInputSchema).mutation(async (opts) => {
    const handler = await import("./resendInvitation.handler.js");
    return handler.default(opts);
  }),
  roundRobinReassign: authedProcedure.input(ZRoundRobinReassignInputSchema).mutation(async (opts) => {
    const handler = await import("./roundRobin/roundRobinReassign.handler.js");
    return handler.default(opts);
  }),
  roundRobinManualReassign: authedProcedure
    .input(ZRoundRobinManualReassignInputSchema)
    .mutation(async (opts) => {
      const handler = await import("./roundRobin/roundRobinManualReassign.handler.js");
      return handler.default(opts);
    }),
  getRoundRobinHostsToReassign: authedProcedure.input(ZGetRoundRobinHostsInputSchema).query(async (opts) => {
    const handler = await import("./roundRobin/getRoundRobinHostsToReasign.handler.js");
    return handler.default(opts);
  }),
  checkIfMembershipExists: authedProcedure
    .input(ZCheckIfMembershipExistsInputSchema)
    .mutation(async (opts) => {
      const handler = await import("./checkIfMembershipExists.handler.js");
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
  getInternalNotesPresets: authedProcedure
    .input(ZGetInternalNotesPresetsInputSchema)
    .query(async ({ ctx, input }) => {
      const handler = await import("./getInternalNotesPresets.handler.js");
      return handler.default({ ctx, input });
    }),
  updateInternalNotesPresets: authedProcedure
    .input(ZUpdateInternalNotesPresetsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const handler = await import("./updateInternalNotesPresets.handler.js");
      return handler.default({ ctx, input });
    }),
  hasActiveTeamPlan: authedProcedure.query(async (opts) => {
    const handler = await import("./hasActiveTeamPlan.handler.js");
    return handler.default(opts);
  }),
  skipTeamTrials: authedProcedure.input(ZSkipTeamTrialsInputSchema).mutation(async (opts) => {
    const handler = await import("./skipTeamTrials.handler.js");
    return handler.default(opts);
  }),
});
