import { MembershipRole } from "@calcom/prisma/enums";

/**
 * Enum for default role IDs
 */
export enum DefaultPBACRole {
  OWNER_ROLE = "owner_role",
  ADMIN_ROLE = "admin_role",
  MEMBER_ROLE = "member_role",
}

/**
 * Default role IDs used in the PBAC system
 * These IDs match the ones created in the migration
 */
export const DEFAULT_ROLE_IDS = {
  [MembershipRole.OWNER]: DefaultPBACRole.OWNER_ROLE,
  [MembershipRole.ADMIN]: DefaultPBACRole.ADMIN_ROLE,
  [MembershipRole.MEMBER]: DefaultPBACRole.MEMBER_ROLE,
} as const;

/**
 * Type for default role IDs
 */
export type DefaultRoleId = (typeof DEFAULT_ROLE_IDS)[keyof typeof DEFAULT_ROLE_IDS];

/**
 * Mapping of default roles to their descriptions
 */
export const DEFAULT_ROLE_DESCRIPTIONS = {
  [DEFAULT_ROLE_IDS.OWNER]: "pbac_owner_role_description",
  [DEFAULT_ROLE_IDS.ADMIN]: "pbac_admin_role_description",
  [DEFAULT_ROLE_IDS.MEMBER]: "pbac_member_role_description",
} as const;
