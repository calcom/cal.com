"use client";

import { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";

export interface EventPermissions {
  eventTypes: {
    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  };
  workflows: {
    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  };
}

interface EventPermissionStore {
  permissions: EventPermissions;
  setPermissions: (permissions: EventPermissions) => void;
  hasEventTypePermission: (permission: keyof EventPermissions["eventTypes"]) => boolean;
  hasWorkflowPermission: (permission: keyof EventPermissions["workflows"]) => boolean;
}

const createEventPermissionStore = (
  initialPermissions: EventPermissions = {
    eventTypes: {
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
    },
    workflows: {
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
    },
  }
) =>
  createStore<EventPermissionStore>()((set, get) => ({
    permissions: initialPermissions,
    setPermissions: (permissions) => set({ permissions }),
    hasEventTypePermission: (permission) => {
      const { permissions } = get();
      return permissions.eventTypes[permission];
    },
    hasWorkflowPermission: (permission) => {
      const { permissions } = get();
      return permissions.workflows[permission];
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
