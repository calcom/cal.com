import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZAcceptOrLeaveInputSchema } from "./acceptOrLeave.schema";
import { ZAddMembersToEventTypes } from "./addMembersToEventTypes.schema";
import { ZChangeMemberRoleInputSchema } from "./changeMemberRole.schema";
import { ZCheckIfMembershipExistsInputSchema } from "./checkIfMembershipExists.schema";
import { ZCreateInputSchema } from "./create.schema";
import { ZCreateInviteInputSchema } from "./createInvite.schema";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZDeleteInviteInputSchema } from "./deleteInvite.schema";
import { ZInviteMemberInputSchema } from "./inviteMember/inviteMember.schema";
import { ZInviteMemberByTokenSchemaInputSchema } from "./inviteMemberByToken.schema";
import { ZPublishInputSchema } from "./publish.schema";
import { ZRemoveHostsFromEventTypes } from "./removeHostsFromEventTypes.schema";
import { ZRemoveMemberInputSchema } from "./removeMember.schema";
import { ZResendInvitationInputSchema } from "./resendInvitation.schema";
import { ZRoundRobinManualReassignInputSchema } from "./roundRobinManualReassign.schema";
import { ZRoundRobinReassignInputSchema } from "./roundRobinReassign.schema";
import { ZSetInviteExpirationInputSchema } from "./setInviteExpiration.schema";
import { ZSkipTeamTrialsInputSchema } from "./skipTeamTrials.schema";
import { ZUpdateInputSchema } from "./update.schema";
import { ZUpdateInternalNotesPresetsInputSchema } from "./updateInternalNotesPresets.schema";
import { ZUpdateMembershipInputSchema } from "./updateMembership.schema";

export const teamsRouter = router({
  create: authedProcedure.input(ZCreateInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./create.handler");
    return handler(opts);
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
  updateMembership: authedProcedure.input(ZUpdateMembershipInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./updateMembership.handler");
    return handler(opts);
  }),
  publish: authedProcedure.input(ZPublishInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./publish.handler");
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
  resendInvitation: authedProcedure.input(ZResendInvitationInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./resendInvitation.handler");
    return handler(opts);
  }),
  roundRobinReassign: authedProcedure.input(ZRoundRobinReassignInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./roundRobinReassign.handler");
    return handler(opts);
  }),
  roundRobinManualReassign: authedProcedure
    .input(ZRoundRobinManualReassignInputSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./roundRobinManualReassign.handler");
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
  updateInternalNotesPresets: authedProcedure
    .input(ZUpdateInternalNotesPresetsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { default: handler } = await import("./updateInternalNotesPresets.handler");
      return handler({ ctx, input });
    }),
  skipTeamTrials: authedProcedure.input(ZSkipTeamTrialsInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./skipTeamTrials.handler");
    return handler(opts);
  }),
});
