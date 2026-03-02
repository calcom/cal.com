/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BookingOutput } from "../types";
import { useBookingCursor } from "./useBookingCursor";

function makeBooking(uid: string): BookingOutput {
  return { uid } as unknown as BookingOutput;
}

describe("useBookingCursor", () => {
  const bookings = [makeBooking("a"), makeBooking("b"), makeBooking("c")];

  it("returns hasPrevious=false and hasNext=false when no booking is selected", () => {
    const setSelected = vi.fn();
    const { result } = renderHook(() =>
      useBookingCursor({
        bookings,
        selectedBookingUid: null,
        setSelectedBookingUid: setSelected,
      })
    );

    expect(result.current.hasPrevious).toBe(false);
    expect(result.current.hasNext).toBe(false);
  });

  it("returns hasPrevious=false when first booking is selected", () => {
    const setSelected = vi.fn();
    const { result } = renderHook(() =>
      useBookingCursor({
        bookings,
        selectedBookingUid: "a",
        setSelectedBookingUid: setSelected,
      })
    );

    expect(result.current.hasPrevious).toBe(false);
    expect(result.current.hasNext).toBe(true);
  });

  it("returns hasNext=false when last booking is selected", () => {
    const setSelected = vi.fn();
    const { result } = renderHook(() =>
      useBookingCursor({
        bookings,
        selectedBookingUid: "c",
        setSelectedBookingUid: setSelected,
      })
    );

    expect(result.current.hasPrevious).toBe(true);
    expect(result.current.hasNext).toBe(false);
  });

  it("returns both true for middle booking", () => {
    const setSelected = vi.fn();
    const { result } = renderHook(() =>
      useBookingCursor({
        bookings,
        selectedBookingUid: "b",
        setSelectedBookingUid: setSelected,
      })
    );

    expect(result.current.hasPrevious).toBe(true);
    expect(result.current.hasNext).toBe(true);
  });

  it("navigates to next booking", () => {
    const setSelected = vi.fn();
    const { result } = renderHook(() =>
      useBookingCursor({
        bookings,
        selectedBookingUid: "a",
        setSelectedBookingUid: setSelected,
      })
    );

    act(() => {
      result.current.onNext();
    });

    expect(setSelected).toHaveBeenCalledWith("b");
  });

  it("navigates to previous booking", () => {
    const setSelected = vi.fn();
    const { result } = renderHook(() =>
      useBookingCursor({
        bookings,
        selectedBookingUid: "b",
        setSelectedBookingUid: setSelected,
      })
    );

    act(() => {
      result.current.onPrevious();
    });

    expect(setSelected).toHaveBeenCalledWith("a");
  });

  it("does not navigate past the end", () => {
    const setSelected = vi.fn();
    const { result } = renderHook(() =>
      useBookingCursor({
        bookings,
        selectedBookingUid: "c",
        setSelectedBookingUid: setSelected,
      })
    );

    act(() => {
      result.current.onNext();
    });

    expect(setSelected).not.toHaveBeenCalled();
  });

  it("does not navigate before the start", () => {
    const setSelected = vi.fn();
    const { result } = renderHook(() =>
      useBookingCursor({
        bookings,
        selectedBookingUid: "a",
        setSelectedBookingUid: setSelected,
      })
    );

    act(() => {
      result.current.onPrevious();
    });

    expect(setSelected).not.toHaveBeenCalled();
  });

  it("handles empty bookings list", () => {
    const setSelected = vi.fn();
    const { result } = renderHook(() =>
      useBookingCursor({
        bookings: [],
        selectedBookingUid: null,
        setSelectedBookingUid: setSelected,
      })
    );

    expect(result.current.hasPrevious).toBe(false);
    expect(result.current.hasNext).toBe(false);
  });

  it("handles single booking", () => {
    const setSelected = vi.fn();
    const { result } = renderHook(() =>
      useBookingCursor({
        bookings: [makeBooking("only")],
        selectedBookingUid: "only",
        setSelectedBookingUid: setSelected,
      })
    );

    expect(result.current.hasPrevious).toBe(false);
    expect(result.current.hasNext).toBe(false);
  });
});
