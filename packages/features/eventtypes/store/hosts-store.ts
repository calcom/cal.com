"use client";

import { createStore } from "zustand";

import type { Host, HostLocation, HostUpdate, PendingHostChanges } from "../lib/types";

const DEFAULT_PENDING: PendingHostChanges = {
  hostsToAdd: [],
  hostsToUpdate: [],
  hostsToRemove: [],
};

export type HostsStore = {
  // Round-robin pending changes
  rrPendingChanges: PendingHostChanges;
  // Fixed pending changes
  fixedPendingChanges: PendingHostChanges;

  // Server-side hosts (baseline for computing full array)
  serverRRHosts: Host[];
  serverFixedHosts: Host[];

  // Saved host locations snapshot (captured before clearAllHostLocations)
  // Used to restore locations on toggle-off-then-on without relying on server
  // data (which may not include the location relation).
  savedRRLocations: Map<number, HostLocation | null>;
  savedFixedLocations: Map<number, HostLocation | null>;

  // Seed server hosts (called when tRPC data arrives)
  setServerHosts: (rrHosts: Host[], fixedHosts: Host[]) => void;

  // RR host operations
  addRRHost: (host: Host) => void;
  updateRRHost: (update: HostUpdate) => void;
  removeRRHost: (userId: number) => void;
  clearRRHostLocations: (formHosts: Host[]) => void;
  restoreRRHostLocations: () => void;
  setRRHosts: (serverHosts: Host[], newHosts: Host[]) => void;

  // Fixed host operations
  addFixedHost: (host: Host) => void;
  updateFixedHost: (update: HostUpdate) => void;
  removeFixedHost: (userId: number) => void;
  clearFixedHostLocations: (formHosts: Host[]) => void;
  restoreFixedHostLocations: () => void;
  setFixedHosts: (serverHosts: Host[], newHosts: Host[]) => void;

  // Reset (used after form submit)
  reset: () => void;
};

function addHostToChanges(current: PendingHostChanges, host: Host): PendingHostChanges {
  // If this host was previously removed, undo the removal
  const hostsToRemove = current.hostsToRemove.filter((id) => id !== host.userId);
  // Check if already in hostsToAdd
  const existingAddIndex = current.hostsToAdd.findIndex((h) => h.userId === host.userId);
  const hostsToAdd =
    existingAddIndex >= 0
      ? current.hostsToAdd.map((h, i) => (i === existingAddIndex ? host : h))
      : [...current.hostsToAdd, host];

  return { ...current, hostsToAdd, hostsToRemove };
}

function updateHostInChanges(current: PendingHostChanges, update: HostUpdate): PendingHostChanges {
  // If host is in hostsToAdd, update it there
  const addIndex = current.hostsToAdd.findIndex((h) => h.userId === update.userId);
  if (addIndex >= 0) {
    const hostsToAdd = current.hostsToAdd.map((h, i) => {
      if (i !== addIndex) return h;
      return {
        ...h,
        ...(update.isFixed !== undefined && { isFixed: update.isFixed }),
        ...(update.priority !== undefined && { priority: update.priority }),
        ...(update.weight !== undefined && { weight: update.weight }),
        ...(update.scheduleId !== undefined && { scheduleId: update.scheduleId }),
        ...(update.groupId !== undefined && { groupId: update.groupId }),
        ...(update.location !== undefined && { location: update.location }),
      };
    });
    return { ...current, hostsToAdd };
  }

  // Otherwise update in hostsToUpdate
  const existingUpdateIndex = current.hostsToUpdate.findIndex((h) => h.userId === update.userId);
  const hostsToUpdate =
    existingUpdateIndex >= 0
      ? current.hostsToUpdate.map((h, i) => (i === existingUpdateIndex ? { ...h, ...update } : h))
      : [...current.hostsToUpdate, update];

  return { ...current, hostsToUpdate };
}

function removeHostFromChanges(current: PendingHostChanges, userId: number): PendingHostChanges {
  // Check if host was only added client-side (never saved to server)
  const wasClientOnly = current.hostsToAdd.some((h) => h.userId === userId);
  // Remove from hostsToAdd if present
  const hostsToAdd = current.hostsToAdd.filter((h) => h.userId !== userId);
  // Remove from hostsToUpdate if present
  const hostsToUpdate = current.hostsToUpdate.filter((h) => h.userId !== userId);
  // Only add to hostsToRemove if the host exists on the server (not client-only)
  const hostsToRemove =
    wasClientOnly || current.hostsToRemove.includes(userId)
      ? current.hostsToRemove
      : [...current.hostsToRemove, userId];

  return { ...current, hostsToAdd, hostsToUpdate, hostsToRemove };
}

