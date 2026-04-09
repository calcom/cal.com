import type {
  ActiveFilters,
  CombinedFilterSegment,
  SegmentIdentifier,
} from "@calcom/features/data-table/lib/types";
import { ColumnFilterType } from "@calcom/features/data-table/lib/types";
import { act, renderHook } from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock state ─────────────────────────────────────────────────────────────

const mockSetSegmentIdRaw = vi.fn();
const mockSetActiveFilters = vi.fn();
const mockSetSorting = vi.fn();
const mockSetColumnVisibility = vi.fn();
const mockSetColumnSizing = vi.fn();
const mockSetPageSize = vi.fn();
const mockSetSearchTerm = vi.fn();
const mockSetPageIndex = vi.fn();
const mockSetPreference = vi.fn();

const mockState = {
  segmentIdRaw: "" as string,
  validateActiveFilters: undefined as ((filters: ActiveFilters) => ActiveFilters) | "loading" | undefined,
  segments: [] as CombinedFilterSegment[],
  preferredSegmentId: null as SegmentIdentifier | null,
  isSegmentFetchedSuccessfully: false,
};

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("../DataTableStateContext", () => ({
  useDataTableState: () => ({
    tableIdentifier: "/bookings/upcoming",
    activeFilters: [],
    setActiveFilters: mockSetActiveFilters,
    sorting: [],
    setSorting: mockSetSorting,
    columnVisibility: {},
    setColumnVisibility: mockSetColumnVisibility,
    columnSizing: {},
    setColumnSizing: mockSetColumnSizing,
    pageSize: 10,
    setPageSize: mockSetPageSize,
    searchTerm: "",
    setSearchTerm: mockSetSearchTerm,
    setPageIndex: mockSetPageIndex,
    get segmentIdRaw() {
      return mockState.segmentIdRaw;
    },
    setSegmentIdRaw: (...args: unknown[]) => {
      mockSetSegmentIdRaw(...args);
      mockState.segmentIdRaw = (args[0] as string) ?? "";
    },
    defaultPageSize: 10,
    get validateActiveFilters() {
      return mockState.validateActiveFilters;
    },
  }),
}));

vi.mock("../../hooks/useSegmentsNoop", () => ({
  useSegmentsNoop: () => ({
    segments: [],
    preferredSegmentId: null,
    isSuccess: false,
    setPreference: vi.fn(),
    isSegmentEnabled: false,
  }),
}));

// ─── Import under test (after mocks) ───────────────────────────────────────

import { DataTableSegmentProvider, useDataTableSegment } from "../DataTableSegmentContext";

// ─── Test data ──────────────────────────────────────────────────────────────

const testSegment: CombinedFilterSegment = {
  id: 42,
  name: "Member = Keith",
  type: "user",
  tableIdentifier: "/bookings/upcoming",
  scope: "USER" as const,
  activeFilters: [
    {
      f: "userId",
      v: { type: ColumnFilterType.MULTI_SELECT, data: [101] },
    },
  ],
  sorting: [],
  columnVisibility: {},
  columnSizing: {},
  perPage: 10,
  searchTerm: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 1,
  teamId: null,
  team: null,
};

const testPreferredSegmentId: SegmentIdentifier = { id: 42, type: "user" };

// ─── Helper ─────────────────────────────────────────────────────────────────

