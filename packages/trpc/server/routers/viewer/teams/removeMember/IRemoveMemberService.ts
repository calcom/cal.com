import type { MembershipRole } from "@calcom/prisma/enums";

export interface RemoveMemberContext {
  userId: number;
  isOrgAdmin: boolean;
  organizationId: number | null;
  memberIds: number[];
  teamIds: number[];
  isOrg: boolean;
}

export interface RemoveMemberPermissionResult {
  hasPermission: boolean;
  userRoles?: Map<number, MembershipRole | null>;
}

export interface IRemoveMemberService {
  /**
   * Checks if the user has permission to remove members from teams
   */
  checkRemovePermissions(context: RemoveMemberContext): Promise<RemoveMemberPermissionResult>;

  /**
   * Validates that the removal can proceed (e.g., owner checks)
   */
  validateRemoval(context: RemoveMemberContext, hasPermission: boolean): Promise<void>;

  /**
   * Performs the actual removal of members from teams
   */
  removeMembers(memberIds: number[], teamIds: number[], isOrg: boolean): Promise<void>;
}
