import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { acceptOrLeaveHandler } from "./acceptOrLeave.handler";
import { ZAcceptOrLeaveInputSchema } from "./acceptOrLeave.schema";
import { addMembersToEventTypesHandler } from "./addMembersToEventTypes.handler";
import { ZAddMembersToEventTypes } from "./addMembersToEventTypes.schema";
import { changeMemberRoleHandler } from "./changeMemberRole.handler";
import { ZChangeMemberRoleInputSchema } from "./changeMemberRole.schema";
import { default as checkIfMembershipExistsHandler } from "./checkIfMembershipExists.handler";
import { ZCheckIfMembershipExistsInputSchema } from "./checkIfMembershipExists.schema";
import { createHandler } from "./create.handler";
import { ZCreateInputSchema } from "./create.schema";
import { createInviteHandler } from "./createInvite.handler";
import { ZCreateInviteInputSchema } from "./createInvite.schema";
import { deleteHandler } from "./delete.handler";
import { ZDeleteInputSchema } from "./delete.schema";
import { deleteInviteHandler } from "./deleteInvite.handler";
import { ZDeleteInviteInputSchema } from "./deleteInvite.schema";
// Static imports for all handlers
import { get as getHandler } from "./get.handler";
import { ZGetSchema } from "./get.schema";
import { getInternalNotesPresetsHandler } from "./getInternalNotesPresets.handler";
import { ZGetInternalNotesPresetsInputSchema } from "./getInternalNotesPresets.schema";
import { getMemberAvailabilityHandler } from "./getMemberAvailability.handler";
import { ZGetMemberAvailabilityInputSchema } from "./getMemberAvailability.schema";
import { getMembershipbyUserHandler } from "./getMembershipbyUser.handler";
import { ZGetMembershipbyUserInputSchema } from "./getMembershipbyUser.schema";
import { getUpgradeableHandler } from "./getUpgradeable.handler";
import { getUserConnectedAppsHandler } from "./getUserConnectedApps.handler";
import { ZGetUserConnectedAppsInputSchema } from "./getUserConnectedApps.schema";
import { hasActiveTeamPlanHandler } from "./hasActiveTeamPlan.handler";
import { default as hasEditPermissionForUserHandler } from "./hasEditPermissionForUser.handler";
import { ZHasEditPermissionForUserSchema } from "./hasEditPermissionForUser.schema";
import { default as inviteMemberHandler } from "./inviteMember/inviteMember.handler";
import { ZInviteMemberInputSchema } from "./inviteMember/inviteMember.schema";
import { inviteMemberByTokenHandler } from "./inviteMemberByToken.handler";
import { ZInviteMemberByTokenSchemaInputSchema } from "./inviteMemberByToken.schema";
import { default as legacyListMembersHandler } from "./legacyListMembers.handler";
import { ZLegacyListMembersInputSchema } from "./legacyListMembers.schema";
import { listHandler } from "./list.handler";
import { ZGetListSchema } from "./list.schema";
import { listInvitesHandler } from "./listInvites.handler";
import { listMembersHandler } from "./listMembers.handler";
import { ZListMembersInputSchema } from "./listMembers.schema";
import { default as listSimpleMembersHandler } from "./listSimpleMembers.handler";
import { hasTeamPlan } from "./procedures/hasTeamPlan";
import { publishHandler } from "./publish.handler";
import { ZPublishInputSchema } from "./publish.schema";
import { removeHostsFromEventTypesHandler } from "./removeHostsFromEventTypes.handler";
import { ZRemoveHostsFromEventTypes } from "./removeHostsFromEventTypes.schema";
import { removeMemberHandler } from "./removeMember.handler";
import { ZRemoveMemberInputSchema } from "./removeMember.schema";
import { resendInvitationHandler } from "./resendInvitation.handler";
import { ZResendInvitationInputSchema } from "./resendInvitation.schema";
import { default as getRoundRobinHostsToReassignHandler } from "./roundRobin/getRoundRobinHostsToReasign.handler";
import { ZGetRoundRobinHostsInputSchema } from "./roundRobin/getRoundRobinHostsToReasign.schema";
import { roundRobinManualReassignHandler } from "./roundRobin/roundRobinManualReassign.handler";
import { ZRoundRobinManualReassignInputSchema } from "./roundRobin/roundRobinManualReassign.schema";
import { roundRobinReassignHandler } from "./roundRobin/roundRobinReassign.handler";
import { ZRoundRobinReassignInputSchema } from "./roundRobin/roundRobinReassign.schema";
import { setInviteExpirationHandler } from "./setInviteExpiration.handler";
import { ZSetInviteExpirationInputSchema } from "./setInviteExpiration.schema";
import { updateHandler } from "./update.handler";
import { ZUpdateInputSchema } from "./update.schema";
import { updateInternalNotesPresetsHandler } from "./updateInternalNotesPresets.handler";
import { ZUpdateInternalNotesPresetsInputSchema } from "./updateInternalNotesPresets.schema";
import { updateMembershipHandler } from "./updateMembership.handler";
import { ZUpdateMembershipInputSchema } from "./updateMembership.schema";

