import {
  BOOKING_READ,
  BOOKING_WRITE,
  EVENT_TYPE_READ,
  EVENT_TYPE_WRITE,
  PERMISSIONS,
  SCHEDULE_READ,
  SCHEDULE_WRITE,
  APPS_READ,
  APPS_WRITE,
  PROFILE_READ,
  PROFILE_WRITE,
} from "@calcom/platform-constants";
import type { PLATFORM_PERMISSION } from "@calcom/platform-constants";

export const hasPermission = (userPermissions: number, permission: PLATFORM_PERMISSION): boolean => {
  // use bitwise AND to check if user has the permission
  return (userPermissions & permission) === permission;
};

export const hasPermissions = (userPermissions: number, permissions: PLATFORM_PERMISSION[]): boolean => {
  // use bitwise AND to check if each required permission is present
  return permissions.every((permission) => hasPermission(userPermissions, permission));
};

export const hasEventTypeReadPermission = (userPermissions: number): boolean => {
  return hasPermission(userPermissions, EVENT_TYPE_READ);
};

export const hasEventTypeWritePermission = (userPermissions: number): boolean => {
  return hasPermission(userPermissions, EVENT_TYPE_WRITE);
};

export const hasBookingReadPermission = (userPermissions: number): boolean => {
  return hasPermission(userPermissions, BOOKING_READ);
};

export const hasBookingWritePermission = (userPermissions: number): boolean => {
  return hasPermission(userPermissions, BOOKING_WRITE);
};

export const hasScheduleReadPermission = (userPermissions: number): boolean => {
  return hasPermission(userPermissions, SCHEDULE_READ);
};

export const hasScheduleWritePermission = (userPermissions: number): boolean => {
  return hasPermission(userPermissions, SCHEDULE_WRITE);
};

export const hasAppsReadPermission = (userPermissions: number): boolean => {
  return hasPermission(userPermissions, APPS_READ);
};

export const hasAppsWritePermission = (userPermissions: number): boolean => {
  return hasPermission(userPermissions, APPS_WRITE);
};

export const hasProfileReadPermission = (userPermissions: number): boolean => {
  return hasPermission(userPermissions, PROFILE_READ);
};

export const hasProfileWritePermission = (userPermissions: number): boolean => {
  return hasPermission(userPermissions, PROFILE_WRITE);
};

export const listPermissions = (userPermissions: number): PLATFORM_PERMISSION[] => {
  return PERMISSIONS.reduce((acc, permission) => {
    if (hasPermission(userPermissions, permission)) {
      return [...acc, permission];
    }
    return acc;
  }, [] as PLATFORM_PERMISSION[]);
};
