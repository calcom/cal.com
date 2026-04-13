import type { CombinedFilterSegment, SegmentIdentifier } from "@calcom/features/data-table/lib/types";
import { createStore } from "zustand";

/**
 * Explicit lifecycle phases replace isInitializedRef + pendingSegmentRef:
 *
 * - `initializing`: Waiting for segments to be fetched from the server.
 * - `waitingForValidator`: A segment is selected but the filter validator
 *    hasn't loaded yet — filters are deferred.
 * - `ready`: Segment resolved, filters applied (or no segment selected).
 */
export type SegmentPhase = "initializing" | "waitingForValidator" | "ready";

export interface SegmentStoreState {
  phase: SegmentPhase;
  selectedSegment: CombinedFilterSegment | undefined;
  pendingSegment: { segmentId: SegmentIdentifier; segment: CombinedFilterSegment } | null;

  markReady: () => void;
  setSelected: (segment: CombinedFilterSegment | undefined) => void;
  setPending: (
    pending: { segmentId: SegmentIdentifier; segment: CombinedFilterSegment } | null,
    phase?: SegmentPhase
  ) => void;
  clearSelection: () => void;
}

export type SegmentStoreApi = ReturnType<typeof createSegmentStore>;

export function createSegmentStore(initialPhase: SegmentPhase = "initializing") {
  return createStore<SegmentStoreState>((set) => ({
    phase: initialPhase,
    selectedSegment: undefined,
    pendingSegment: null,

    markReady: () => set({ phase: "ready", pendingSegment: null }),
    setSelected: (segment) => set({ selectedSegment: segment }),
    setPending: (pending, phase) =>
      set(() => ({
        pendingSegment: pending,
        ...(phase ? { phase } : {}),
        ...(pending ? { selectedSegment: pending.segment } : {}),
      })),
    clearSelection: () => set({ phase: "ready", selectedSegment: undefined, pendingSegment: null }),
  }));
}
