// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDefaultRoutingForm } from "./useDefaultRoutingForm";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: vi.fn().mockReturnValue("/insights/routing"),
}));

vi.mock("@calcom/lib/hooks/useCompatSearchParams", () => ({
  useCompatSearchParams: () => new URLSearchParams(),
}));

const mockFormsUseQuery = vi.fn();
vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      insights: {
        getRoutingFormsForFilters: {
          useQuery: (...args: unknown[]) => mockFormsUseQuery(...args),
        },
      },
    },
  },
}));

describe("useDefaultRoutingForm", () => {
  const defaultProps = {
    userId: 1,
    teamId: 10,
    isAll: false,
    routingFormId: null as string | null | undefined,
    onRoutingFormChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFormsUseQuery.mockReturnValue({ data: undefined });
  });

  it("should return routingForms and mostPopularForm", () => {
    mockFormsUseQuery.mockReturnValue({ data: [] });
    const { result } = renderHook(() => useDefaultRoutingForm(defaultProps));
    expect(result.current.routingForms).toEqual([]);
    expect(result.current.mostPopularForm).toBeNull();
  });

  it("should select the most popular form (highest response count)", () => {
    mockFormsUseQuery.mockReturnValue({
      data: [
        { id: "form-1", name: "Less Popular", _count: { responses: 5 } },
        { id: "form-2", name: "Most Popular", _count: { responses: 20 } },
        { id: "form-3", name: "Medium Popular", _count: { responses: 10 } },
      ],
    });
    const { result } = renderHook(() => useDefaultRoutingForm(defaultProps));
    expect(result.current.mostPopularForm?.id).toBe("form-2");
  });

  it("should set default routing form via URL when no routingFormId and most popular form exists", () => {
    mockFormsUseQuery.mockReturnValue({
      data: [{ id: "form-1", name: "Test Form", _count: { responses: 10 } }],
    });
    renderHook(() => useDefaultRoutingForm(defaultProps));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("routingFormId=form-1"));
    expect(defaultProps.onRoutingFormChange).toHaveBeenCalledWith("form-1");
  });

  it("should not set default when routingFormId is already provided", () => {
    mockFormsUseQuery.mockReturnValue({
      data: [{ id: "form-1", name: "Test Form", _count: { responses: 10 } }],
    });
    renderHook(() =>
      useDefaultRoutingForm({
        ...defaultProps,
        routingFormId: "existing-form",
      })
    );
    expect(mockPush).not.toHaveBeenCalled();
    expect(defaultProps.onRoutingFormChange).not.toHaveBeenCalled();
  });

  it("should not set default when there are no routing forms", () => {
    mockFormsUseQuery.mockReturnValue({ data: [] });
    renderHook(() => useDefaultRoutingForm(defaultProps));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("should only run the default selection effect once", () => {
    mockFormsUseQuery.mockReturnValue({
      data: [{ id: "form-1", name: "Test Form", _count: { responses: 10 } }],
    });
    const { rerender } = renderHook(() => useDefaultRoutingForm(defaultProps));
    // First render sets the default
    expect(mockPush).toHaveBeenCalledTimes(1);
    // Second render should not call push again
    rerender();
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it("should handle forms with no _count field", () => {
    mockFormsUseQuery.mockReturnValue({
      data: [
        { id: "form-1", name: "No Count", _count: undefined },
        { id: "form-2", name: "Has Count", _count: { responses: 5 } },
      ],
    });
    const { result } = renderHook(() => useDefaultRoutingForm(defaultProps));
    expect(result.current.mostPopularForm?.id).toBe("form-2");
  });
});
