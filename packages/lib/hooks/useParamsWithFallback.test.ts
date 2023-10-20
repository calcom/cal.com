import { renderHook } from "@testing-library/react-hooks";
import { vi } from "vitest";
import { describe, expect, it } from "vitest";

import { useParamsWithFallback } from "./useParamsWithFallback";

describe("useParamsWithFallback hook", () => {
  it("should return router.query when router.query exists", () => {
    vi.mock("next/navigation", () => ({
      useParams: vi.fn().mockReturnValue(null),
    }));

    vi.mock("react", () => ({
      useContext: vi.fn().mockReturnValue({ query: { id: 1 } }),
    }));

    const { result } = renderHook(() => useParamsWithFallback());

    expect(result.current).toEqual({ id: 1 });
  });

  it("should return useParams() when router is undefined", () => {
    vi.mock("next/navigation", () => ({
      useParams: vi.fn().mockReturnValue({ id: 1 }),
    }));

    vi.mock("react", () => ({
      useContext: vi.fn().mockReturnValue(undefined),
    }));

    const { result } = renderHook(() => useParamsWithFallback());

    expect(result.current).toEqual({ id: 1 });
  });

  it("should return useParams() when router is null", () => {
    vi.mock("next/navigation", () => ({
      useParams: vi.fn().mockReturnValue({ id: 1 }),
    }));

    vi.mock("react", () => ({
      useContext: vi.fn().mockReturnValue(null),
    }));

    const { result } = renderHook(() => useParamsWithFallback());

    expect(result.current).toEqual({ id: 1 });
  });
});
