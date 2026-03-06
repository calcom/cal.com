import { useCallback, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { FormValues, Host, HostLocation, HostUpdate, PendingHostChanges } from "./types";

/**
 * Compare two HostLocation objects for equality.
 * Returns true if they are equal, false otherwise.
 */
function areLocationsEqual(a: HostLocation | null | undefined, b: HostLocation | null | undefined): boolean {
  // Both null/undefined - equal
  if (!a && !b) return true;
  // One is null/undefined, other is not - not equal
  if (!a || !b) return false;
  // Compare relevant fields (not id, userId, eventTypeId as those are identifiers)
  return (
    a.type === b.type &&
    a.credentialId === b.credentialId &&
    a.link === b.link &&
    a.address === b.address &&
    a.phoneNumber === b.phoneNumber
  );
}

const DEFAULT_PENDING_CHANGES: PendingHostChanges = {
  hostsToAdd: [],
  hostsToUpdate: [],
  hostsToRemove: [],
  clearAllHosts: false,
};

/**
 * Hook for efficiently managing hosts in the event type form.
 *
 * Instead of storing 700+ hosts in react-hook-form state (which causes
 * performance issues), this hook:
 * 1. Tracks only the delta (changes) in form state
 * 2. Consumers get effective hosts from their own paginated queries
 *
 * This dramatically improves performance for event types with many hosts.
 */
export function useHostsForEventType() {
  const { setValue: rawSetValue, getValues, control } = useFormContext<FormValues>();

  // Type-safe wrapper for setValue with optional fields
  // react-hook-form resolves the value type to `never` for optional fields
  const setPendingChanges = useCallback(
    (value: PendingHostChanges, options?: { shouldDirty?: boolean }) => {
      (rawSetValue as (name: string, value: unknown, options?: { shouldDirty?: boolean }) => void)(
        "pendingHostChanges",
        value,
        options
      );
    },
    [rawSetValue]
  );

  // Use useWatch for better performance - only re-renders when this specific field changes
  const pendingChanges =
    useWatch({
      control,
      name: "pendingHostChanges",
      defaultValue: DEFAULT_PENDING_CHANGES,
    }) ?? DEFAULT_PENDING_CHANGES;

  // Add a new host
  const addHost = useCallback(
    (host: Host) => {
      const current: PendingHostChanges = getValues("pendingHostChanges") ?? DEFAULT_PENDING_CHANGES;

      // If this host was previously removed, just remove from hostsToRemove
      if (current.hostsToRemove.includes(host.userId)) {
        setPendingChanges(
          {
            ...current,
            hostsToRemove: current.hostsToRemove.filter((id) => id !== host.userId),
          },
          { shouldDirty: true }
        );
        return;
      }

      // Guard against duplicate adds (e.g. double-click, re-render)
      if (current.hostsToAdd.some((h) => h.userId === host.userId)) {
        return;
      }

      setPendingChanges(
        {
          ...current,
          hostsToAdd: [...current.hostsToAdd, host],
        },
        { shouldDirty: true }
      );
    },
    [getValues, setPendingChanges]
  );

  // Update an existing host
  const updateHost = useCallback(
    (userId: number, changes: Partial<Omit<Host, "userId">>) => {
      const current: PendingHostChanges = getValues("pendingHostChanges") ?? DEFAULT_PENDING_CHANGES;

      // Check if this is a newly added host
      const addedIndex = current.hostsToAdd.findIndex((h) => h.userId === userId);
      if (addedIndex >= 0) {
        // Update the host in hostsToAdd directly
        const updated = [...current.hostsToAdd];
        updated[addedIndex] = { ...updated[addedIndex], ...changes };
        setPendingChanges(
          {
            ...current,
            hostsToAdd: updated,
          },
          { shouldDirty: true }
        );
        return;
      }

      // Otherwise add/update in hostsToUpdate
      const existingUpdateIndex = current.hostsToUpdate.findIndex((u) => u.userId === userId);
      if (existingUpdateIndex >= 0) {
        // Merge with existing update
        const updated = [...current.hostsToUpdate];
        updated[existingUpdateIndex] = { ...updated[existingUpdateIndex], ...changes };
        setPendingChanges(
          {
            ...current,
            hostsToUpdate: updated,
          },
          { shouldDirty: true }
        );
      } else {
        // Add new update
        setPendingChanges(
          {
            ...current,
            hostsToUpdate: [...current.hostsToUpdate, { userId, ...changes }],
          },
          { shouldDirty: true }
        );
      }
    },
    [getValues, setPendingChanges]
  );

  // Remove a host
  const removeHost = useCallback(
    (userId: number) => {
      const current: PendingHostChanges = getValues("pendingHostChanges") ?? DEFAULT_PENDING_CHANGES;

      // Check if this is a newly added host - just remove from hostsToAdd
      const addedIndex = current.hostsToAdd.findIndex((h) => h.userId === userId);
      if (addedIndex >= 0) {
        setPendingChanges(
          {
            ...current,
            hostsToAdd: current.hostsToAdd.filter((h) => h.userId !== userId),
            hostsToUpdate: current.hostsToUpdate.filter((u) => u.userId !== userId),
          },
          { shouldDirty: true }
        );
        return;
      }

      // Guard against duplicate removals (e.g. double-click)
      if (current.hostsToRemove.includes(userId)) {
        return;
      }

      // Otherwise add to hostsToRemove and clean up hostsToUpdate
      setPendingChanges(
        {
          ...current,
          hostsToRemove: [...current.hostsToRemove, userId],
          hostsToUpdate: current.hostsToUpdate.filter((u) => u.userId !== userId),
        },
        { shouldDirty: true }
      );
    },
    [getValues, setPendingChanges]
  );

  // Clear all hosts and optionally set new hosts
  // When called, sets clearAllHosts flag so backend computes delta
  const clearAllHosts = useCallback(
    (newHosts: Host[] = []) => {
      const current: PendingHostChanges = getValues("pendingHostChanges") ?? DEFAULT_PENDING_CHANGES;
      setPendingChanges(
        {
          hostsToAdd: newHosts,
          hostsToUpdate: [],
          hostsToRemove: [],
          clearAllHosts: true,
          clearAllHostLocations: current.clearAllHostLocations,
        },
        { shouldDirty: true }
      );
    },
    [getValues, setPendingChanges]
  );

  // Set the clearAllHostLocations flag so the backend bulk-deletes all HostLocation rows on save
  const clearAllHostLocations = useCallback(() => {
    const current: PendingHostChanges = getValues("pendingHostChanges") ?? DEFAULT_PENDING_CHANGES;
    setPendingChanges(
      {
        ...current,
        clearAllHostLocations: true,
      },
      { shouldDirty: true }
    );
  }, [getValues, setPendingChanges]);

  // Set all hosts (replaces current state) - used for bulk operations
  // Compares newHosts against serverHosts (from paginated query) instead of initialHosts
  const setHosts = useCallback(
    (serverHosts: Host[], newHosts: Host[]) => {
      const serverHostMap = new Map(serverHosts.map((h) => [h.userId, h]));
      const newUserIds = new Set(newHosts.map((h) => h.userId));

      // Hosts to remove: in server but not in new
      const hostsToRemove = serverHosts.filter((h) => !newUserIds.has(h.userId)).map((h) => h.userId);

      // Hosts to add: in new but not in server
      const hostsToAdd = newHosts.filter((h) => !serverHostMap.has(h.userId));

      // Hosts to update: in both, check for changes
      const COMPARABLE_FIELDS = ["isFixed", "priority", "weight", "scheduleId", "groupId"] as const;
      const hostsToUpdate: HostUpdate[] = [];
      for (const newHost of newHosts) {
        const serverHost = serverHostMap.get(newHost.userId);
        if (serverHost) {
          const changes: HostUpdate = { userId: newHost.userId };
          let hasChanges = false;

          for (const field of COMPARABLE_FIELDS) {
            if (newHost[field] !== serverHost[field]) {
              (changes[field] as (typeof newHost)[typeof field]) = newHost[field];
              hasChanges = true;
            }
          }
          if (!areLocationsEqual(newHost.location, serverHost.location)) {
            changes.location = newHost.location;
            hasChanges = true;
          }

          if (hasChanges) {
            hostsToUpdate.push(changes);
          }
        }
      }

      const current: PendingHostChanges = getValues("pendingHostChanges") ?? DEFAULT_PENDING_CHANGES;
      setPendingChanges(
        {
          hostsToAdd,
          hostsToUpdate,
          hostsToRemove,
          clearAllHostLocations: current.clearAllHostLocations,
        },
        { shouldDirty: hostsToAdd.length > 0 || hostsToUpdate.length > 0 || hostsToRemove.length > 0 }
      );
    },
    [getValues, setPendingChanges]
  );

  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(
    () => ({
      addHost,
      updateHost,
      removeHost,
      clearAllHosts,
      clearAllHostLocations,
      setHosts,
      pendingChanges,
    }),
    [addHost, updateHost, removeHost, clearAllHosts, clearAllHostLocations, setHosts, pendingChanges]
  );
}
