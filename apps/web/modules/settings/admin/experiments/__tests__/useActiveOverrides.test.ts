import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSessionStorage: Record<string, string> = {};
vi.mock("@calcom/lib/webstorage", () => ({
  sessionStorage: {
    getItem: (key: string) => mockSessionStorage[key] ?? null,
    setItem: (key: string, value: string) => {
      mockSessionStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete mockSessionStorage[key];
    },
    get length() {
      return Object.keys(mockSessionStorage).length;
    },
    key(index: number) {
      return Object.keys(mockSessionStorage)[index] ?? null;
    },
  },
}));

vi.mock("@calcom/features/experiments/config", () => ({
  EXP_OVERRIDE_PREFIX: "exp_override:",
}));

import { useActiveOverrides } from "../useActiveOverrides";

describe("useActiveOverrides", () => {
  beforeEach(() => {
    Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key]);
  });

  it("initializes empty when no overrides in storage", () => {
    const { result } = renderHook(() => useActiveOverrides());
    expect(result.current.overrides).toEqual({});
  });

  it("initializes with existing overrides from storage", () => {
    mockSessionStorage["exp_override:test-exp"] = "variant_a";
    mockSessionStorage["exp_override:other-exp"] = "variant_b";
    mockSessionStorage["unrelated-key"] = "ignored";

    const { result } = renderHook(() => useActiveOverrides());

    expect(result.current.overrides).toEqual({
      "test-exp": "variant_a",
      "other-exp": "variant_b",
    });
  });

  it("setOverride writes to storage and updates state", () => {
    const { result } = renderHook(() => useActiveOverrides());

    act(() => result.current.setOverride("test-exp", "variant_a"));

    expect(result.current.overrides).toEqual({ "test-exp": "variant_a" });
    expect(mockSessionStorage["exp_override:test-exp"]).toBe("variant_a");
  });

  it("clearOverride removes from storage and updates state", () => {
    mockSessionStorage["exp_override:test-exp"] = "variant_a";
    const { result } = renderHook(() => useActiveOverrides());

    act(() => result.current.clearOverride("test-exp"));

    expect(result.current.overrides).toEqual({});
    expect(mockSessionStorage["exp_override:test-exp"]).toBeUndefined();
  });

  it("clearAll removes all overrides from storage and state", () => {
    mockSessionStorage["exp_override:exp-1"] = "v1";
    mockSessionStorage["exp_override:exp-2"] = "v2";
    mockSessionStorage["unrelated"] = "kept";

    const { result } = renderHook(() => useActiveOverrides());

    act(() => result.current.clearAll());

    expect(result.current.overrides).toEqual({});
    expect(mockSessionStorage["exp_override:exp-1"]).toBeUndefined();
    expect(mockSessionStorage["exp_override:exp-2"]).toBeUndefined();
    expect(mockSessionStorage["unrelated"]).toBe("kept");
  });
});
