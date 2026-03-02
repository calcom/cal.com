// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useInsightsBookingFacetedUniqueValues } from "./useInsightsBookingFacetedUniqueValues";

const mockUserListUseQuery = vi.fn();
const mockEventTypeListUseQuery = vi.fn();

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      insights: {
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

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (text: string) => text,
  }),
}));

describe("useInsightsBookingFacetedUniqueValues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserListUseQuery.mockReturnValue({ data: undefined });
    mockEventTypeListUseQuery.mockReturnValue({ data: undefined });
  });

  it("should return a callback function", () => {
    const { result } = renderHook(() =>
      useInsightsBookingFacetedUniqueValues({
        userId: 1,
        teamId: 10,
        isAll: false,
      })
    );
    expect(typeof result.current).toBe("function");
  });

  it("should build faceted values for status column", () => {
    const { result } = renderHook(() =>
      useInsightsBookingFacetedUniqueValues({
        userId: 1,
        teamId: 10,
        isAll: false,
      })
    );
    const mockTable = {} as Parameters<typeof result.current>[0];
    const getFacetedValues = result.current(mockTable, "status");
    const map = getFacetedValues();
    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBe(5); // 5 booking statuses
  });

  it("should build faceted values for userId column using user list data", () => {
    mockUserListUseQuery.mockReturnValue({
      data: [
        { id: 1, name: "Alice", email: "alice@test.com" },
        { id: 2, name: null, email: "bob@test.com" },
      ],
    });
    const { result } = renderHook(() =>
      useInsightsBookingFacetedUniqueValues({
        userId: undefined,
        teamId: 10,
        isAll: true,
      })
    );
    const mockTable = {} as Parameters<typeof result.current>[0];
    const getFacetedValues = result.current(mockTable, "userId");
    const map = getFacetedValues();
    expect(map.size).toBe(2);
  });

  it("should build faceted values for eventTypeId column using event type data", () => {
    mockEventTypeListUseQuery.mockReturnValue({
      data: [
        { id: 1, title: "30 Min Meeting", teamId: null, team: null },
        { id: 2, title: "Team Standup", teamId: 10, team: { name: "Engineering" } },
      ],
    });
    const { result } = renderHook(() =>
      useInsightsBookingFacetedUniqueValues({
        userId: 1,
        teamId: 10,
        isAll: false,
      })
    );
    const mockTable = {} as Parameters<typeof result.current>[0];
    const getFacetedValues = result.current(mockTable, "eventTypeId");
    const map = getFacetedValues();
    expect(map.size).toBe(2);
  });

  it("should build faceted values for paid column", () => {
    const { result } = renderHook(() =>
      useInsightsBookingFacetedUniqueValues({
        userId: 1,
        teamId: 10,
        isAll: false,
      })
    );
    const mockTable = {} as Parameters<typeof result.current>[0];
    const getFacetedValues = result.current(mockTable, "paid");
    const map = getFacetedValues();
    expect(map.size).toBe(2); // paid and free
  });

  it("should return empty map for unknown column", () => {
    const { result } = renderHook(() =>
      useInsightsBookingFacetedUniqueValues({
        userId: 1,
        teamId: 10,
        isAll: false,
      })
    );
    const mockTable = {} as Parameters<typeof result.current>[0];
    const getFacetedValues = result.current(mockTable, "unknownColumn");
    const map = getFacetedValues();
    expect(map.size).toBe(0);
  });

  it("should return empty userId facets when users data is undefined", () => {
    mockUserListUseQuery.mockReturnValue({ data: undefined });
    const { result } = renderHook(() =>
      useInsightsBookingFacetedUniqueValues({
        userId: undefined,
        teamId: 10,
        isAll: false,
      })
    );
    const mockTable = {} as Parameters<typeof result.current>[0];
    const getFacetedValues = result.current(mockTable, "userId");
    const map = getFacetedValues();
    expect(map.size).toBe(0);
  });
});
