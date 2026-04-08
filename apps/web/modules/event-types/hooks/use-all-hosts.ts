import { applyPendingHostChanges } from "@calcom/features/eventtypes/lib/apply-pending-host-changes";
import type { PendingHostChanges } from "@calcom/features/eventtypes/lib/types";
import { trpc } from "@calcom/trpc/react";
import { useMemo } from "react";

type UseAllHostsInput = {
  eventTypeId: number;
  fixedPendingChanges: PendingHostChanges;
  rrPendingChanges: PendingHostChanges;
};

/**
 * Fetches all hosts for an event type from the server via getAllHosts,
 * then merges pending changes (from Zustand/form delta) on top.
 *
 * Returns separate fixed/RR host arrays for both the merged view
 * and the raw server state (needed for delta computation).
 *
 * Known limitation: This reads from the server, not from `form.hosts`.
 * Hosts added via Assignment Tab (which writes directly to `form.hosts`)
 * won't appear here until after save + refetch. This means Setup Tab's UI
 * (host list, mass-apply, hasSavedHosts) won't show unsaved host additions
 * from other tabs. However, HostsFormSync preserves those unsaved changes
 * when writing back to `form.hosts`, so the save path is safe.
 * This will be resolved when all tabs migrate to the Zustand store.
 */
export function useAllHosts({ eventTypeId, fixedPendingChanges, rrPendingChanges }: UseAllHostsInput) {
  const { data, isLoading } = trpc.viewer.eventTypes.getAllHosts.useQuery(
    { eventTypeId },
    { enabled: eventTypeId > 0 }
  );

  const serverHosts = useMemo(() => data?.hosts ?? [], [data]);

  const fixedServerHosts = useMemo(() => serverHosts.filter((h) => h.isFixed), [serverHosts]);
  const rrServerHosts = useMemo(() => serverHosts.filter((h) => !h.isFixed), [serverHosts]);

  const fixedHosts = useMemo(
    () => applyPendingHostChanges(fixedServerHosts, fixedPendingChanges),
    [fixedServerHosts, fixedPendingChanges]
  );
  const rrHosts = useMemo(
    () => applyPendingHostChanges(rrServerHosts, rrPendingChanges),
    [rrServerHosts, rrPendingChanges]
  );

  return { fixedHosts, fixedServerHosts, rrHosts, rrServerHosts, isLoading };
}

// Re-export for backward compatibility (used by tests)
export { applyPendingHostChanges as applyPendingChanges } from "@calcom/features/eventtypes/lib/apply-pending-host-changes";
