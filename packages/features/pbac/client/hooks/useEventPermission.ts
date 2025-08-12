"use client";

import type { PermissionString } from "../../domain/types/permission-registry";
import { useEventPermissionStore } from "../context/EventPermissionContext";

export const useEventTypePermission = (permission: PermissionString) => {
  return useEventPermissionStore((state) => ({
    hasPermission: state.hasEventTypePermission(permission),
    permissions: state.permissions.eventTypes,
  }));
};

export const useEventTypePermissions = (permissions: PermissionString[]) => {
  return useEventPermissionStore((state) => ({
    hasPermissions: state.hasEventTypePermissions(permissions),
    permissions: state.permissions.eventTypes,
  }));
};

export const useWorkflowPermission = (permission: PermissionString) => {
  return useEventPermissionStore((state) => ({
    hasPermission: state.hasWorkflowPermission(permission),
    permissions: state.permissions.workflows,
  }));
};

export const useWorkflowPermissions = (permissions: PermissionString[]) => {
  return useEventPermissionStore((state) => ({
    hasPermissions: state.hasWorkflowPermissions(permissions),
    permissions: state.permissions.workflows,
  }));
};

export const useAllEventPermissions = () => {
  return useEventPermissionStore((state) => state.permissions);
};
