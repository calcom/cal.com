import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZAcceptOrLeaveInputSchema } from "./acceptOrLeave.schema";
import { ZAddMembersToEventType } from "./addMemberstoEventType.schema";
import { ZAllTeamsListMembersInput } from "./allTeamsListMembers.schema";
import { ZCalidListTeamAvailaiblityScheme } from "./calidListTeamAvailability.schema";
import { ZChangeCalidMemberRoleInputSchema } from "./changeMemberRole.schema";
import { ZCreateCalidTeamSchema } from "./create.schema";
import { ZDeleteCalidTeamSchema } from "./delete.schema";
import { ZGetCalidTeamSchema } from "./get.schema";
import { ZGetMemberSchema } from "./getMember.schema";
import { ZInviteMemberSchema } from "./inviteMember.schema";
import { ZLeaveTeamSchema } from "./leaveTeam.schema";
import { ZListMembersSchema } from "./listMembers.schema";
import { ZRemoveMemberSchema } from "./removeMember.schema";
import { ZResendCalidInvitationSchema } from "./resendInvitation.schema";
import { ZUpdateCalidTeamSchema } from "./update.schema";
import { ZUpdateMemberSchema } from "./updateMember.schema";

export const calIdTeamsRouter = router({
  // Create a new calidTeam
  create: authedProcedure.input(ZCreateCalidTeamSchema).mutation(async ({ ctx, input }) => {
    const { createCalidTeamHandler } = await import("./create.handler");
    return createCalidTeamHandler({ ctx, input });
  }),

  // Get a specific calidTeam by ID
  get: authedProcedure.input(ZGetCalidTeamSchema).query(async ({ ctx, input }) => {
    const { getCalidTeamHandler } = await import("./get.handler");
    return getCalidTeamHandler({ ctx, input });
  }),

  // List all calidTeams the user has access to
  list: authedProcedure.query(async ({ ctx }) => {
    const { listCalidTeamsHandler } = await import("./list.handler");
    return listCalidTeamsHandler({ ctx });
  }),

  // List all calidTeams the user is owner of
  listOwnedTeams: authedProcedure.query(async ({ ctx }) => {
    const { listOwnedTeamsHandler } = await import("./listOwnedTeams.handler");
    return listOwnedTeamsHandler({ ctx });
  }),

  // Update a calidTeam
  update: authedProcedure.input(ZUpdateCalidTeamSchema).mutation(async ({ ctx, input }) => {
    const { updateCalidTeamHandler } = await import("./update.handler");
    return updateCalidTeamHandler({ ctx, input });
  }),

  // Delete a calidTeam
  delete: authedProcedure.input(ZDeleteCalidTeamSchema).mutation(async ({ ctx, input }) => {
    const { deleteCalidTeamHandler } = await import("./delete.handler");
    return deleteCalidTeamHandler({ ctx, input });
  }),

  // Leave a calidTeam
  leaveTeam: authedProcedure.input(ZLeaveTeamSchema).mutation(async ({ ctx, input }) => {
    const { leaveTeamHandler } = await import("./leaveTeam.handler");
    return leaveTeamHandler({ ctx, input });
  }),

  // Invite a member to a calidTeam
  inviteMember: authedProcedure.input(ZInviteMemberSchema).mutation(async ({ ctx, input }) => {
    const { inviteMemberHandler } = await import("./inviteMember.handler");
    return inviteMemberHandler({ ctx, input });
  }),

  // Remove members from a calidTeam
  removeMember: authedProcedure.input(ZRemoveMemberSchema).mutation(async ({ ctx, input }) => {
    const { removeMemberHandler } = await import("./removeMember.handler");
    return removeMemberHandler({ ctx, input });
  }),

  // Get member
  getMember: authedProcedure.input(ZGetMemberSchema).query(async ({ ctx, input }) => {
    const { getMemberHandler } = await import("./getMember.handler");
    return getMemberHandler({ ctx, input });
  }),

  // Update a member
  updateMember: authedProcedure.input(ZUpdateMemberSchema).mutation(async ({ ctx, input }) => {
    const { updateMemberHandler } = await import("./updateMember.handler");
    return updateMemberHandler({ ctx, input });
  }),

  // Change member role
  changeMemberRole: authedProcedure
    .input(ZChangeCalidMemberRoleInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { changeCalidMemberRoleHandler } = await import("./changeMemberRole.handler");
      return changeCalidMemberRoleHandler({ ctx, input });
    }),

  acceptOrLeave: authedProcedure.input(ZAcceptOrLeaveInputSchema).mutation(async ({ ctx, input }) => {
    const { acceptOrLeaveHandler } = await import("./acceptOrLeave.handler");
    return acceptOrLeaveHandler({ ctx, input });
  }),

  // List members
  listMembers: authedProcedure.input(ZListMembersSchema).query(async ({ ctx, input }) => {
    const { listMembersHandler } = await import("./listMembers.handler");
    return listMembersHandler({ ctx, input });
  }),

  allTeamsListMembers: authedProcedure.input(ZAllTeamsListMembersInput).query(async ({ ctx, input }) => {
    const { listMembersHandler } = await import("./allTeamsListMembers.handler");
    return listMembersHandler({ ctx, input });
  }),

  // Check if user has pending invitations
  listPendingInvitations: authedProcedure.query(async ({ ctx }) => {
    const { listPendingInvitationsHandler } = await import("./listPendingInvitations.handler");
    return listPendingInvitationsHandler({ ctx });
  }),

  // Add members to event types
  addMembersToEventType: authedProcedure.input(ZAddMembersToEventType).mutation(async ({ ctx, input }) => {
    const { addMembersToEventTypesHandler } = await import("./addMemberstoEventType.handler");
    return addMembersToEventTypesHandler({ ctx, input });
  }),

  // Resend invitation
  resendInvitation: authedProcedure.input(ZResendCalidInvitationSchema).mutation(async ({ ctx, input }) => {
    const { resendCalidInvitationHandler } = await import("./resendInvitation.handler");
    return resendCalidInvitationHandler({ ctx, input });
  }),

  calidListTeam: authedProcedure.input(ZCalidListTeamAvailaiblityScheme).query(async ({ ctx, input }) => {
    const { listTeamAvailabilityHandler } = await import("./calidListTeamAvailability.handler");

    return listTeamAvailabilityHandler({
      ctx,
      input,
    });
  }),
});
