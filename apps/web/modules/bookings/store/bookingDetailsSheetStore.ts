"use client";

import { create } from "zustand";

import type { BookingOutput } from "../types";

interface BookingDetailsSheetStore {
  // State
  selectedBookingId: number | null;
  bookings: BookingOutput[];

  // Actions
  setSelectedBookingId: (id: number | null) => void;
  setBookings: (bookings: BookingOutput[]) => void;
  clearSelection: () => void;

  // Computed getters (used via selectors)
  getSelectedBooking: () => BookingOutput | null;
  getNextBookingId: () => number | null;
  getPreviousBookingId: () => number | null;
  hasNext: () => boolean;
  hasPrevious: () => boolean;
}

export const useBookingDetailsSheetStore = create<BookingDetailsSheetStore>((set, get) => ({
  // Initial state
  selectedBookingId: null,
  bookings: [],

  // Actions
  setSelectedBookingId: (id) => set({ selectedBookingId: id }),
  setBookings: (bookings) => set({ bookings }),
  clearSelection: () => set({ selectedBookingId: null }),

  // Computed getters
  getSelectedBooking: () => {
    const state = get();
    if (!state.selectedBookingId) return null;
    return state.bookings.find((booking) => booking.id === state.selectedBookingId) ?? null;
  },

  getNextBookingId: () => {
    const state = get();
    if (!state.selectedBookingId) return null;

    const currentIndex = state.bookings.findIndex((booking) => booking.id === state.selectedBookingId);
    if (currentIndex === -1 || currentIndex >= state.bookings.length - 1) return null;

    return state.bookings[currentIndex + 1].id;
  },

  getPreviousBookingId: () => {
    const state = get();
    if (!state.selectedBookingId) return null;

    const currentIndex = state.bookings.findIndex((booking) => booking.id === state.selectedBookingId);
    if (currentIndex <= 0) return null;

    return state.bookings[currentIndex - 1].id;
  },

  hasNext: () => {
    const state = get();
    if (!state.selectedBookingId) return false;

    const currentIndex = state.bookings.findIndex((booking) => booking.id === state.selectedBookingId);
    return currentIndex >= 0 && currentIndex < state.bookings.length - 1;
  },

  hasPrevious: () => {
    const state = get();
    if (!state.selectedBookingId) return false;

    const currentIndex = state.bookings.findIndex((booking) => booking.id === state.selectedBookingId);
    return currentIndex > 0;
  },
}));
