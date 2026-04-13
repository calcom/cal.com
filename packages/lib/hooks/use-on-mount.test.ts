import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useOnMount, useOnUnmount } from "./use-on-mount";

describe("useOnMount", () => {
  it("calls callback once on mount", () => {
    const callback = vi.fn();
    renderHook(() => useOnMount(callback));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does not call callback on re-render", () => {
    const callback = vi.fn();
    const { rerender } = renderHook(() => useOnMount(callback));
    rerender();
    rerender();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("calls cleanup function on unmount", () => {
    const cleanup = vi.fn();
    const callback = vi.fn(() => cleanup);
    const { unmount } = renderHook(() => useOnMount(callback));
    expect(cleanup).not.toHaveBeenCalled();
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});

describe("useOnUnmount", () => {
  it("does not call callback on mount", () => {
    const callback = vi.fn();
    renderHook(() => useOnUnmount(callback));
    expect(callback).not.toHaveBeenCalled();
  });

  it("calls callback once on unmount", () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useOnUnmount(callback));
    unmount();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("uses the latest callback ref on unmount", () => {
    let value = "initial";
    const { unmount, rerender } = renderHook(() =>
      useOnUnmount(() => {
        value = "unmounted";
      })
    );
    value = "updated";
    rerender();
    unmount();
    expect(value).toBe("unmounted");
  });
});
