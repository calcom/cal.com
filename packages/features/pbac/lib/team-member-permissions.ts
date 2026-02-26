import { MembershipRole } from "@calcom/prisma/enums";
import { CustomAction, Resource } from "../domain/types/permission-registry";
import { getSpecificPermissions } from "./resource-permissions";

export interface MemberPermissions {
  canListMembers: boolean;
  canInvite: boolean;
  canChangeMemberRole: boolean;
  canRemove: boolean;
  canImpersonate: boolean;
  canResetPassword?: boolean;
  canEditAttributesForUser?: boolean;
  canViewAttributes?: boolean;
}

interface TeamWithMembership {
  id: number;
  isPrivate: boolean;
  membership: {
    role: MembershipRole;
    accepted: boolean;
  };
}

interface GetTeamMemberPermissionsOptions {
  userId: number;
  team: TeamWithMembership;
}

/**
 * Gets team member permissions using PBAC or fallback to role-based permissions.
 */
export async function getTeamMemberPermissions({
  userId,
  team,
}: GetTeamMemberPermissionsOptions): Promise<MemberPermissions> {
  // Determine fallback roles for ListMembers based on team privacy
  const fallbackRolesCanListMembers: MembershipRole[] = [MembershipRole.ADMIN, MembershipRole.OWNER];
  if (!team.isPrivate) {
    fallbackRolesCanListMembers.push(MembershipRole.MEMBER);
  }

  // Get specific PBAC permissions for team member actions
  const permissions = await getSpecificPermissions({
    userId,
    teamId: team.id,
    resource: Resource.Team,
    userRole: team.membership.role,
    actions: [
      CustomAction.Invite,
      CustomAction.ChangeMemberRole,
      CustomAction.Remove,
      CustomAction.ListMembers,
      CustomAction.ListMembersPrivate,
      CustomAction.Impersonate,
    ],
    fallbackRoles: {
      [CustomAction.Invite]: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
      [CustomAction.ChangeMemberRole]: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
      [CustomAction.Remove]: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
      [CustomAction.ListMembers]: {
        roles: fallbackRolesCanListMembers,
      },
      [CustomAction.Impersonate]: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
      [CustomAction.ListMembersPrivate]: {
        roles: fallbackRolesCanListMembers,
      },
    },
  });

  // Map specific permissions to member actions
  return {
    canListMembers: team.isPrivate
      ? permissions[CustomAction.ListMembersPrivate]
      : permissions[CustomAction.ListMembers],
    canInvite: permissions[CustomAction.Invite],
    canChangeMemberRole: permissions[CustomAction.ChangeMemberRole],
    canRemove: permissions[CustomAction.Remove],
    canImpersonate: permissions[CustomAction.Impersonate],
  };
}
