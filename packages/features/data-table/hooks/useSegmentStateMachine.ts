"use client";

import { useStateMachine } from "@calcom/lib/hooks/useStateMachine";
import { useCallback, useMemo } from "react";
import {
  getSegmentId,
  getSelectedSegment,
  initialState,
  isSegmentPending,
  type SegmentEffect,
  type SegmentMachineContext,
  type SegmentMachineState,
  segmentMachineConfig,
} from "../lib/segmentStateMachine";
import type { CombinedFilterSegment, SegmentIdentifier } from "../lib/types";

export type UseSegmentStateMachineOptions = {
  isSegmentsFetched: boolean;
  preferredSegmentId: SegmentIdentifier | null;
  isValidatorReady: boolean;
  segmentIdFromUrl: string | null;
  findSegment: (id: string) => CombinedFilterSegment | undefined;
  onApplyFilters: (segment: CombinedFilterSegment) => void;
  onSetUrlSegmentId: (id: string | null) => void;
  onSetPreference: (params: { tableIdentifier: string; segmentId: SegmentIdentifier | null }) => void;
  tableIdentifier: string;
};

export type UseSegmentStateMachineReturn = {
  state: SegmentMachineState;
  selectedSegment: CombinedFilterSegment | null;
  segmentId: SegmentIdentifier | null;
  isValidatorPending: boolean;
  selectSegment: (segmentId: SegmentIdentifier, segment: CombinedFilterSegment) => void;
  clearSegment: () => void;
  clearSystemSegmentIfExists: () => void;
};

/**
 * Hook that connects the segment state machine to React.
 * Uses the generic useStateMachine hook internally.
 */
export function useSegmentStateMachine(options: UseSegmentStateMachineOptions): UseSegmentStateMachineReturn {
  const {
    isSegmentsFetched,
    preferredSegmentId,
    isValidatorReady,
    segmentIdFromUrl,
    findSegment,
    onApplyFilters,
    onSetUrlSegmentId,
    onSetPreference,
    tableIdentifier,
  } = options;

  // Build context from props
  const context: SegmentMachineContext = useMemo(
    () => ({
      isMounted: true,
      segmentIdFromUrl,
      isSegmentsFetched,
      preferredSegmentId,
      findSegment,
      isValidatorReady,
    }),
    [segmentIdFromUrl, isSegmentsFetched, preferredSegmentId, findSegment, isValidatorReady]
  );

  // Effect executor
  const onEffect = useCallback(
    (effect: SegmentEffect) => {
      switch (effect.type) {
        case "APPLY_FILTERS":
          onSetUrlSegmentId(String(effect.segmentId.id));
          onSetPreference({ tableIdentifier, segmentId: effect.segmentId });
          onApplyFilters(effect.segment);
          break;
        case "CLEAR_URL_AND_PREFERENCE":
          onSetUrlSegmentId(null);
          onSetPreference({ tableIdentifier, segmentId: null });
          break;
        case "NONE":
          break;
      }
    },
    [onApplyFilters, onSetUrlSegmentId, onSetPreference, tableIdentifier]
  );

  // Use the generic state machine hook
  const { state, send } = useStateMachine({
    config: segmentMachineConfig,
    initialState,
    context,
    onEffect,
  });

  // Action creators
  const selectSegment = useCallback(
    (segmentId: SegmentIdentifier, segment: CombinedFilterSegment) => {
      if (state.status === "ready") {
        send({ type: "SELECT_SEGMENT", segmentId, segment });
      }
    },
    [state.status, send]
  );

  const clearSegment = useCallback(() => {
    if (state.status === "ready") {
      send({ type: "CLEAR_SEGMENT" });
    }
  }, [state.status, send]);

  const clearSystemSegmentIfExists = useCallback(() => {
    if (state.status === "ready") {
      send({ type: "CLEAR_SYSTEM_SEGMENT" });
    }
  }, [state.status, send]);

  // Derived values
  const selectedSegment = useMemo(() => getSelectedSegment(state), [state]);
  const segmentIdValue = useMemo(() => getSegmentId(state), [state]);
  const isValidatorPending = useMemo(
    () => isSegmentPending(state) && !isValidatorReady,
    [state, isValidatorReady]
  );

  return {
    state,
    selectedSegment,
    segmentId: segmentIdValue,
    isValidatorPending,
    selectSegment,
    clearSegment,
    clearSystemSegmentIfExists,
  };
}
