// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useInsightsRoutingFacetedUniqueValues } from "./useInsightsRoutingFacetedUniqueValues";

const mockFormsUseQuery = vi.fn();
const mockUserListUseQuery = vi.fn();
const mockEventTypeListUseQuery = vi.fn();

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      insights: {
        getRoutingFormsForFilters: { useQuery: (...args: unknown[]) => mockFormsUseQuery(...args) },
        userList: { useQuery: (...args: unknown[]) => mockUserListUseQuery(...args) },
        eventTypeList: { useQuery: (...args: unknown[]) => mockEventTypeListUseQuery(...args) },
      },
    },
  },
}));

vi.mock("@calcom/features/data-table", () => ({
  convertFacetedValuesToMap: (items: Array<{ value: unknown; label: string }>) => {
    const map = new Map();
    for (const item of items) {
      map.set(item, 0);
    }
    return map;
  },
}));

vi.mock("@calcom/prisma/enums", () => ({
  BookingStatus: {
    ACCEPTED: "ACCEPTED",
    PENDING: "PENDING",
    AWAITING_HOST: "AWAITING_HOST",
    CANCELLED: "CANCELLED",
    REJECTED: "REJECTED",
  },
}));

vi.mock("@calcom/features/insights/lib/bookingStatusToText", () => ({
  bookingStatusToText: (status: string) => status.toLowerCase(),
}));

type MockHeaderRow = {
  id: string;
  label: string;
  type: string;
  options?: Array<{ id: string | null; label: string }>;
};

describe("useInsightsRoutingFacetedUniqueValues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFormsUseQuery.mockReturnValue({ data: undefined });
    mockUserListUseQuery.mockReturnValue({ data: undefined });
    mockEventTypeListUseQuery.mockReturnValue({ data: undefined });
  });

  it("should return empty map when headers are undefined", () => {
    const { result } = renderHook(() =>
      useInsightsRoutingFacetedUniqueValues({
        headers: undefined,
        userId: 1,
        teamId: 10,
        isAll: false,
      })
    );
    const mockTable = {} as Parameters<typeof result.current>[0];
    const getFacetedValues = result.current(mockTable, "someField");
    const map = getFacetedValues();
    expect(map.size).toBe(0);
  });

  it("should build faceted values from field header options", () => {
    const headers: MockHeaderRow[] = [
      {
        id: "field-1",
        label: "Department",
        type: "SINGLE_SELECT",
        options: [
          { id: "opt-1", label: "Engineering" },
          { id: "opt-2", label: "Sales" },
          { id: null, label: "Unknown" },
        ],
      },
    ];
    const { result } = renderHook(() =>
      useInsightsRoutingFacetedUniqueValues({
        headers: headers as Parameters<typeof useInsightsRoutingFacetedUniqueValues>[0]["headers"],
        userId: 1,
        teamId: 10,
        isAll: false,
      })
    );
    const mockTable = {} as Parameters<typeof result.current>[0];
    const getFacetedValues = result.current(mockTable, "field-1");
    const map = getFacetedValues();
    // Should filter out null id options
    expect(map.size).toBe(2);
  });

  it("should build faceted values for bookingStatusOrder column", () => {
    const headers: MockHeaderRow[] = [];
    const { result } = renderHook(() =>
      useInsightsRoutingFacetedUniqueValues({
        headers: headers as Parameters<typeof useInsightsRoutingFacetedUniqueValues>[0]["headers"],
        userId: 1,
        teamId: 10,
        isAll: false,
      })
    );
    const mockTable = {} as Parameters<typeof result.current>[0];
    const getFacetedValues = result.current(mockTable, "bookingStatusOrder");
    const map = getFacetedValues();
    expect(map.size).toBe(5);
  });

  it("should build faceted values for formId column using forms data", () => {
    mockFormsUseQuery.mockReturnValue({
      data: [
        { id: "form-1", name: "Contact Form" },
        { id: "form-2", name: "Support Form" },
      ],
    });
    const headers: MockHeaderRow[] = [];
    const { result } = renderHook(() =>
      useInsightsRoutingFacetedUniqueValues({
        headers: headers as Parameters<typeof useInsightsRoutingFacetedUniqueValues>[0]["headers"],
        userId: 1,
        teamId: 10,
        isAll: false,
      })
    );
    const mockTable = {} as Parameters<typeof result.current>[0];
    const getFacetedValues = result.current(mockTable, "formId");
    const map = getFacetedValues();
    expect(map.size).toBe(2);
  });

  it("should build faceted values for bookingUserId column sorted alphabetically", () => {
    mockUserListUseQuery.mockReturnValue({
      data: [
        { id: 2, name: "Zara", email: "zara@test.com" },
        { id: 1, name: "Alice", email: "alice@test.com" },
      ],
    });
    const headers: MockHeaderRow[] = [];
    const { result } = renderHook(() =>
      useInsightsRoutingFacetedUniqueValues({
        headers: headers as Parameters<typeof useInsightsRoutingFacetedUniqueValues>[0]["headers"],
        userId: 1,
        teamId: 10,
        isAll: false,
      })
    );
    const mockTable = {} as Parameters<typeof result.current>[0];
    const getFacetedValues = result.current(mockTable, "bookingUserId");
    const map = getFacetedValues();
    expect(map.size).toBe(2);
  });

  it("should build faceted values for eventTypeId column", () => {
    mockEventTypeListUseQuery.mockReturnValue({
      data: [{ id: 1, title: "Standup", teamId: null, team: null }],
    });
    const headers: MockHeaderRow[] = [];
    const { result } = renderHook(() =>
      useInsightsRoutingFacetedUniqueValues({
        headers: headers as Parameters<typeof useInsightsRoutingFacetedUniqueValues>[0]["headers"],
        userId: 1,
        teamId: 10,
        isAll: false,
      })
    );
    const mockTable = {} as Parameters<typeof result.current>[0];
    const getFacetedValues = result.current(mockTable, "eventTypeId");
    const map = getFacetedValues();
    expect(map.size).toBe(1);
  });
});
