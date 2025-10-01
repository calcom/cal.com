import { MembershipRole } from "@calcom/prisma/enums";

export interface IRoleManager {
  isPBACEnabled: boolean;
  checkPermissionToChangeRole(
    userId: number,
    targetId: number,
    scope: "org" | "team",
    memberId?: number,
    newRole?: MembershipRole | string
  ): Promise<void>;
  assignRole(
    userId: number,
    organizationId: number,
    role: MembershipRole | string,
    membershipId: number
  ): Promise<void>;
  getAllRoles(organizationId: number): Promise<{ id: string; name: string }[]>;
  getTeamRoles(teamId: number): Promise<{ id: string; name: string }[]>;
}
