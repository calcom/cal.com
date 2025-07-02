/**
 * Default role IDs used in the PBAC system
 * These IDs match the ones created in the migration
 */
export const DEFAULT_ROLES = {
  OWNER: "owner_role",
  ADMIN: "admin_role",
  MEMBER: "member_role",
} as const;

/**
 * Type for default role IDs
 */
export type DefaultRoleId = (typeof DEFAULT_ROLES)[keyof typeof DEFAULT_ROLES];

/**
 * Mapping of default roles to their descriptions
 */
export const DEFAULT_ROLE_DESCRIPTIONS = {
  [DEFAULT_ROLES.OWNER]: "pbac_owner_role_description",
  [DEFAULT_ROLES.ADMIN]: "pbac_admin_role_description",
  [DEFAULT_ROLES.MEMBER]: "pbac_member_role_description",
} as const;