function mockUseSegments() {
  return {
    segments: mockState.segments,
    preferredSegmentId: mockState.preferredSegmentId,
    isSuccess: mockState.isSegmentFetchedSuccessfully,
    setPreference: (...args: unknown[]) => {
      mockSetPreference(...args);
      const input = args[0] as { segmentId: SegmentIdentifier | null };
      mockState.preferredSegmentId = input.segmentId;
    },
    isSegmentEnabled: true,
  };
}

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <DataTableSegmentProvider useSegments={mockUseSegments as never}>{children}</DataTableSegmentProvider>
    );
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("DataTableSegmentContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.segmentIdRaw = "";
    mockState.validateActiveFilters = undefined;
    mockState.segments = [];
    mockState.preferredSegmentId = null;
    mockState.isSegmentFetchedSuccessfully = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial mount — preferred segment application", () => {
    it("applies preferred segment when segments are fetched and no segment in URL", () => {
      mockState.isSegmentFetchedSuccessfully = true;
      mockState.segments = [testSegment];
      mockState.preferredSegmentId = testPreferredSegmentId;

      const Wrapper = createWrapper();
      const { result } = renderHook(() => useDataTableSegment(), { wrapper: Wrapper });

      expect(mockSetSegmentIdRaw).toHaveBeenCalledWith("42");
      expect(mockSetSegmentIdRaw).toHaveBeenCalledTimes(1);
      expect(mockSetActiveFilters).toHaveBeenCalledTimes(1);
      expect(result.current.selectedSegment).toBeDefined();
    });

    it("applies segment from URL when segmentIdRaw is present", () => {
      mockState.segmentIdRaw = "42";
      mockState.isSegmentFetchedSuccessfully = true;
      mockState.segments = [testSegment];
      mockState.preferredSegmentId = testPreferredSegmentId;

      const Wrapper = createWrapper();
      renderHook(() => useDataTableSegment(), { wrapper: Wrapper });

      expect(mockSetActiveFilters).toHaveBeenCalled();
    });

    it("does not call setPreference when loading the already-saved preferred segment", () => {
      mockState.isSegmentFetchedSuccessfully = true;
      mockState.segments = [testSegment];
      mockState.preferredSegmentId = testPreferredSegmentId;

      const Wrapper = createWrapper();
      renderHook(() => useDataTableSegment(), { wrapper: Wrapper });

      // Filters should be applied
      expect(mockSetActiveFilters).toHaveBeenCalled();
      // But setPreference should NOT be called — the preference is already saved
      expect(mockSetPreference).not.toHaveBeenCalled();
    });

    it("does not apply segment when segments are not yet fetched", () => {
      mockState.isSegmentFetchedSuccessfully = false;
      mockState.segments = [];
      mockState.preferredSegmentId = testPreferredSegmentId;

      const Wrapper = createWrapper();
      renderHook(() => useDataTableSegment(), { wrapper: Wrapper });

      expect(mockSetSegmentIdRaw).not.toHaveBeenCalled();
      expect(mockSetActiveFilters).not.toHaveBeenCalled();
    });
  });

  describe("navigation back — segment re-application", () => {
    it("re-applies preferred segment when URL is cleared but component state is preserved", () => {
      // STEP 1: Initial mount — segment gets applied
      mockState.isSegmentFetchedSuccessfully = true;
      mockState.segments = [testSegment];
      mockState.preferredSegmentId = testPreferredSegmentId;

      const Wrapper = createWrapper();
      const { result, rerender } = renderHook(() => useDataTableSegment(), { wrapper: Wrapper });

      expect(mockSetSegmentIdRaw).toHaveBeenCalledWith("42");
      expect(result.current.selectedSegment).toBeDefined();
      vi.clearAllMocks();

      // STEP 2: Simulate "navigate away and back" scenario.
      // In Next.js soft navigation with Router Cache, the component instance
      // may be preserved (selectedSegment stays set) but the URL is cleared
      // (segmentIdRaw becomes "" because the sidebar link has no query params).
      mockState.segmentIdRaw = "";
      rerender();

      // The preferred segment MUST be re-applied
      expect(mockSetSegmentIdRaw).toHaveBeenCalledWith("42");
    });

    it("does NOT re-apply segment when user intentionally deselects", () => {
      // STEP 1: Initial mount — segment gets applied
      mockState.isSegmentFetchedSuccessfully = true;
      mockState.segments = [testSegment];
      mockState.preferredSegmentId = testPreferredSegmentId;

      const Wrapper = createWrapper();
      const { result } = renderHook(() => useDataTableSegment(), { wrapper: Wrapper });

      expect(mockSetSegmentIdRaw).toHaveBeenCalledWith("42");
      vi.clearAllMocks();

      // STEP 2: User intentionally deselects
      act(() => {
        result.current.setSegmentId(null);
      });

      // setSegmentIdRaw(null) should be called for the deselection
      expect(mockSetSegmentIdRaw).toHaveBeenCalledWith(null);

      // But the preferred segment should NOT be re-applied
      const reapplyCalls = mockSetSegmentIdRaw.mock.calls.filter((call: unknown[]) => call[0] === "42");
      expect(reapplyCalls).toHaveLength(0);
    });

    it("does NOT re-apply segment after deselection + navigation back", () => {
      // Regression test: after deselecting a segment, navigating away and back
      // should NOT re-apply the old segment. The preference must be cleared
      // (optimistic cache update in production, mock simulates this).
      mockState.isSegmentFetchedSuccessfully = true;
      mockState.segments = [testSegment];
      mockState.preferredSegmentId = testPreferredSegmentId;

      const Wrapper = createWrapper();
      const { result, rerender } = renderHook(() => useDataTableSegment(), { wrapper: Wrapper });

      // STEP 1: Segment applied on mount
      expect(mockSetSegmentIdRaw).toHaveBeenCalledWith("42");
      expect(result.current.selectedSegment).toBeDefined();
      vi.clearAllMocks();

      // STEP 2: User deselects
      act(() => {
        result.current.setSegmentId(null);
      });

      expect(mockSetSegmentIdRaw).toHaveBeenCalledWith(null);
      expect(result.current.selectedSegment).toBeUndefined();
      // Preference should now be null (optimistic update)
      expect(mockState.preferredSegmentId).toBeNull();
      vi.clearAllMocks();

      // STEP 3: Navigate away and back (URL cleared, component reused)
      mockState.segmentIdRaw = "";
      rerender();

      // The old segment must NOT be re-applied
      const reapplyCalls = mockSetSegmentIdRaw.mock.calls.filter((call: unknown[]) => call[0] === "42");
      expect(reapplyCalls).toHaveLength(0);
      expect(result.current.selectedSegment).toBeUndefined();
    });

    it("does NOT interfere when user creates a segment on a page with no preferred segment", () => {
      // Simulates org members page: no preferred segment, no segment in URL.
      // After initial mount the user creates and selects a segment via the UI.
      // The initialization effect must not treat this as "first load with URL params".
      mockState.isSegmentFetchedSuccessfully = true;
      mockState.segments = [];
      mockState.preferredSegmentId = null;

      const Wrapper = createWrapper();
      const { result, rerender } = renderHook(() => useDataTableSegment(), { wrapper: Wrapper });

      // No segment applied on mount (no preference, no URL)
      expect(mockSetSegmentIdRaw).not.toHaveBeenCalled();
      expect(result.current.selectedSegment).toBeUndefined();
      vi.clearAllMocks();

      // User creates a segment via UI → setSegmentId is called externally,
      // then segmentIdRaw changes because the segment is now selected.
      act(() => {
        result.current.setSegmentId({ id: 42, type: "user" }, testSegment);
      });

      expect(mockSetSegmentIdRaw).toHaveBeenCalledWith("42");
      expect(result.current.selectedSegment).toBeDefined();
      vi.clearAllMocks();

      // Simulate query refetch after segment creation (segments array changes)
      mockState.segments = [testSegment];
      rerender();

      // The selected segment must NOT be cleared by the initialization effect
      expect(result.current.selectedSegment).toBeDefined();
      // setSegmentIdRaw should not have been called again
      expect(mockSetSegmentIdRaw).not.toHaveBeenCalled();
    });
  });

  describe("isValidatorPending — query gating", () => {
    it("is true while segments are still being fetched (prevents premature data queries)", () => {
      mockState.isSegmentFetchedSuccessfully = false;
      mockState.segments = [];
      mockState.preferredSegmentId = null;

      const Wrapper = createWrapper();
      const { result, rerender } = renderHook(() => useDataTableSegment(), { wrapper: Wrapper });

      // During initialization, isValidatorPending must be true so that
      // downstream data queries (e.g. bookings) don't fire with default params
      expect(result.current.isValidatorPending).toBe(true);

      // Segments finish loading (no preferred segment)
      mockState.isSegmentFetchedSuccessfully = true;
      rerender();

      // Now ready — queries can proceed
      expect(result.current.isValidatorPending).toBe(false);
    });

    it("is true until preferred segment filters are fully applied", () => {
      // Segments loaded but preferred segment exists — must stay pending
      // until filters are applied to avoid a double-fetch
      mockState.isSegmentFetchedSuccessfully = true;
      mockState.segments = [testSegment];
      mockState.preferredSegmentId = testPreferredSegmentId;

      const Wrapper = createWrapper();
      const { result } = renderHook(() => useDataTableSegment(), { wrapper: Wrapper });

      // After mount with immediate segment resolution, should be ready
      expect(result.current.isValidatorPending).toBe(false);
      expect(mockSetActiveFilters).toHaveBeenCalled();
    });

    it("defers segment application when validator is loading and applies when ready", () => {
      mockState.isSegmentFetchedSuccessfully = true;
      mockState.segments = [testSegment];
      mockState.preferredSegmentId = testPreferredSegmentId;
      mockState.validateActiveFilters = "loading";

      const Wrapper = createWrapper();
      const { result, rerender } = renderHook(() => useDataTableSegment(), { wrapper: Wrapper });

      // Segment ID should be set in URL even while validator is loading
      expect(mockSetSegmentIdRaw).toHaveBeenCalledWith("42");
      // But filters should NOT be applied yet (validator is pending)
      expect(mockSetActiveFilters).not.toHaveBeenCalled();
      expect(result.current.isValidatorPending).toBe(true);

      // Validator becomes ready
      mockState.validateActiveFilters = (filters: ActiveFilters) => filters;
      rerender();

      // Now the filters should be applied
      expect(mockSetActiveFilters).toHaveBeenCalled();
      expect(result.current.isValidatorPending).toBe(false);
    });
  });
});
