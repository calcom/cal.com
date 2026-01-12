import type { NextApiRequest } from "next";

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
import { ZHasActiveTeamPlanInputSchema } from "./hasActiveTeamPlan.schema";
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
import { ZGetManagedEventUsersToReassignInputSchema } from "./managedEvents/getManagedEventUsersToReassign.schema";
import { ZManagedEventManualReassignInputSchema } from "./managedEvents/managedEventManualReassign.schema";
import { ZManagedEventReassignInputSchema } from "./managedEvents/managedEventReassign.schema";
import { ZGetRoundRobinHostsInputSchema } from "./roundRobin/getRoundRobinHostsToReasign.schema";
import { ZRoundRobinManualReassignInputSchema } from "./roundRobin/roundRobinManualReassign.schema";
import { ZRoundRobinReassignInputSchema } from "./roundRobin/roundRobinReassign.schema";
import { ZSetInviteExpirationInputSchema } from "./setInviteExpiration.schema";
import { ZSkipTeamTrialsInputSchema } from "./skipTeamTrials.schema";
import { ZUpdateInputSchema } from "./update.schema";
import { ZUpdateInternalNotesPresetsInputSchema } from "./updateInternalNotesPresets.schema";
import { ZUpdateMembershipInputSchema } from "./updateMembership.schema";

