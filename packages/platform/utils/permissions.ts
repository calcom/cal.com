import type { PLATFORM_PERMISSIONS } from "@calcom/platform-types";

export const hasPermission = (userPermissions: number, permission: PLATFORM_PERMISSIONS): boolean => {
  // Use bitwise AND to check if each required permission is present
  return (userPermissions & permission) === permission;
};

export const hasPermissions = (userPermissions: number, permissions: PLATFORM_PERMISSIONS[]): boolean => {
  // Use bitwise AND to check if each required permission is present
  return permissions.every((permission) => hasPermission(userPermissions, permission));
};