function computeHostsDelta(
  current: PendingHostChanges,
  serverHosts: Host[],
  newHosts: Host[]
): PendingHostChanges {
  const serverHostMap = new Map(serverHosts.map((h) => [h.userId, h]));
  const newHostMap = new Map(newHosts.map((h) => [h.userId, h]));

  // Hosts to add: in newHosts but not in serverHosts
  const hostsToAdd: Host[] = [];
  for (const host of newHosts) {
    if (!serverHostMap.has(host.userId)) {
      hostsToAdd.push(host);
    }
  }

  // Hosts to remove: in serverHosts but not in newHosts
  const hostsToRemove: number[] = [];
  for (const host of serverHosts) {
    if (!newHostMap.has(host.userId)) {
      hostsToRemove.push(host.userId);
    }
  }

  // Hosts to update: in both, but changed
  const hostsToUpdate: HostUpdate[] = [];
  for (const newHost of newHosts) {
    const serverHost = serverHostMap.get(newHost.userId);
    if (!serverHost) continue;

    const locationChanged =
      JSON.stringify(newHost.location ?? null) !== JSON.stringify(serverHost.location ?? null);
    const otherChanged =
      newHost.isFixed !== serverHost.isFixed ||
      newHost.priority !== serverHost.priority ||
      newHost.weight !== serverHost.weight ||
      newHost.scheduleId !== serverHost.scheduleId ||
      newHost.groupId !== serverHost.groupId;

    if (locationChanged || otherChanged) {
      const update: HostUpdate = { userId: newHost.userId };
      if (newHost.isFixed !== serverHost.isFixed) update.isFixed = newHost.isFixed;
      if (newHost.priority !== serverHost.priority) update.priority = newHost.priority;
      if (newHost.weight !== serverHost.weight) update.weight = newHost.weight;
      if (newHost.scheduleId !== serverHost.scheduleId) update.scheduleId = newHost.scheduleId;
      if (newHost.groupId !== serverHost.groupId) update.groupId = newHost.groupId;
      if (locationChanged) update.location = newHost.location ?? null;
      hostsToUpdate.push(update);
    }
  }

  return {
    hostsToAdd,
    hostsToUpdate,
    hostsToRemove,
    // Preserve clearAllHostLocations flag
    clearAllHostLocations: current.clearAllHostLocations,
  };
}

export const createHostsStore = () =>
  createStore<HostsStore>((set, get) => ({
    rrPendingChanges: { ...DEFAULT_PENDING },
    fixedPendingChanges: { ...DEFAULT_PENDING },
    serverRRHosts: [],
    serverFixedHosts: [],
    savedRRLocations: new Map(),
    savedFixedLocations: new Map(),

    setServerHosts: (rrHosts, fixedHosts) => set({ serverRRHosts: rrHosts, serverFixedHosts: fixedHosts }),

    // RR operations
    addRRHost: (host) => set({ rrPendingChanges: addHostToChanges(get().rrPendingChanges, host) }),
    updateRRHost: (update) =>
      set({ rrPendingChanges: updateHostInChanges(get().rrPendingChanges, update) }),
    removeRRHost: (userId) =>
      set({ rrPendingChanges: removeHostFromChanges(get().rrPendingChanges, userId) }),
    clearRRHostLocations: (formHosts) => {
      // Snapshot current form locations before clearing so restore can recover them
      const savedRRLocations = new Map<number, HostLocation | null>();
      for (const h of formHosts) {
        if (!h.isFixed) savedRRLocations.set(h.userId, h.location ?? null);
      }
      set({
        rrPendingChanges: { ...get().rrPendingChanges, clearAllHostLocations: true },
        savedRRLocations,
      });
    },
    restoreRRHostLocations: () => {
      const current = get().rrPendingChanges;
      if (current.clearAllHostLocations) {
        set({ rrPendingChanges: { ...current, clearAllHostLocations: false } });
      }
    },
    setRRHosts: (serverHosts, newHosts) =>
      set({ rrPendingChanges: computeHostsDelta(get().rrPendingChanges, serverHosts, newHosts) }),

    // Fixed operations
    addFixedHost: (host) =>
      set({ fixedPendingChanges: addHostToChanges(get().fixedPendingChanges, host) }),
    updateFixedHost: (update) =>
      set({ fixedPendingChanges: updateHostInChanges(get().fixedPendingChanges, update) }),
    removeFixedHost: (userId) =>
      set({ fixedPendingChanges: removeHostFromChanges(get().fixedPendingChanges, userId) }),
    clearFixedHostLocations: (formHosts) => {
      // Snapshot current form locations before clearing so restore can recover them
      const savedFixedLocations = new Map<number, HostLocation | null>();
      for (const h of formHosts) {
        if (h.isFixed) savedFixedLocations.set(h.userId, h.location ?? null);
      }
      set({
        fixedPendingChanges: { ...get().fixedPendingChanges, clearAllHostLocations: true },
        savedFixedLocations,
      });
    },
    restoreFixedHostLocations: () => {
      const current = get().fixedPendingChanges;
      if (current.clearAllHostLocations) {
        set({ fixedPendingChanges: { ...current, clearAllHostLocations: false } });
      }
    },
    setFixedHosts: (serverHosts, newHosts) =>
      set({
        fixedPendingChanges: computeHostsDelta(get().fixedPendingChanges, serverHosts, newHosts),
      }),

    // Reset both slices
    reset: () =>
      set({
        rrPendingChanges: { ...DEFAULT_PENDING },
        fixedPendingChanges: { ...DEFAULT_PENDING },
      }),
  }));