export const viewerTeamsRouter = router({
  // Retrieves team by id
  get: authedProcedure.input(ZGetSchema).query(async (opts) => {
    const { default: handler } = await import("./get.handler");
    return handler(opts);
  }),
  // Returns teams I a member of
  list: authedProcedure.input(ZGetListSchema).query(async (opts) => {
    const { default: handler } = await import("./list.handler");
    return handler(opts);
  }),
  // Returns Teams I am a owner/admin of
  listOwnedTeams: authedProcedure.query(async (opts) => {
    const { default: handler } = await import("./list.handler");
    return handler(opts);
  }),
  create: authedProcedure.input(ZCreateInputSchema).mutation(async ({ ctx, input }) => {
    const { default: handler } = await import("./create.handler");
    return handler({ ctx: { ...ctx, req: ctx.req as NextApiRequest }, input });
  }),
  // Allows team owner to update team metadata
  update: authedProcedure.input(ZUpdateInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./update.handler");
    return handler(opts);
  }),
  delete: authedProcedure.input(ZDeleteInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./delete.handler");
    return handler(opts);
  }),
  removeMember: authedProcedure.input(ZRemoveMemberInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./removeMember.handler");
    return handler(opts);
  }),
  inviteMember: authedProcedure.input(ZInviteMemberInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./inviteMember/inviteMember.handler");
    return handler(opts);
  }),
  acceptOrLeave: authedProcedure.input(ZAcceptOrLeaveInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./acceptOrLeave.handler");
    return handler(opts);
  }),
  changeMemberRole: authedProcedure.input(ZChangeMemberRoleInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./changeMemberRole.handler");
    return handler(opts);
  }),
  getMemberAvailability: authedProcedure.input(ZGetMemberAvailabilityInputSchema).query(async (opts) => {
    const { default: handler } = await import("./getMemberAvailability.handler");
    return handler(opts);
  }),
  getMembershipbyUser: authedProcedure.input(ZGetMembershipbyUserInputSchema).query(async (opts) => {
    const { default: handler } = await import("./getMembershipbyUser.handler");
    return handler(opts);
  }),
  updateMembership: authedProcedure.input(ZUpdateMembershipInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./updateMembership.handler");
    return handler(opts);
  }),
  publish: authedProcedure.input(ZPublishInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./publish.handler");
    return handler(opts);
  }),
  /** This is a temporal endpoint so we can progressively upgrade teams to the new billing system. */
  getUpgradeable: authedProcedure.query(async ({ ctx }) => {
    const { default: handler } = await import("./getUpgradeable.handler");
    return handler({ userId: ctx.user.id });
  }),
  listMembers: authedProcedure.input(ZListMembersInputSchema).query(async (opts) => {
    const { default: handler } = await import("./listMembers.handler");
    return handler(opts);
  }),
  listSimpleMembers: authedProcedure.query(async (opts) => {
    const { default: handler } = await import("./listSimpleMembers.handler");
    return handler(opts);
  }),
  legacyListMembers: authedProcedure.input(ZLegacyListMembersInputSchema).query(async (opts) => {
    const { default: handler } = await import("./legacyListMembers.handler");
    return handler(opts);
  }),
  getUserConnectedApps: authedProcedure.input(ZGetUserConnectedAppsInputSchema).query(async (opts) => {
    const { default: handler } = await import("./getUserConnectedApps.handler");
    return handler(opts);
  }),
  hasTeamPlan,
  listInvites: authedProcedure.query(async (opts) => {
    const { default: handler } = await import("./listInvites.handler");
    return handler(opts);
  }),
  createInvite: authedProcedure.input(ZCreateInviteInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./createInvite.handler");
    return handler(opts);
  }),
  setInviteExpiration: authedProcedure.input(ZSetInviteExpirationInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./setInviteExpiration.handler");
    return handler(opts);
  }),
  deleteInvite: authedProcedure.input(ZDeleteInviteInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./deleteInvite.handler");
    return handler(opts);
  }),
  inviteMemberByToken: authedProcedure.input(ZInviteMemberByTokenSchemaInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./inviteMemberByToken.handler");
    return handler(opts);
  }),
  hasEditPermissionForUser: authedProcedure.input(ZHasEditPermissionForUserSchema).query(async (opts) => {
    const { default: handler } = await import("./hasEditPermissionForUser.handler");
    return handler(opts);
  }),
  resendInvitation: authedProcedure.input(ZResendInvitationInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./resendInvitation.handler");
    return handler(opts);
  }),
  roundRobinReassign: authedProcedure.input(ZRoundRobinReassignInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./roundRobin/roundRobinReassign.handler");
    return handler(opts);
  }),
  roundRobinManualReassign: authedProcedure
    .input(ZRoundRobinManualReassignInputSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./roundRobin/roundRobinManualReassign.handler");
      return handler(opts);
    }),
  getRoundRobinHostsToReassign: authedProcedure.input(ZGetRoundRobinHostsInputSchema).query(async (opts) => {
    const { default: handler } = await import("./roundRobin/getRoundRobinHostsToReasign.handler");
    return handler(opts);
  }),
  // Managed Events Reassignment
  managedEventReassign: authedProcedure.input(ZManagedEventReassignInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./managedEvents/managedEventReassign.handler");
    return handler(opts);
  }),
  managedEventManualReassign: authedProcedure
    .input(ZManagedEventManualReassignInputSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./managedEvents/managedEventManualReassign.handler");
      return handler(opts);
    }),
  getManagedEventUsersToReassign: authedProcedure
    .input(ZGetManagedEventUsersToReassignInputSchema)
    .query(async (opts) => {
      const { default: handler } = await import("./managedEvents/getManagedEventUsersToReassign.handler");
    return handler(opts);
  }),
  checkIfMembershipExists: authedProcedure
    .input(ZCheckIfMembershipExistsInputSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./checkIfMembershipExists.handler");
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
  getInternalNotesPresets: authedProcedure
    .input(ZGetInternalNotesPresetsInputSchema)
    .query(async ({ ctx, input }) => {
      const { default: handler } = await import("./getInternalNotesPresets.handler");
      return handler({ ctx, input });
    }),
  updateInternalNotesPresets: authedProcedure
    .input(ZUpdateInternalNotesPresetsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { default: handler } = await import("./updateInternalNotesPresets.handler");
      return handler({ ctx, input });
    }),
  hasActiveTeamPlan: authedProcedure.input(ZHasActiveTeamPlanInputSchema).query(async (opts) => {
    const { default: handler } = await import("./hasActiveTeamPlan.handler");
    return handler(opts);
  }),
  skipTeamTrials: authedProcedure.input(ZSkipTeamTrialsInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./skipTeamTrials.handler");
    return handler(opts);
  }),
});