const NAMESPACE = "teams";
const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const viewerTeamsRouter = router({
  get: authedProcedure.input(ZGetSchema).query(async (opts) => {
    return getHandler(opts);
  }),
  list: authedProcedure.input(ZGetListSchema).query(async (opts) => {
    return listHandler(opts);
  }),
  listOwnedTeams: authedProcedure.query(async (opts) => {
    return listHandler(opts);
  }),
  create: authedProcedure.input(ZCreateInputSchema).mutation(async (opts) => {
    return createHandler(opts);
  }),
  update: authedProcedure.input(ZUpdateInputSchema).mutation(async (opts) => {
    return updateHandler(opts);
  }),
  delete: authedProcedure.input(ZDeleteInputSchema).mutation(async (opts) => {
    return deleteHandler(opts);
  }),
  removeMember: authedProcedure.input(ZRemoveMemberInputSchema).mutation(async (opts) => {
    return removeMemberHandler(opts);
  }),
  inviteMember: authedProcedure.input(ZInviteMemberInputSchema).mutation(async (opts) => {
    return inviteMemberHandler(opts);
  }),
  acceptOrLeave: authedProcedure.input(ZAcceptOrLeaveInputSchema).mutation(async (opts) => {
    return acceptOrLeaveHandler(opts);
  }),
  changeMemberRole: authedProcedure.input(ZChangeMemberRoleInputSchema).mutation(async (opts) => {
    return changeMemberRoleHandler(opts);
  }),
  getMemberAvailability: authedProcedure.input(ZGetMemberAvailabilityInputSchema).query(async (opts) => {
    return getMemberAvailabilityHandler(opts);
  }),
  getMembershipbyUser: authedProcedure.input(ZGetMembershipbyUserInputSchema).query(async (opts) => {
    return getMembershipbyUserHandler(opts);
  }),
  updateMembership: authedProcedure.input(ZUpdateMembershipInputSchema).mutation(async (opts) => {
    return updateMembershipHandler(opts);
  }),
  publish: authedProcedure.input(ZPublishInputSchema).mutation(async (opts) => {
    return publishHandler(opts);
  }),
  getUpgradeable: authedProcedure.query(async ({ ctx }) => {
    return getUpgradeableHandler({ userId: ctx.user.id });
  }),
  listMembers: authedProcedure.input(ZListMembersInputSchema).query(async (opts) => {
    return listMembersHandler(opts);
  }),
  listSimpleMembers: authedProcedure.query(async (opts) => {
    return listSimpleMembersHandler(opts);
  }),
  legacyListMembers: authedProcedure.input(ZLegacyListMembersInputSchema).query(async (opts) => {
    return legacyListMembersHandler(opts);
  }),
  getUserConnectedApps: authedProcedure.input(ZGetUserConnectedAppsInputSchema).query(async (opts) => {
    return getUserConnectedAppsHandler(opts);
  }),
  hasTeamPlan,
  listInvites: authedProcedure.query(async (opts) => {
    return listInvitesHandler(opts);
  }),
  createInvite: authedProcedure.input(ZCreateInviteInputSchema).mutation(async (opts) => {
    return createInviteHandler(opts);
  }),
  setInviteExpiration: authedProcedure.input(ZSetInviteExpirationInputSchema).mutation(async (opts) => {
    return setInviteExpirationHandler(opts);
  }),
  deleteInvite: authedProcedure.input(ZDeleteInviteInputSchema).mutation(async (opts) => {
    return deleteInviteHandler(opts);
  }),
  inviteMemberByToken: authedProcedure.input(ZInviteMemberByTokenSchemaInputSchema).mutation(async (opts) => {
    return inviteMemberByTokenHandler(opts);
  }),
  hasEditPermissionForUser: authedProcedure.input(ZHasEditPermissionForUserSchema).query(async (opts) => {
    return hasEditPermissionForUserHandler(opts);
  }),
  resendInvitation: authedProcedure.input(ZResendInvitationInputSchema).mutation(async (opts) => {
    return resendInvitationHandler(opts);
  }),
  roundRobinReassign: authedProcedure.input(ZRoundRobinReassignInputSchema).mutation(async (opts) => {
    return roundRobinReassignHandler(opts);
  }),
  roundRobinManualReassign: authedProcedure
    .input(ZRoundRobinManualReassignInputSchema)
    .mutation(async (opts) => {
      return roundRobinManualReassignHandler(opts);
    }),
  getRoundRobinHostsToReassign: authedProcedure.input(ZGetRoundRobinHostsInputSchema).query(async (opts) => {
    return getRoundRobinHostsToReassignHandler(opts);
  }),
  checkIfMembershipExists: authedProcedure
    .input(ZCheckIfMembershipExistsInputSchema)
    .mutation(async (opts) => {
      return checkIfMembershipExistsHandler(opts);
    }),
  addMembersToEventTypes: authedProcedure.input(ZAddMembersToEventTypes).mutation(async (opts) => {
    return addMembersToEventTypesHandler(opts);
  }),
  removeHostsFromEventTypes: authedProcedure.input(ZRemoveHostsFromEventTypes).mutation(async (opts) => {
    return removeHostsFromEventTypesHandler(opts);
  }),
  getInternalNotesPresets: authedProcedure
    .input(ZGetInternalNotesPresetsInputSchema)
    .query(async ({ ctx, input }) => {
      return getInternalNotesPresetsHandler({ ctx, input });
    }),
  updateInternalNotesPresets: authedProcedure
    .input(ZUpdateInternalNotesPresetsInputSchema)
    .mutation(async ({ ctx, input }) => {
      return updateInternalNotesPresetsHandler({ ctx, input });
    }),
  hasActiveTeamPlan: authedProcedure.query(async (opts) => {
    return hasActiveTeamPlanHandler(opts);
  }),
});
