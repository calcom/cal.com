// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWrongAssignmentFacetedUniqueValues } from "./useWrongAssignmentFacetedUniqueValues";

const mockFormsUseQuery = vi.fn();
const mockUserListUseQuery = vi.fn();

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      insights: {
        getRoutingFormsForFilters: { useQuery: (...args: unknown[]) => mockFormsUseQuery(...args) },
        userList: { useQuery: (...args: unknown[]) => mockUserListUseQuery(...args) },
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

describe("useWrongAssignmentFacetedUniqueValues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFormsUseQuery.mockReturnValue({ data: undefined });
    mockUserListUseQuery.mockReturnValue({ data: undefined });
  });

  it("should build faceted values for routingFormId column", () => {
    mockFormsUseQuery.mockReturnValue({
      data: [
        { id: "form-1", name: "Contact Form" },
        { id: "form-2", name: "Support Form" },
      ],
    });
    const { result } = renderHook(() =>
      useWrongAssignmentFacetedUniqueValues({
        userId: 1,
        teamId: 10,
        isAll: false,
      })
    );
    const mockTable = {} as Parameters<typeof result.current>[0];
    const getFacetedValues = result.current(mockTable, "routingFormId");
    const map = getFacetedValues();
    expect(map.size).toBe(2);
  });

  it("should build faceted values for reportedById column sorted alphabetically", () => {
    mockUserListUseQuery.mockReturnValue({
      data: [
        { id: 2, name: "Zara", email: "zara@test.com" },
        { id: 1, name: "Alice", email: "alice@test.com" },
      ],
    });
    const { result } = renderHook(() =>
      useWrongAssignmentFacetedUniqueValues({
        userId: 1,
        teamId: 10,
        isAll: false,
      })
    );
    const mockTable = {} as Parameters<typeof result.current>[0];
    const getFacetedValues = result.current(mockTable, "reportedById");
    const map = getFacetedValues();
    expect(map.size).toBe(2);
  });

  it("should return empty map for unknown column", () => {
    const { result } = renderHook(() =>
      useWrongAssignmentFacetedUniqueValues({
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

  it("should return empty routingFormId facets when forms data is undefined", () => {
    const { result } = renderHook(() =>
      useWrongAssignmentFacetedUniqueValues({
        userId: 1,
        teamId: 10,
        isAll: false,
      })
    );
    const mockTable = {} as Parameters<typeof result.current>[0];
    const getFacetedValues = result.current(mockTable, "routingFormId");
    const map = getFacetedValues();
    expect(map.size).toBe(0);
  });

  it("should use email as label fallback when user name is null", () => {
    mockUserListUseQuery.mockReturnValue({
      data: [{ id: 1, name: null, email: "bob@test.com" }],
    });
    const { result } = renderHook(() =>
      useWrongAssignmentFacetedUniqueValues({
        userId: undefined,
        teamId: 10,
        isAll: true,
      })
    );
    const mockTable = {} as Parameters<typeof result.current>[0];
    const getFacetedValues = result.current(mockTable, "reportedById");
    const map = getFacetedValues();
    expect(map.size).toBe(1);
  });
});
