"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useFormContext } from "react-hook-form";
import { useStore } from "zustand";
import type { StoreApi } from "zustand";

import { applyPendingHostChanges } from "../lib/apply-pending-host-changes";
import type { FormValues, Host, HostLocation, PendingHostChanges } from "../lib/types";
import { createHostsStore, type HostsStore } from "./hosts-store";

const HostsStoreContext = createContext<StoreApi<HostsStore> | null>(null);

/**
 * Restores only the `location` field onto form hosts from a saved location snapshot.
 * Preserves all other fields (priority, weight, scheduleId, etc.) from the
 * form hosts so that unsaved edits from other tabs are not discarded.
 *
 * Uses a saved snapshot (captured at clear-time) instead of server hosts because
 * the getAllHosts tRPC query does not include the location relation.
 */
function restoreLocationsOnly(
  formHosts: Host[],
  savedLocations: Map<number, HostLocation | null>
): Host[] {
  return formHosts.map((h) => {
    const savedLocation = savedLocations.get(h.userId);
    return savedLocation !== undefined ? { ...h, location: savedLocation } : h;
  });
}

/**
 * Syncs Zustand store state → react-hook-form `hosts[]` field.
 * This keeps the form's `hosts` array up-to-date so that:
 * 1. Other tabs (Assignment, Availability, Advanced) see host changes from Setup Tab
 * 2. The form's dirty state reflects host changes (submit button enables)
 * 3. Form submission sends the full `hosts[]` array to the backend (legacy path)
 *
 * The delta fields (`pendingHostChanges`, `pendingFixedHostChanges`) are also synced
 * for future backend use, but the backend currently uses `hosts[]` only.
 */
function HostsFormSync({ store }: { store: StoreApi<HostsStore> }) {
  const { setValue, getValues } = useFormContext<FormValues>();

  useEffect(() => {
    return store.subscribe((state, prevState) => {
      const rrChanged = state.rrPendingChanges !== prevState.rrPendingChanges;
      const fixedChanged = state.fixedPendingChanges !== prevState.fixedPendingChanges;

      if (rrChanged || fixedChanged) {
        const dirty = hasChanges(state.rrPendingChanges) || hasChanges(state.fixedPendingChanges);

        // Detect clearAllHostLocations transitioning from true → false (restore).
        // When this happens, the form hosts already have null locations from the
        // previous toggle-off. We must use server hosts as baseline to restore
        // the original locations, not the mutated form hosts.
        const rrRestored =
          prevState.rrPendingChanges.clearAllHostLocations && !state.rrPendingChanges.clearAllHostLocations;
        const fixedRestored =
          prevState.fixedPendingChanges.clearAllHostLocations &&
          !state.fixedPendingChanges.clearAllHostLocations;

        // Read the form's current hosts[] as baseline instead of serverHosts.
        // This preserves unsaved edits made by other tabs (Assignment, etc.)
        // that wrote directly to the form's hosts[] field.
        const currentFormHosts = getValues("hosts") ?? [];
        const formRR = currentFormHosts.filter((h) => !h.isFixed);
        const formFixed = currentFormHosts.filter((h) => h.isFixed);

        // On restore (clearAllHostLocations true→false), the form hosts have null
        // locations from the previous toggle-off. Restore only the location field
        // from server hosts while preserving all other fields (priority, weight, etc.)
        // so that unsaved edits from other tabs are not discarded.
        const currentRR = rrRestored ? restoreLocationsOnly(formRR, state.savedRRLocations) : formRR;
        const currentFixed = fixedRestored
          ? restoreLocationsOnly(formFixed, state.savedFixedLocations)
          : formFixed;

        const mergedRR = applyPendingHostChanges(currentRR, state.rrPendingChanges);
        const mergedFixed = applyPendingHostChanges(currentFixed, state.fixedPendingChanges);
        setValue("hosts", [...mergedFixed, ...mergedRR], { shouldDirty: dirty });
      }

      // Also sync delta fields for future backend use
      if (rrChanged) {
        setValue("pendingHostChanges", state.rrPendingChanges, {
          shouldDirty: hasChanges(state.rrPendingChanges),
        });
      }
      if (fixedChanged) {
        setValue("pendingFixedHostChanges", state.fixedPendingChanges, {
          shouldDirty: hasChanges(state.fixedPendingChanges),
        });
      }
    });
  }, [store, setValue, getValues]);

  return null;
}

function hasChanges(pending: PendingHostChanges): boolean {
  return (
    pending.hostsToAdd.length > 0 ||
    pending.hostsToUpdate.length > 0 ||
    pending.hostsToRemove.length > 0 ||
    !!pending.clearAllHosts ||
    !!pending.clearAllHostLocations
  );
}

export function HostsStoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<StoreApi<HostsStore>>();
  if (!storeRef.current) {
    storeRef.current = createHostsStore();
  }

  return (
    <HostsStoreContext.Provider value={storeRef.current}>
      <HostsFormSync store={storeRef.current} />
      {children}
    </HostsStoreContext.Provider>
  );
}

export function useHostsStore<T>(selector: (store: HostsStore) => T): T {
  const store = useContext(HostsStoreContext);
  if (!store) {
    throw new Error("useHostsStore must be used within HostsStoreProvider");
  }
  return useStore(store, selector);
}
