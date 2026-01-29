"use client";

import { createContext, useContext, type ReactNode } from "react";

import { useHostsForEventType } from "./useHostsForEventType";
import type { Host, PendingHostChanges } from "./types";

type HostsContextValue = {
  addHost: (host: Host) => void;
  updateHost: (userId: number, changes: Partial<Omit<Host, "userId">>) => void;
  removeHost: (userId: number) => void;
  setHosts: (serverHosts: Host[], newHosts: Host[]) => void;
  pendingChanges: PendingHostChanges;
};

const HostsContext = createContext<HostsContextValue | null>(null);

/**
 * Provider that manages hosts state efficiently using delta tracking.
 * Wrap your event type form with this provider to enable efficient host management.
 */
export function HostsProvider({ children }: { children: ReactNode }) {
  const hostsData = useHostsForEventType();

  return <HostsContext.Provider value={hostsData}>{children}</HostsContext.Provider>;
}

/**
 * Hook to access hosts management functions.
 * Must be used within a HostsProvider.
 */
export function useHosts() {
  const context = useContext(HostsContext);
  if (!context) {
    throw new Error("useHosts must be used within a HostsProvider");
  }
  return context;
}
