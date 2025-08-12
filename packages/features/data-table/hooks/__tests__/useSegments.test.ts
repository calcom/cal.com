/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import type { SystemFilterSegment, SegmentIdentifier } from "../../lib/types";
import { ColumnFilterType } from "../../lib/types";
import { useSegments } from "../useSegments";

// Mock trpc
vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      filterSegments: {
        list: {
          useQuery: vi.fn(() => ({
            data: { segments: [] },
            isFetching: false,
          })),
        },
        setPreference: {
          useMutation: vi.fn(() => ({
            mutate: vi.fn(),
          })),
        },
      },
    },
  },
}));

describe("useSegments system segment auto-clear", () => {
  const mockSetSegmentId = vi.fn();
  const mockSetActiveFilters = vi.fn();
  const mockSetSorting = vi.fn();
  const mockSetColumnVisibility = vi.fn();
  const mockSetColumnSizing = vi.fn();
  const mockSetPageSize = vi.fn();
  const mockSetPageIndex = vi.fn();
  const mockSetSearchTerm = vi.fn();

  const defaultProps = {
    tableIdentifier: "test-table",
    activeFilters: [],
    sorting: [],
    columnVisibility: {},
    columnSizing: {},
    pageSize: 10,
    searchTerm: "",
    defaultPageSize: 10,
    segmentId: null as SegmentIdentifier | null,
    setSegmentId: mockSetSegmentId,
    setActiveFilters: mockSetActiveFilters,
    setSorting: mockSetSorting,
    setColumnVisibility: mockSetColumnVisibility,
    setColumnSizing: mockSetColumnSizing,
    setPageSize: mockSetPageSize,
    setPageIndex: mockSetPageIndex,
    setSearchTerm: mockSetSearchTerm,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should clear system segment selection when filters are modified", () => {
    const systemSegment: SystemFilterSegment = {
      id: "my_bookings",
      name: "My Bookings",
      type: "system",
      activeFilters: [
        {
          f: "userId",
          v: {
            type: ColumnFilterType.MULTI_SELECT,
            data: [123],
          },
        },
      ],
      sorting: [],
      columnVisibility: {},
      columnSizing: {},
      perPage: 10,
      searchTerm: null,
    };

    const { rerender } = renderHook((props) => useSegments(props), {
      initialProps: {
        ...defaultProps,
        systemSegments: [systemSegment],
        // The processed system segment will have ID "system_my_bookings"
        segmentId: { id: "system_my_bookings", type: "system" } as SegmentIdentifier,
        activeFilters: [
          {
            f: "userId",
            v: {
              type: ColumnFilterType.MULTI_SELECT,
              data: [123],
            },
          },
        ],
      },
    });

    // Clear the mock to start fresh
    mockSetSegmentId.mockClear();

    // Now simulate user modifying filters (adding a new filter)
    act(() => {
      rerender({
        ...defaultProps,
        systemSegments: [systemSegment],
        segmentId: { id: "system_my_bookings", type: "system" } as SegmentIdentifier,
        activeFilters: [
          {
            f: "userId",
            v: {
              type: ColumnFilterType.MULTI_SELECT,
              data: [123],
            },
          },
          {
            f: "status",
            v: {
              type: ColumnFilterType.SINGLE_SELECT,
              data: "confirmed",
            },
          },
        ],
      });
    });

    // The system segment selection should be cleared because filters changed
    expect(mockSetSegmentId).toHaveBeenCalledWith(null);
  });

  it("should clear system segment selection when search term is modified", () => {
    const systemSegment: SystemFilterSegment = {
      id: "my_bookings",
      name: "My Bookings",
      type: "system",
      activeFilters: [],
      sorting: [],
      columnVisibility: {},
      columnSizing: {},
      perPage: 10,
      searchTerm: null,
    };

    const { rerender } = renderHook((props) => useSegments(props), {
      initialProps: {
        ...defaultProps,
        systemSegments: [systemSegment],
        segmentId: { id: "system_my_bookings", type: "system" } as SegmentIdentifier,
        searchTerm: "",
      },
    });

    // Clear the mock to start fresh
    mockSetSegmentId.mockClear();

    // Now simulate user modifying search term
    act(() => {
      rerender({
        ...defaultProps,
        systemSegments: [systemSegment],
        segmentId: { id: "system_my_bookings", type: "system" } as SegmentIdentifier,
        searchTerm: "test search",
      });
    });

    // The system segment selection should be cleared
    expect(mockSetSegmentId).toHaveBeenCalledWith(null);
  });
});
