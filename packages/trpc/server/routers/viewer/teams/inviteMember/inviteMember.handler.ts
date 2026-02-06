import { type TFunction } from "i18next";

import { getTeamBillingServiceFactory } from "@calcom/ee/billing/di/containers/Billing";
import { DueInvoiceService } from "@calcom/features/ee/billing/service/dueInvoice/DueInvoiceService";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { isOrganisationOwner } from "@calcom/features/pbac/utils/isOrganisationAdmin";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { CreationSource } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TInviteMemberInputSchema } from "./inviteMember.schema";
import type { TeamWithParent } from "./types";
import type { Invitation } from "./utils";
import { inviteMembersWithNoInviterPermissionCheck } from "@calcom/features/ee/teams/lib/inviteMembers";
import { ensureAtleastAdminPermissions } from "@calcom/features/ee/teams/lib/inviteMembersUtils";
import { getOrgConnectionInfo } from "@calcom/features/ee/teams/lib/inviteMembersUtils";
import { getOrgState } from "@calcom/features/ee/teams/lib/inviteMembersUtils";
import { getTeamOrThrow } from "@calcom/features/ee/teams/lib/inviteMembersUtils";
import { getUniqueInvitationsOrThrowIfEmpty } from "@calcom/features/ee/teams/lib/inviteMembersUtils";
import { handleExistingUsersInvites } from "@calcom/features/ee/teams/lib/inviteMembersUtils";
import { handleNewUsersInvites } from "@calcom/features/ee/teams/lib/inviteMembersUtils";
import { INVITE_STATUS } from "@calcom/features/ee/teams/lib/inviteMembersUtils";


const log = logger.getSubLogger({ prefix: ["inviteMember.handler"] });

type InviteMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TInviteMemberInputSchema;
};

// Local helpers removed as they are now in inviteMembers.ts or inviteMembersUtils.ts
// inviteMembersWithNoInviterPermissionCheck is imported.


const inviteMembers = async ({ ctx, input }: InviteMemberOptions) => {
  const { user: inviter } = ctx;
  const { usernameOrEmail, role, isPlatform, creationSource } = input;

  const team = await getTeamOrThrow(input.teamId);

  const permissionCheckService = new PermissionCheckService();
  const hasPermission = await permissionCheckService.checkPermission({
    userId: ctx.user.id,
    teamId: team.id,
    permission: "team.invite",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!hasPermission) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not authorized to invite team members in this organization's team",
    });
  }

  // Check if invitations are blocked due to unpaid invoices
  const dueInvoiceService = new DueInvoiceService();
  const inviteeEmails = (typeof usernameOrEmail === "string" ? [usernameOrEmail] : usernameOrEmail).map((u) =>
    typeof u === "string" ? u : u.email
  );
  const canInvite = await dueInvoiceService.canInviteToTeam({
    teamId: team.id,
    inviteeEmails,
    isSubTeam: !!team.parentId,
    parentOrgId: team.parentId,
  });

  if (!canInvite.allowed) {
    const translation = await getTranslation(input.language ?? "en", "common");
    throw new TRPCError({
      code: "FORBIDDEN",
      message: translation(canInvite.reason ?? "invitations_blocked_unpaid_invoice"),
    });
  }

  const requestedSlugForTeam = team?.metadata?.requestedSlug ?? null;
  const isTeamAnOrg = team.isOrganization;
  const organization = inviter.profile.organization;

  let inviterOrgId = inviter.organization.id;
  let orgSlug = organization ? organization.slug || organization.requestedSlug : null;
  let isInviterOrgAdmin = inviter.organization.isOrgAdmin;

  const invitations = buildInvitationsFromInput({
    usernameOrEmail,
    roleForAllInvitees: role,
  });
  const isAddingNewOwner = !!invitations.find((invitation) => invitation.role === MembershipRole.OWNER);

  if (isTeamAnOrg) {
    await throwIfInviterCantAddOwnerToOrg();
  }

  if (isPlatform) {
    inviterOrgId = team.id;
    orgSlug = team ? team.slug || requestedSlugForTeam : null;
    isInviterOrgAdmin = await new UserRepository(prisma).isAdminOrOwnerOfTeam({
      userId: inviter.id,
      teamId: team.id,
    });
  }

  await ensureAtleastAdminPermissions({
    userId: inviter.id,
    teamId: inviterOrgId && isInviterOrgAdmin ? inviterOrgId : input.teamId,
    isOrg: isTeamAnOrg,
  });
  const result = await inviteMembersWithNoInviterPermissionCheck({
    inviterName: inviter.name,
    team,
    language: input.language,
    creationSource,
    orgSlug,
    invitations,
  });
  return result;

  async function throwIfInviterCantAddOwnerToOrg() {
    const isInviterOrgOwner = await isOrganisationOwner(inviter.id, input.teamId);
    if (isAddingNewOwner && !isInviterOrgOwner) throw new TRPCError({ code: "UNAUTHORIZED" });
  }
};

export default async function inviteMemberHandler({ ctx, input }: InviteMemberOptions) {
  const { user: inviter } = ctx;
  await checkRateLimitAndThrowError({
    identifier: `invitedBy:${inviter.id}`,
  });
  return await inviteMembers({ ctx, input });
}
