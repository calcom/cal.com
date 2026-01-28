import { useCallback, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import type { FormValues, Host, HostUpdate, PendingHostChanges } from "./types";

const DEFAULT_PENDING_CHANGES: PendingHostChanges = {
  hostsToAdd: [],
  hostsToUpdate: [],
  hostsToRemove: [],
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
  const { setValue, getValues, control } = useFormContext<FormValues>();

  // Use useWatch for better performance - only re-renders when this specific field changes
  const pendingChanges = useWatch({
    control,
    name: "pendingHostChanges",
    defaultValue: DEFAULT_PENDING_CHANGES,
  }) ?? DEFAULT_PENDING_CHANGES;

  // Add a new host
  const addHost = useCallback(
    (host: Host) => {
      const current = getValues("pendingHostChanges") ?? DEFAULT_PENDING_CHANGES;

      // If this host was previously removed, just remove from hostsToRemove
      if (current.hostsToRemove.includes(host.userId)) {
        setValue(
          "pendingHostChanges",
          {
            ...current,
            hostsToRemove: current.hostsToRemove.filter((id) => id !== host.userId),
          },
          { shouldDirty: true }
        );
        return;
      }

      // Otherwise add to hostsToAdd
      setValue(
        "pendingHostChanges",
        {
          ...current,
          hostsToAdd: [...current.hostsToAdd, host],
        },
        { shouldDirty: true }
      );
    },
    [getValues, setValue]
  );

  // Update an existing host
  const updateHost = useCallback(
    (userId: number, changes: Partial<Omit<Host, "userId">>) => {
      const current = getValues("pendingHostChanges") ?? DEFAULT_PENDING_CHANGES;

      // Check if this is a newly added host
      const addedIndex = current.hostsToAdd.findIndex((h) => h.userId === userId);
      if (addedIndex >= 0) {
        // Update the host in hostsToAdd directly
        const updated = [...current.hostsToAdd];
        updated[addedIndex] = { ...updated[addedIndex], ...changes };
        setValue(
          "pendingHostChanges",
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
        setValue(
          "pendingHostChanges",
          {
            ...current,
            hostsToUpdate: updated,
          },
          { shouldDirty: true }
        );
      } else {
        // Add new update
        setValue(
          "pendingHostChanges",
          {
            ...current,
            hostsToUpdate: [...current.hostsToUpdate, { userId, ...changes }],
          },
          { shouldDirty: true }
        );
      }
    },
    [getValues, setValue]
  );

  // Remove a host
  const removeHost = useCallback(
    (userId: number) => {
      const current = getValues("pendingHostChanges") ?? DEFAULT_PENDING_CHANGES;

      // Check if this is a newly added host - just remove from hostsToAdd
      const addedIndex = current.hostsToAdd.findIndex((h) => h.userId === userId);
      if (addedIndex >= 0) {
        setValue(
          "pendingHostChanges",
          {
            ...current,
            hostsToAdd: current.hostsToAdd.filter((h) => h.userId !== userId),
            hostsToUpdate: current.hostsToUpdate.filter((u) => u.userId !== userId),
          },
          { shouldDirty: true }
        );
        return;
      }

      // Otherwise add to hostsToRemove and clean up hostsToUpdate
      setValue(
        "pendingHostChanges",
        {
          ...current,
          hostsToRemove: [...current.hostsToRemove, userId],
          hostsToUpdate: current.hostsToUpdate.filter((u) => u.userId !== userId),
        },
        { shouldDirty: true }
      );
    },
    [getValues, setValue]
  );

  // Set all hosts (replaces current state) - used for bulk operations
  // Compares newHosts against serverHosts (from paginated query) instead of initialHosts
  const setHosts = useCallback(
    (serverHosts: Host[], newHosts: Host[]) => {
      const serverUserIds = new Set(serverHosts.map((h) => h.userId));
      const newUserIds = new Set(newHosts.map((h) => h.userId));

      // Hosts to remove: in server but not in new
      const hostsToRemove = serverHosts.filter((h) => !newUserIds.has(h.userId)).map((h) => h.userId);

      // Hosts to add: in new but not in server
      const hostsToAdd = newHosts.filter((h) => !serverUserIds.has(h.userId));

      // Hosts to update: in both, check for changes
      const hostsToUpdate: HostUpdate[] = [];
      for (const newHost of newHosts) {
        if (serverUserIds.has(newHost.userId)) {
          const serverHost = serverHosts.find((h) => h.userId === newHost.userId);
          if (serverHost) {
            // Check if anything changed
            const changes: HostUpdate = { userId: newHost.userId };
            let hasChanges = false;

            if (newHost.isFixed !== serverHost.isFixed) {
              changes.isFixed = newHost.isFixed;
              hasChanges = true;
            }
            if (newHost.priority !== serverHost.priority) {
              changes.priority = newHost.priority;
              hasChanges = true;
            }
            if (newHost.weight !== serverHost.weight) {
              changes.weight = newHost.weight;
              hasChanges = true;
            }
            if (newHost.scheduleId !== serverHost.scheduleId) {
              changes.scheduleId = newHost.scheduleId;
              hasChanges = true;
            }
            if (newHost.groupId !== serverHost.groupId) {
              changes.groupId = newHost.groupId;
              hasChanges = true;
            }

            if (hasChanges) {
              hostsToUpdate.push(changes);
            }
          }
        }
      }

      setValue(
        "pendingHostChanges",
        {
          hostsToAdd,
          hostsToUpdate,
          hostsToRemove,
        },
        { shouldDirty: hostsToAdd.length > 0 || hostsToUpdate.length > 0 || hostsToRemove.length > 0 }
      );
    },
    [setValue]
  );

  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(
    () => ({
      addHost,
      updateHost,
      removeHost,
      setHosts,
      pendingChanges,
    }),
    [addHost, updateHost, removeHost, setHosts, pendingChanges]
  );
}
