import { SeatChangeTrackingService } from "@calcom/features/ee/billing/service/seatTracking/SeatChangeTrackingService";
import { getParsedTeam } from "@calcom/features/ee/teams/lib/getParsedTeam";
import {
  createMemberships,
  getTeamOrThrow,
  sendEmails,
  sendExistingUserTeamInviteEmails,
  sendSignupToOrganizationEmail,
  type UserWithMembership,
} from "@calcom/features/ee/teams/lib/inviteMemberUtils";
import { updateNewTeamMemberEventTypes } from "@calcom/features/ee/teams/lib/queries";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { createAProfileForAnExistingUser } from "@calcom/features/profile/lib/createAProfileForAnExistingUser";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { ENABLE_PROFILE_SWITCHER } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import slugify from "@calcom/lib/slugify";
import { prisma } from "@calcom/prisma";
import type { OrganizationSettings, Team } from "@calcom/prisma/client";
import type { CreationSource } from "@calcom/prisma/enums";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import { isEmail } from "../util";
import type { TeamWithParent } from "./types";

export type { Invitee, UserWithMembership, Invitation } from "@calcom/features/ee/teams/lib/inviteMemberUtils";
export {
  createMemberships,
  getTeamOrThrow,
  sendEmails,
  sendExistingUserTeamInviteEmails,
  sendSignupToOrganizationEmail,
  getUniqueInvitationsOrThrowIfEmpty,
  canBeInvited,
  findUsersWithInviteStatus,
  getOrgState,
  getOrgConnectionInfo,
  createNewUsersConnectToOrgIfExists,
  groupUsersByJoinability,
  handleExistingUsersInvites,
  handleNewUsersInvites,
  INVITE_STATUS,
} from "@calcom/features/ee/teams/lib/inviteMemberUtils";

export async function ensureAtleastAdminPermissions({
  userId,
  teamId,
  isOrg,
}: {
  userId: number;
  teamId: number;
  isOrg?: boolean;
}) {
  const permissionCheckService = new PermissionCheckService();

  // Checks if the team they are inviting to IS the org. Not a child team
  // TODO: do some logic here to check if the user is inviting a NEW user to a team that ISNT in the same org
  const permission = isOrg ? "organization.invite" : "team.invite";
  const hasInvitePermission = await permissionCheckService.checkPermission({
    userId,
    teamId,
    permission,
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!hasInvitePermission) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
}

export function checkInputEmailIsValid(email: string) {
  if (!isEmail(email))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invite failed because ${email} is not a valid email address`,
    });
}
