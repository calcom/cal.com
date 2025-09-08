import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { hasTeamPlan } from "../procedures/hasTeamPlan";
import { ZGetSchema } from "./get.schema";
import { ZGetInternalNotesPresetsInputSchema } from "./getInternalNotesPresets.schema";
import { ZGetMemberAvailabilityInputSchema } from "./getMemberAvailability.schema";
import { ZGetMembershipbyUserInputSchema } from "./getMembershipbyUser.schema";
import { ZGetRoundRobinHostsInputSchema } from "./getRoundRobinHostsToReasign.schema";
import { ZGetUserConnectedAppsInputSchema } from "./getUserConnectedApps.schema";
import { ZHasActiveTeamPlanInputSchema } from "./hasActiveTeamPlan.schema";
import { ZHasEditPermissionForUserSchema } from "./hasEditPermissionForUser.schema";
import { ZLegacyListMembersInputSchema } from "./legacyListMembers.schema";
import { ZGetListSchema } from "./list.schema";
import { ZListMembersInputSchema } from "./listMembers.schema";

export const teamsQueriesRouter = router({
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
  getMemberAvailability: authedProcedure.input(ZGetMemberAvailabilityInputSchema).query(async (opts) => {
    const { default: handler } = await import("./getMemberAvailability.handler");
    return handler(opts);
  }),
  getMembershipbyUser: authedProcedure.input(ZGetMembershipbyUserInputSchema).query(async (opts) => {
    const { default: handler } = await import("./getMembershipbyUser.handler");
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
  hasEditPermissionForUser: authedProcedure.input(ZHasEditPermissionForUserSchema).query(async (opts) => {
    const { default: handler } = await import("./hasEditPermissionForUser.handler");
    return handler(opts);
  }),
  getRoundRobinHostsToReassign: authedProcedure.input(ZGetRoundRobinHostsInputSchema).query(async (opts) => {
    const { default: handler } = await import("./getRoundRobinHostsToReasign.handler");
    return handler(opts);
  }),
  getInternalNotesPresets: authedProcedure
    .input(ZGetInternalNotesPresetsInputSchema)
    .query(async ({ ctx, input }) => {
      const { default: handler } = await import("./getInternalNotesPresets.handler");
      return handler({ ctx, input });
    }),
  hasActiveTeamPlan: authedProcedure.input(ZHasActiveTeamPlanInputSchema).query(async (opts) => {
    const { default: handler } = await import("./hasActiveTeamPlan.handler");
    return handler(opts);
  }),
});
