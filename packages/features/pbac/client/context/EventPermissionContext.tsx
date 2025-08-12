"use client";

import { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";

import type { PermissionString } from "../../domain/types/permission-registry";

export interface EventPermissions {
  eventTypes: PermissionString[];
  workflows: PermissionString[];
}

interface EventPermissionStore {
  permissions: EventPermissions;
  setPermissions: (permissions: EventPermissions) => void;
  hasEventTypePermission: (permission: PermissionString) => boolean;
  hasWorkflowPermission: (permission: PermissionString) => boolean;
  hasEventTypePermissions: (permissions: PermissionString[]) => boolean;
  hasWorkflowPermissions: (permissions: PermissionString[]) => boolean;
}

const createEventPermissionStore = (
  initialPermissions: EventPermissions = { eventTypes: [], workflows: [] }
) =>
  createStore<EventPermissionStore>()((set, get) => ({
    permissions: initialPermissions,
    setPermissions: (permissions) => set({ permissions }),
    hasEventTypePermission: (permission) => {
      const { permissions } = get();
      return permissions.eventTypes.includes(permission);
    },
    hasWorkflowPermission: (permission) => {
      const { permissions } = get();
      return permissions.workflows.includes(permission);
    },
    hasEventTypePermissions: (requiredPermissions) => {
      const { permissions } = get();
      return requiredPermissions.every((permission) => permissions.eventTypes.includes(permission));
    },
    hasWorkflowPermissions: (requiredPermissions) => {
      const { permissions } = get();
      return requiredPermissions.every((permission) => permissions.workflows.includes(permission));
    },
  }));

type EventPermissionStoreApi = ReturnType<typeof createEventPermissionStore>;

const EventPermissionContext = createContext<EventPermissionStoreApi | undefined>(undefined);

interface EventPermissionProviderProps {
  children: React.ReactNode;
  initialPermissions: EventPermissions;
}

export const EventPermissionProvider = ({ children, initialPermissions }: EventPermissionProviderProps) => {
  const store = createEventPermissionStore(initialPermissions);

  return <EventPermissionContext.Provider value={store}>{children}</EventPermissionContext.Provider>;
};

export const useEventPermissionStore = <T,>(selector: (store: EventPermissionStore) => T): T => {
  const eventPermissionStoreContext = useContext(EventPermissionContext);

  if (!eventPermissionStoreContext) {
    throw new Error("useEventPermissionStore must be used within EventPermissionProvider");
  }

  return useStore(eventPermissionStoreContext, selector);
};
