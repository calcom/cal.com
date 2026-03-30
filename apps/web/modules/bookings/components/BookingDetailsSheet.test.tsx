import { act, renderHook } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, useStore } from "zustand";
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
      const displayBooking = currentBooking ?? lastBooking;

      expect(currentBooking).toBeNull();
      expect(selectedBookingUid).toBe("uid-nonexistent");
      expect(displayBooking?.uid).toBe("uid-a");
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
      const displayBooking = currentBooking ?? lastBooking;

      expect(displayBooking).toBeNull();
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
