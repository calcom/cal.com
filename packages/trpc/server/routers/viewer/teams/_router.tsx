import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZAcceptOrLeaveInputSchema } from "./acceptOrLeave.schema";
import { ZChangeMemberRoleInputSchema } from "./changeMemberRole.schema";
import { ZCreateInputSchema } from "./create.schema";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZGetInputSchema } from "./get.schema";
import { ZGetMemberAvailabilityInputSchema } from "./getMemberAvailability.schema";
import { ZGetMembershipbyUserInputSchema } from "./getMembershipbyUser.schema";
import { ZInviteMemberInputSchema } from "./inviteMember.schema";
import { ZListMembersInputSchema } from "./listMembers.schema";
import { ZPublishInputSchema } from "./publish.schema";
import { ZRemoveMemberInputSchema } from "./removeMember.schema";
import { ZUpdateInputSchema } from "./update.schema";
import { ZUpdateMembershipInputSchema } from "./updateMembership.schema";

type TeamsRouterHandlerCache = {
  get?: typeof import("./get.handler").getHandler;
  list?: typeof import("./list.handler").listHandler;
  create?: typeof import("./create.handler").createHandler;
  update?: typeof import("./update.handler").updateHandler;
  delete?: typeof import("./delete.handler").deleteHandler;
  removeMember?: typeof import("./removeMember.handler").removeMemberHandler;
  inviteMember?: typeof import("./inviteMember.handler").inviteMemberHandler;
  acceptOrLeave?: typeof import("./acceptOrLeave.handler").acceptOrLeaveHandler;
  changeMemberRole?: typeof import("./changeMemberRole.handler").changeMemberRoleHandler;
  getMemberAvailability?: typeof import("./getMemberAvailability.handler").getMemberAvailabilityHandler;
  getMembershipbyUser?: typeof import("./getMembershipbyUser.handler").getMembershipbyUserHandler;
  updateMembership?: typeof import("./updateMembership.handler").updateMembershipHandler;
  publish?: typeof import("./publish.handler").publishHandler;
  getUpgradeable?: typeof import("./getUpgradeable.handler").getUpgradeableHandler;
  listMembers?: typeof import("./listMembers.handler").listMembersHandler;
  hasTeamPlan?: typeof import("./hasTeamPlan.handler").hasTeamPlanHandler;
  listInvites?: typeof import("./listInvites.handler").listInvitesHandler;
};

const UNSTABLE_HANDLER_CACHE: TeamsRouterHandlerCache = {};

