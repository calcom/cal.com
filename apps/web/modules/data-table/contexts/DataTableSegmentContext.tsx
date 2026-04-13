"use client";

import type {
  CombinedFilterSegment,
  FilterSegmentOutput,
  SegmentIdentifier,
  SystemFilterSegment,
  UseSegments,
} from "@calcom/features/data-table/lib/types";
import type React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import { useSegmentsNoop } from "../hooks/useSegmentsNoop";
import { useDataTableState } from "./DataTableStateContext";
import { findSegmentById, toSegmentIdObject } from "./segment-helpers";
import { createSegmentStore, type SegmentStoreApi } from "./segment-store";

// ─── Public context type (unchanged) ────────────────────────────────────────

export type DataTableSegmentContextType = {
  segments: CombinedFilterSegment[];
  selectedSegment: CombinedFilterSegment | undefined;
  segmentId: SegmentIdentifier | null;
  setSegmentId: (id: SegmentIdentifier | null, providedSegment?: CombinedFilterSegment) => void;
  isSegmentEnabled: boolean;
  canSaveSegment: boolean;
  isValidatorPending: boolean;
  clearSystemSegmentSelectionIfExists: () => void;
};

export const DataTableSegmentContext = createContext<DataTableSegmentContextType | null>(null);

export function useDataTableSegment() {
  const context = useContext(DataTableSegmentContext);
  if (!context) {
    throw new Error("useDataTableSegment must be used within a DataTableSegmentProvider");
  }
  return context;
}

// ─── Provider ───────────────────────────────────────────────────────────────

interface DataTableSegmentProviderProps {
  children: React.ReactNode;
  useSegments?: UseSegments;
  segments?: FilterSegmentOutput[];
  systemSegments?: SystemFilterSegment[];
}

