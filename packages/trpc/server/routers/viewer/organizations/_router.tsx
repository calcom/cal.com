import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import {
  ZCreateOrganizationInputSchema,
  ZInviteMemberInputSchema,
  ZListMembersInputSchema,
  ZRemoveMemberInputSchema,
  ZUpdateMemberRoleInputSchema,
  ZUpdateOrganizationInputSchema,
} from "./schema";

export const organizationsRouter = router({
  getCurrent: authedProcedure.query(async ({ ctx }) => {
    const { getCurrentHandler } = await import("./getCurrent.handler");

    return getCurrentHandler({ ctx });
  }),

  create: authedProcedure.input(ZCreateOrganizationInputSchema).mutation(async ({ ctx, input }) => {
    const { createHandler } = await import("./create.handler");

    return createHandler({ ctx, input });
  }),

  update: authedProcedure.input(ZUpdateOrganizationInputSchema).mutation(async ({ ctx, input }) => {
    const { updateHandler } = await import("./update.handler");

    return updateHandler({ ctx, input });
  }),

  listMembers: authedProcedure.input(ZListMembersInputSchema).query(async ({ ctx, input }) => {
    const { listMembersHandler } = await import("./listMembers.handler");

    return listMembersHandler({ ctx, input });
  }),

  inviteMember: authedProcedure.input(ZInviteMemberInputSchema).mutation(async ({ ctx, input }) => {
    const { inviteMemberHandler } = await import("./inviteMember.handler");

    return inviteMemberHandler({ ctx, input });
  }),

  removeMember: authedProcedure.input(ZRemoveMemberInputSchema).mutation(async ({ ctx, input }) => {
    const { removeMemberHandler } = await import("./removeMember.handler");

    return removeMemberHandler({ ctx, input });
  }),

  updateMemberRole: authedProcedure.input(ZUpdateMemberRoleInputSchema).mutation(async ({ ctx, input }) => {
    const { updateMemberRoleHandler } = await import("./updateMemberRole.handler");

    return updateMemberRoleHandler({ ctx, input });
  }),
});
