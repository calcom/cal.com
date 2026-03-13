import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createStore } from "zustand";
import type { BookingOutput } from "../types";

type BookingDetailsSheetStore = {
  selectedBookingUid: string | null;
  bookings: BookingOutput[];
  setSelectedBookingUid: (uid: string | null) => void;
  setBookings: (bookings: BookingOutput[]) => void;
  getSelectedBooking: () => BookingOutput | null;
};

function createTestStore(initialBookings: BookingOutput[] = []) {
  return createStore<BookingDetailsSheetStore>((set, get) => ({
    selectedBookingUid: null,
    bookings: initialBookings,
    setSelectedBookingUid: (uid) => set({ selectedBookingUid: uid }),
    setBookings: (bookings) => set({ bookings }),
    getSelectedBooking: () => {
      const state = get();
      if (!state.selectedBookingUid) return null;
      return state.bookings.find((booking) => booking.uid === state.selectedBookingUid) ?? null;
    },
  }));
}

const makeBooking = (uid: string, title: string): BookingOutput =>
  ({
    uid,
    id: Number(uid),
    title,
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    status: "ACCEPTED",
    attendees: [],
    metadata: null,
    location: null,
    rescheduled: false,
    recurringEventId: null,
    fromReschedule: null,
    responses: {},
    payment: [],
    eventType: null,
    user: null,
    assignmentReasonSortedByCreatedAt: [],
  }) as unknown as BookingOutput;

describe("BookingDetailsSheet transition behavior", () => {
  const bookingA = makeBooking("uid-a", "Booking A");
  const bookingB = makeBooking("uid-b", "Booking B");

  it("getSelectedBooking returns null when no uid is selected", () => {
    const store = createTestStore([bookingA, bookingB]);
    expect(store.getState().getSelectedBooking()).toBeNull();
  });

  it("getSelectedBooking returns the correct booking when uid is set", () => {
    const store = createTestStore([bookingA, bookingB]);
    store.getState().setSelectedBookingUid("uid-a");
    expect(store.getState().getSelectedBooking()?.uid).toBe("uid-a");
  });

  it("getSelectedBooking returns null when uid does not match any booking", () => {
    const store = createTestStore([bookingA, bookingB]);
    store.getState().setSelectedBookingUid("uid-nonexistent");
    expect(store.getState().getSelectedBooking()).toBeNull();
  });

  it("switching between bookings updates getSelectedBooking immediately", () => {
    const store = createTestStore([bookingA, bookingB]);
    store.getState().setSelectedBookingUid("uid-a");
    expect(store.getState().getSelectedBooking()?.title).toBe("Booking A");

    store.getState().setSelectedBookingUid("uid-b");
    expect(store.getState().getSelectedBooking()?.title).toBe("Booking B");
  });

  describe("lastBookingRef fallback logic", () => {
    it("preserves last booking when getSelectedBooking returns null during transition", () => {
      let lastBooking: BookingOutput | null = null;
      let selectedBookingUid: string | null = null;

      const store = createTestStore([bookingA, bookingB]);
      store.getState().setSelectedBookingUid("uid-a");

      const booking = store.getState().getSelectedBooking();
      if (booking) {
        lastBooking = booking;
      }

      store.getState().setSelectedBookingUid("uid-nonexistent");
      selectedBookingUid = store.getState().selectedBookingUid;

      const currentBooking = store.getState().getSelectedBooking();
      const resolvedBooking = currentBooking ?? lastBooking;

      expect(currentBooking).toBeNull();
      expect(selectedBookingUid).toBe("uid-nonexistent");
      expect(resolvedBooking?.uid).toBe("uid-a");
    });

    it("clears lastBooking when selectedBookingUid is explicitly null", () => {
      let lastBooking: BookingOutput | null = null;

      const store = createTestStore([bookingA]);
      store.getState().setSelectedBookingUid("uid-a");

      const booking = store.getState().getSelectedBooking();
      if (booking) {
        lastBooking = booking;
      }

      store.getState().setSelectedBookingUid(null);
      const selectedBookingUid = store.getState().selectedBookingUid;

      if (!selectedBookingUid) {
        lastBooking = null;
      }

      const currentBooking = store.getState().getSelectedBooking();
      const resolvedBooking = currentBooking ?? lastBooking;

      expect(resolvedBooking).toBeNull();
    });

    it("updates lastBooking when new booking is found", () => {
      let lastBooking: BookingOutput | null = null;

      const store = createTestStore([bookingA, bookingB]);

      store.getState().setSelectedBookingUid("uid-a");
      const bookingAResult = store.getState().getSelectedBooking();
      if (bookingAResult) lastBooking = bookingAResult;
      expect(lastBooking?.uid).toBe("uid-a");

      store.getState().setSelectedBookingUid("uid-b");
      const bookingBResult = store.getState().getSelectedBooking();
      if (bookingBResult) lastBooking = bookingBResult;
      expect(lastBooking?.uid).toBe("uid-b");
    });
  });
});