export function DataTableSegmentProvider({
  children,
  useSegments = useSegmentsNoop,
  segments: providedSegments,
  systemSegments,
}: DataTableSegmentProviderProps) {
  const {
    tableIdentifier,
    activeFilters,
    setActiveFilters,
    sorting,
    setSorting,
    columnVisibility,
    setColumnVisibility,
    columnSizing,
    setColumnSizing,
    pageSize,
    setPageSize,
    searchTerm,
    setSearchTerm,
    setPageIndex,
    segmentIdRaw,
    setSegmentIdRaw,
    defaultPageSize,
    validateActiveFilters,
  } = useDataTableState();

  const {
    segments,
    preferredSegmentId: fetchedPreferredSegmentId,
    setPreference: setSegmentPreference,
    isSegmentEnabled,
    isSuccess: isSegmentFetchedSuccessfully,
  } = useSegments({
    tableIdentifier,
    providedSegments,
    systemSegments,
  });

  const isNoop = useSegments === useSegmentsNoop;
  const [store] = useState<SegmentStoreApi>(() => createSegmentStore(isNoop ? "ready" : "initializing"));

  const phase = useStore(store, (s) => s.phase);
  const selectedSegment = useStore(store, (s) => s.selectedSegment);

  const isValidatorLoading = validateActiveFilters === "loading";

  const applySegmentFilters = useCallback(
    (segment: CombinedFilterSegment) => {
      const filtersToApply =
        typeof validateActiveFilters === "function"
          ? validateActiveFilters(segment.activeFilters)
          : segment.activeFilters;
      setActiveFilters(filtersToApply);
      if (segment.sorting) {
        setSorting(segment.sorting);
      }
      if (segment.columnVisibility) {
        setColumnVisibility(segment.columnVisibility);
      }
      if (segment.columnSizing) {
        setColumnSizing(segment.columnSizing);
      }
      if (segment.perPage !== undefined) {
        setPageSize(segment.perPage);
      }
      if (segment.searchTerm !== undefined) {
        setSearchTerm(segment.searchTerm);
      }
      setPageIndex(0);
    },
    [
      validateActiveFilters,
      setActiveFilters,
      setSorting,
      setColumnVisibility,
      setColumnSizing,
      setPageSize,
      setSearchTerm,
      setPageIndex,
    ]
  );

  /**
   * Resolve and apply a segment, or defer if the validator is still loading.
   */
  const resolveAndApply = useCallback(
    (segmentId: SegmentIdentifier, segment: CombinedFilterSegment) => {
      setSegmentIdRaw(String(segmentId.id));

      if (isValidatorLoading) {
        store.getState().setPending({ segmentId, segment }, "waitingForValidator");
      } else {
        applySegmentFilters(segment);
        store.getState().setSelected(segment);
        store.getState().markReady();
      }
    },
    [isValidatorLoading, setSegmentIdRaw, applySegmentFilters, store]
  );

  // ── Effect 1: Segment fetch completed → initialize ──────────────────────
  useEffect(() => {
    if (!isSegmentFetchedSuccessfully) return;
    if (store.getState().phase !== "initializing") return;

    const idToResolve =
      segmentIdRaw || (fetchedPreferredSegmentId ? String(fetchedPreferredSegmentId.id) : null);

    if (!idToResolve) {
      store.getState().markReady();
      return;
    }

    const segment = findSegmentById(segments, idToResolve);
    const segmentId = toSegmentIdObject(idToResolve);

    if (!segment || !segmentId) {
      store.getState().markReady();
      return;
    }

    resolveAndApply(segmentId, segment);
  }, [
    isSegmentFetchedSuccessfully,
    segments,
    fetchedPreferredSegmentId,
    segmentIdRaw,
    resolveAndApply,
    store,
  ]);

  // ── Effect 2: Validator becomes ready → flush pending segment ───────────
  useEffect(() => {
    if (isValidatorLoading) return;
    const { phase, pendingSegment } = store.getState();
    if (phase !== "waitingForValidator" || !pendingSegment) return;

    applySegmentFilters(pendingSegment.segment);
    store.getState().markReady();
  }, [isValidatorLoading, applySegmentFilters, store]);

  // ── Effect 3: Navigation-back detection ─────────────────────────────────
  // When Next.js reuses the component instance across navigations, the URL
  // is cleared (segmentIdRaw → "") but selectedSegment is preserved in the
  // Zustand store. If there's a preferred segment, re-apply it.
  //
  // We track the previous segmentIdRaw to distinguish "navigation back"
  // (truthy → falsy) from "initial mount" (starts falsy). Without this,
  // Effect 3 fires redundantly after Effect 1 on initial mount because
  // setSegmentIdRaw queues an async state update while the Zustand store
  // is updated synchronously.
  const prevSegmentIdRawRef = useRef(segmentIdRaw);

  useEffect(() => {
    if (!isSegmentFetchedSuccessfully) return;
    if (store.getState().phase !== "ready") return;
    if (segmentIdRaw) return;
    if (!prevSegmentIdRawRef.current) return;
    if (!fetchedPreferredSegmentId) return;
    if (store.getState().selectedSegment === undefined) return;

    const segment = findSegmentById(segments, String(fetchedPreferredSegmentId.id));
    if (!segment) return;

    resolveAndApply(fetchedPreferredSegmentId, segment);
  }, [
    isSegmentFetchedSuccessfully,
    segmentIdRaw,
    fetchedPreferredSegmentId,
    segments,
    resolveAndApply,
    store,
  ]);

  // Must be declared AFTER Effect 3 so it reads the previous value, not current
  useEffect(() => {
    prevSegmentIdRawRef.current = segmentIdRaw;
  });

  // ── Public API ──────────────────────────────────────────────

  const setSegmentId = useCallback(
    (segmentId: SegmentIdentifier | null, providedSegment?: CombinedFilterSegment) => {
      if (!segmentId) {
        setSegmentIdRaw(null);
        setSegmentPreference({ tableIdentifier, segmentId: null });
        store.getState().clearSelection();
        return;
      }

      const segment = providedSegment || findSegmentById(segments, String(segmentId.id));
      if (!segment) {
        setSegmentIdRaw(null);
        setSegmentPreference({ tableIdentifier, segmentId: null });
        store.getState().clearSelection();
        return;
      }

      setSegmentPreference({ tableIdentifier, segmentId });
      resolveAndApply(segmentId, segment);
    },
    [segments, resolveAndApply, setSegmentIdRaw, setSegmentPreference, tableIdentifier, store]
  );

  const clearSystemSegmentSelectionIfExists = useCallback(() => {
    if (selectedSegment?.type === "system") {
      setSegmentId(null);
    }
  }, [selectedSegment, setSegmentId]);

  const segmentIdObject = useMemo(() => toSegmentIdObject(segmentIdRaw), [segmentIdRaw]);

  const hasStateChanged = useMemo(() => {
    if (!selectedSegment) return false;

    const isEqual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

    return (
      !isEqual(activeFilters, selectedSegment.activeFilters) ||
      !isEqual(sorting, selectedSegment.sorting) ||
      !isEqual(columnVisibility, selectedSegment.columnVisibility) ||
      !isEqual(columnSizing, selectedSegment.columnSizing) ||
      !isEqual(pageSize, selectedSegment.perPage) ||
      !isEqual(searchTerm || "", selectedSegment.searchTerm || "")
    );
  }, [selectedSegment, activeFilters, sorting, columnVisibility, columnSizing, pageSize, searchTerm]);

  const canSaveSegment = useMemo(() => {
    if (selectedSegment) {
      return hasStateChanged;
    }
    return (
      activeFilters.length > 0 ||
      sorting.length > 0 ||
      Object.keys(columnVisibility).length > 0 ||
      Object.keys(columnSizing).length > 0 ||
      pageSize !== defaultPageSize ||
      (searchTerm?.length ?? 0) > 0
    );
  }, [
    selectedSegment,
    activeFilters,
    sorting,
    columnVisibility,
    columnSizing,
    pageSize,
    searchTerm,
    defaultPageSize,
    hasStateChanged,
  ]);

  const isValidatorPending = phase !== "ready";

  const value = useMemo(
    () => ({
      segments,
      selectedSegment,
      segmentId: segmentIdObject,
      setSegmentId,
      isSegmentEnabled,
      canSaveSegment,
      isValidatorPending,
      clearSystemSegmentSelectionIfExists,
    }),
    [
      segments,
      selectedSegment,
      segmentIdObject,
      setSegmentId,
      isSegmentEnabled,
      canSaveSegment,
      isValidatorPending,
      clearSystemSegmentSelectionIfExists,
    ]
  );

  return <DataTableSegmentContext.Provider value={value}>{children}</DataTableSegmentContext.Provider>;
}
