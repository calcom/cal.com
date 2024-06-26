import { MembershipRole, UserPermissionRole } from "@prisma/client";

export const SYSTEM_ADMIN_ROLE = "SYSADMIN";
export const ORG_ROLES = [
  `ORG_${MembershipRole.OWNER}`,
  `ORG_${MembershipRole.ADMIN}`,
  `ORG_${MembershipRole.MEMBER}`,
] as const;
export const TEAM_ROLES = [
  `TEAM_${MembershipRole.OWNER}`,
  `TEAM_${MembershipRole.ADMIN}`,
  `TEAM_${MembershipRole.MEMBER}`,
] as const;
export const USER_ROLES = [`USER_${UserPermissionRole.ADMIN}`, `USER_${UserPermissionRole.USER}`] as const;
