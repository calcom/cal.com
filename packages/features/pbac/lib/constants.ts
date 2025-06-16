import { MembershipRole } from "@calcom/prisma/enums";

/**
 * Default role IDs used in the PBAC system
 * These IDs match the ones created in the migration
 */
export const DEFAULT_ROLE_IDS = {
  [MembershipRole.OWNER]: "owner_role",
  [MembershipRole.ADMIN]: "admin_role",
  [MembershipRole.MEMBER]: "member_role",
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