export const viewerTeamsRouter = router({
  // Retrieves team by id
  get: authedProcedure.input(ZGetInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.get) {
      UNSTABLE_HANDLER_CACHE.get = await import("./get.handler").then((mod) => mod.getHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.get) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.get({
      ctx,
      input,
    });
  }),

  // Returns teams I a member of
  list: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.list) {
      UNSTABLE_HANDLER_CACHE.list = await import("./list.handler").then((mod) => mod.listHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.list) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.list({
      ctx,
    });
  }),

  create: authedProcedure.input(ZCreateInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.create) {
      UNSTABLE_HANDLER_CACHE.create = await import("./create.handler").then((mod) => mod.createHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.create) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.create({
      ctx,
      input,
    });
  }),

  // Allows team owner to update team metadata
  update: authedProcedure.input(ZUpdateInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.update) {
      UNSTABLE_HANDLER_CACHE.update = await import("./update.handler").then((mod) => mod.updateHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.update) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.update({
      ctx,
      input,
    });
  }),

  delete: authedProcedure.input(ZDeleteInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.delete) {
      UNSTABLE_HANDLER_CACHE.delete = await import("./delete.handler").then((mod) => mod.deleteHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.delete) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.delete({
      ctx,
      input,
    });
  }),

  removeMember: authedProcedure.input(ZRemoveMemberInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.removeMember) {
      UNSTABLE_HANDLER_CACHE.removeMember = await import("./removeMember.handler").then(
        (mod) => mod.removeMemberHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.removeMember) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.removeMember({
      ctx,
      input,
    });
  }),

  inviteMember: authedProcedure.input(ZInviteMemberInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.inviteMember) {
      UNSTABLE_HANDLER_CACHE.inviteMember = await import("./inviteMember.handler").then(
        (mod) => mod.inviteMemberHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.inviteMember) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.inviteMember({
      ctx,
      input,
    });
  }),

  acceptOrLeave: authedProcedure.input(ZAcceptOrLeaveInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.acceptOrLeave) {
      UNSTABLE_HANDLER_CACHE.acceptOrLeave = await import("./acceptOrLeave.handler").then(
        (mod) => mod.acceptOrLeaveHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.acceptOrLeave) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.acceptOrLeave({
      ctx,
      input,
    });
  }),

  changeMemberRole: authedProcedure.input(ZChangeMemberRoleInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.changeMemberRole) {
      UNSTABLE_HANDLER_CACHE.changeMemberRole = await import("./changeMemberRole.handler").then(
        (mod) => mod.changeMemberRoleHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.changeMemberRole) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.changeMemberRole({
      ctx,
      input,
    });
  }),

  getMemberAvailability: authedProcedure
    .input(ZGetMemberAvailabilityInputSchema)
    .query(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.getMemberAvailability) {
        UNSTABLE_HANDLER_CACHE.getMemberAvailability = await import("./getMemberAvailability.handler").then(
          (mod) => mod.getMemberAvailabilityHandler
        );
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.getMemberAvailability) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.getMemberAvailability({
        ctx,
        input,
      });
    }),

  getMembershipbyUser: authedProcedure
    .input(ZGetMembershipbyUserInputSchema)
    .query(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.getMembershipbyUser) {
        UNSTABLE_HANDLER_CACHE.getMembershipbyUser = await import("./getMembershipbyUser.handler").then(
          (mod) => mod.getMembershipbyUserHandler
        );
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.getMembershipbyUser) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.getMembershipbyUser({
        ctx,
        input,
      });
    }),

  updateMembership: authedProcedure.input(ZUpdateMembershipInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.updateMembership) {
      UNSTABLE_HANDLER_CACHE.updateMembership = await import("./updateMembership.handler").then(
        (mod) => mod.updateMembershipHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.updateMembership) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.updateMembership({
      ctx,
      input,
    });
  }),

  publish: authedProcedure.input(ZPublishInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.publish) {
      UNSTABLE_HANDLER_CACHE.publish = await import("./publish.handler").then((mod) => mod.publishHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.publish) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.publish({
      ctx,
      input,
    });
  }),

  /** This is a temporal endpoint so we can progressively upgrade teams to the new billing system. */
  getUpgradeable: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.getUpgradeable) {
      UNSTABLE_HANDLER_CACHE.getUpgradeable = await import("./getUpgradeable.handler").then(
        (mod) => mod.getUpgradeableHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.getUpgradeable) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.getUpgradeable({
      ctx,
    });
  }),

  listMembers: authedProcedure.input(ZListMembersInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.listMembers) {
      UNSTABLE_HANDLER_CACHE.listMembers = await import("./listMembers.handler").then(
        (mod) => mod.listMembersHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.listMembers) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.listMembers({
      ctx,
      input,
    });
  }),

  hasTeamPlan: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.hasTeamPlan) {
      UNSTABLE_HANDLER_CACHE.hasTeamPlan = await import("./hasTeamPlan.handler").then(
        (mod) => mod.hasTeamPlanHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.hasTeamPlan) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.hasTeamPlan({
      ctx,
    });
  }),

  listInvites: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.listInvites) {
      UNSTABLE_HANDLER_CACHE.listInvites = await import("./listInvites.handler").then(
        (mod) => mod.listInvitesHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.listInvites) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.listInvites({
      ctx,
    });
  }),
});
