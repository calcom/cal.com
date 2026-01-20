"use client";

import type { EventPermissions } from "../context/EventPermissionContext";
import { useEventPermissionStore } from "../context/EventPermissionContext";

export const useEventTypePermission = (permission: keyof EventPermissions["eventTypes"]) => {
  return useEventPermissionStore((state) => ({
    hasPermission: state.hasEventTypePermission(permission),
    permissions: state.permissions.eventTypes,
  }));
};

export const useWorkflowPermission = (permission: keyof EventPermissions["workflows"]) => {
  return useEventPermissionStore((state) => ({
    hasPermission: state.hasWorkflowPermission(permission),
    permissions: state.permissions.workflows,
  }));
};

export const useAllEventPermissions = () => {
  return useEventPermissionStore((state) => state.permissions);
};

// Convenience hooks for common permissions
export const useCanCreateEventTypes = () => {
  return useEventPermissionStore((state) => state.permissions.eventTypes.canCreate);
};

export const useCanUpdateEventTypes = () => {
  return useEventPermissionStore((state) => state.permissions.eventTypes.canUpdate);
};

export const useCanDeleteEventTypes = () => {
  return useEventPermissionStore((state) => state.permissions.eventTypes.canDelete);
};

export const useCanReadWorkflows = () => {
  return useEventPermissionStore((state) => state.permissions.workflows.canRead);
};

export const useCanCreateWorkflows = () => {
  return useEventPermissionStore((state) => state.permissions.workflows.canCreate);
};

export const useCanUpdateWorkflows = () => {
  return useEventPermissionStore((state) => state.permissions.workflows.canUpdate);
};

export const useCanDeleteWorkflows = () => {
  return useEventPermissionStore((state) => state.permissions.workflows.canDelete);
};