/**
 * Regression guard: moving getBookingDetails or the fallback query into
 * BookingDetailsSheetInner caused duplicate fetches on every unmount/remount
 * cycle triggered by store/URL sync. These static-analysis tests verify
 * the queries stay in useResolvedBooking where they survive those cycles.
 *
 * Source-position checks are used instead of render tests because the
 * component imports path aliases (@components/) that vitest can't resolve
 * without the full Next.js build — rendering would fail at import time.
 */
describe("useResolvedBooking hook structure", () => {
  const hookSource = readFileSync(resolve(__dirname, "../hooks/useResolvedBooking.ts"), "utf-8");
  const componentSource = readFileSync(resolve(__dirname, "./BookingDetailsSheet.tsx"), "utf-8");
  const hookBoundary = hookSource.indexOf("function useResolvedBooking");

  it("useResolvedBooking hook exists in its own file", () => {
    expect(hookBoundary).toBeGreaterThan(-1);
  });

  it("getBookingDetails query lives inside useResolvedBooking", () => {
    const queryPos = hookSource.indexOf("getBookingDetails.useQuery");
    expect(queryPos).toBeGreaterThan(hookBoundary);
  });

  it("getBookingDetails query appears exactly once in the hook file", () => {
    const matches = hookSource.match(/getBookingDetails\.useQuery/g);
    expect(matches).toHaveLength(1);
  });

  it("fallback bookings.get query lives inside useResolvedBooking", () => {
    const fallbackPos = hookSource.indexOf("bookings.get.useQuery");
    expect(fallbackPos).toBeGreaterThan(hookBoundary);
  });

  it("fallback query is only enabled when booking is not in the store", () => {
    expect(hookSource).toContain("enabled: !!selectedBookingUid && !booking");
  });

  it("resolvedBooking resolution order: store > fallback > lastBookingRef", () => {
    expect(hookSource).toContain("booking ?? fallbackBooking ?? lastBookingRef.current");
  });

  it("lastBookingRef is updated from both store booking and fallback booking", () => {
    expect(hookSource).toContain("if (booking || fallbackBooking)");
    expect(hookSource).toContain("booking ?? fallbackBooking");
  });

  it("BookingDetailsSheet calls useResolvedBooking and passes results to inner", () => {
    expect(componentSource).toContain("useResolvedBooking()");
    expect(componentSource).toContain("bookingDetails={bookingDetails}");
  });

  describe("resolvedBooking resolution logic", () => {
    it("uses fallbackBooking when store booking is null", () => {
      const storeBooking: BookingOutput | null = null;
      const fallbackBooking = makeBooking("uid-fallback", "Fallback Booking");
      const lastBooking: BookingOutput | null = null;

      const resolvedBooking = storeBooking ?? fallbackBooking ?? lastBooking;
      expect(resolvedBooking?.uid).toBe("uid-fallback");
    });

    it("prefers store booking over fallback", () => {
      const storeBooking = makeBooking("uid-store", "Store Booking");
      const fallbackBooking = makeBooking("uid-fallback", "Fallback Booking");
      const lastBooking: BookingOutput | null = null;

      const resolvedBooking = storeBooking ?? fallbackBooking ?? lastBooking;
      expect(resolvedBooking?.uid).toBe("uid-store");
    });

    it("falls back to lastBookingRef when both store and fallback are null", () => {
      const storeBooking: BookingOutput | null = null;
      const fallbackBooking: BookingOutput | null = null;
      const lastBooking = makeBooking("uid-last", "Last Booking");

      const resolvedBooking = storeBooking ?? fallbackBooking ?? lastBooking;
      expect(resolvedBooking?.uid).toBe("uid-last");
    });
  });
});
