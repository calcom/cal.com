import authedProcedure from "../../../procedures/authedProcedure";
import { importHandler, router } from "../../../trpc";
import { ZAcceptOrLeaveInputSchema } from "./acceptOrLeave.schema";
import { ZChangeMemberRoleInputSchema } from "./changeMemberRole.schema";
import { ZCreateInputSchema } from "./create.schema";
import { ZCreateInviteInputSchema } from "./createInvite.schema";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZDeleteInviteInputSchema } from "./deleteInvite.schema";
import { ZGetInputSchema } from "./get.schema";
import { ZGetMemberAvailabilityInputSchema } from "./getMemberAvailability.schema";
import { ZGetMembershipbyUserInputSchema } from "./getMembershipbyUser.schema";
import { ZHasEditPermissionForUserSchema } from "./hasEditPermissionForUser.schema";
import { ZInviteMemberInputSchema } from "./inviteMember/inviteMember.schema";
import { ZInviteMemberByTokenSchemaInputSchema } from "./inviteMemberByToken.schema";
import { ZListMembersInputSchema } from "./listMembers.schema";
import { ZPublishInputSchema } from "./publish.schema";
import { ZRemoveMemberInputSchema } from "./removeMember.schema";
import { ZResendInvitationInputSchema } from "./resendInvitation.schema";
import { ZSetInviteExpirationInputSchema } from "./setInviteExpiration.schema";
import { ZUpdateInputSchema } from "./update.schema";
import { ZUpdateMembershipInputSchema } from "./updateMembership.schema";

const NAMESPACE = "teams";
const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const viewerTeamsRouter = router({
  // Retrieves team by id
  get: authedProcedure.input(ZGetInputSchema).query(async (opts) => {
    const handler = await importHandler(namespaced("get"), () => import("./get.handler"));
    return handler(opts);
  }),
  // Returns teams I a member of
  list: authedProcedure.query(async (opts) => {
    const handler = await importHandler(namespaced("list"), () => import("./list.handler"));
    return handler(opts);
  }),
  // Returns Teams I am a owner/admin of
  listOwnedTeams: authedProcedure.query(async (opts) => {
    const handler = await importHandler(namespaced("list"), () => import("./list.handler"));
    return handler(opts);
  }),
  create: authedProcedure.input(ZCreateInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("create"), () => import("./create.handler"));
    return handler(opts);
  }),
  // Allows team owner to update team metadata
  update: authedProcedure.input(ZUpdateInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("update"), () => import("./update.handler"));
    return handler(opts);
  }),
  delete: authedProcedure.input(ZDeleteInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("delete"), () => import("./delete.handler"));
    return handler(opts);
  }),
  removeMember: authedProcedure.input(ZRemoveMemberInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("removeMember"), () => import("./removeMember.handler"));
    return handler(opts);
  }),
  inviteMember: authedProcedure.input(ZInviteMemberInputSchema).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("inviteMember"),
      () => import("./inviteMember/inviteMember.handler")
    );
    return handler(opts);
  }),
  acceptOrLeave: authedProcedure.input(ZAcceptOrLeaveInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("acceptOrLeave"), () => import("./acceptOrLeave.handler"));
    return handler(opts);
  }),
  changeMemberRole: authedProcedure.input(ZChangeMemberRoleInputSchema).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("changeMemberRole"),
      () => import("./changeMemberRole.handler")
    );
    return handler(opts);
  }),
  getMemberAvailability: authedProcedure.input(ZGetMemberAvailabilityInputSchema).query(async (opts) => {
    const handler = await importHandler(
      namespaced("getMemberAvailability"),
      () => import("./getMemberAvailability.handler")
    );
    return handler(opts);
  }),
  getMembershipbyUser: authedProcedure.input(ZGetMembershipbyUserInputSchema).query(async (opts) => {
    const handler = await importHandler(
      namespaced("getMembershipbyUser"),
      () => import("./getMembershipbyUser.handler")
    );
    return handler(opts);
  }),
  updateMembership: authedProcedure.input(ZUpdateMembershipInputSchema).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("updateMembership"),
      () => import("./updateMembership.handler")
    );
    return handler(opts);
  }),
  publish: authedProcedure.input(ZPublishInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("publish"), () => import("./publish.handler"));
    return handler(opts);
  }),
  /** This is a temporal endpoint so we can progressively upgrade teams to the new billing system. */
  getUpgradeable: authedProcedure.query(async (opts) => {
    const handler = await importHandler(
      namespaced("getUpgradeable"),
      () => import("./getUpgradeable.handler")
    );
    return handler(opts);
  }),
  listMembers: authedProcedure.input(ZListMembersInputSchema).query(async (opts) => {
    const handler = await importHandler(namespaced("listMembers"), () => import("./listMembers.handler"));
    return handler(opts);
  }),
  hasTeamPlan: authedProcedure.query(async (opts) => {
    const handler = await importHandler(namespaced("hasTeamPlan"), () => import("./hasTeamPlan.handler"));
    return handler(opts);
  }),
  listInvites: authedProcedure.query(async (opts) => {
    const handler = await importHandler(namespaced("listInvites"), () => import("./listInvites.handler"));
    return handler(opts);
  }),
  createInvite: authedProcedure.input(ZCreateInviteInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("createInvite"), () => import("./createInvite.handler"));
    return handler(opts);
  }),
  setInviteExpiration: authedProcedure.input(ZSetInviteExpirationInputSchema).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("setInviteExpiration"),
      () => import("./setInviteExpiration.handler")
    );
    return handler(opts);
  }),
  deleteInvite: authedProcedure.input(ZDeleteInviteInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("deleteInvite"), () => import("./deleteInvite.handler"));
    return handler(opts);
  }),
  inviteMemberByToken: authedProcedure.input(ZInviteMemberByTokenSchemaInputSchema).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("inviteMemberByToken"),
      () => import("./inviteMemberByToken.handler")
    );
    return handler(opts);
  }),
  hasEditPermissionForUser: authedProcedure.input(ZHasEditPermissionForUserSchema).query(async (opts) => {
    const handler = await importHandler(
      namespaced("hasEditPermissionForUser"),
      () => import("./hasEditPermissionForUser.handler")
    );
    return handler(opts);
  }),
  resendInvitation: authedProcedure.input(ZResendInvitationInputSchema).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("resendInvitation"),
      () => import("./resendInvitation.handler")
    );
    return handler(opts);
  }),
});
