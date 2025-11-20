"use client";

import React from "react";
import { createStore, useStore } from "zustand";

import { useSelectedBookingId } from "../hooks/useSelectedBookingId";
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

type BookingDetailsSheetStoreType = ReturnType<typeof createBookingDetailsSheetStore>;

const createBookingDetailsSheetStore = (initialBookings: BookingOutput[] = []) => {
  return createStore<BookingDetailsSheetStore>((set, get) => ({
    // Initial state
    selectedBookingId: null,
    bookings: initialBookings,

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
};

const BookingDetailsSheetStoreContext = React.createContext<BookingDetailsSheetStoreType | null>(null);

export function BookingDetailsSheetStoreProvider({
  children,
  bookings,
}: {
  children: React.ReactNode;
  bookings: BookingOutput[];
}) {
  const [store] = React.useState(() => createBookingDetailsSheetStore(bookings));
  const [selectedBookingIdFromUrl, setSelectedBookingIdToUrl] = useSelectedBookingId();

  // Update bookings when they change
  React.useEffect(() => {
    store.getState().setBookings(bookings);
  }, [bookings, store]);

  // Sync Store → URL
  React.useEffect(() => {
    const unsubscribe = store.subscribe((state) => {
      const storeId = state.selectedBookingId;
      if (storeId !== selectedBookingIdFromUrl) {
        setSelectedBookingIdToUrl(storeId);
      }
    });

    return unsubscribe;
  }, [selectedBookingIdFromUrl, setSelectedBookingIdToUrl, store]);

  // Sync URL → Store
  React.useEffect(() => {
    const currentStoreId = store.getState().selectedBookingId;
    if (currentStoreId !== selectedBookingIdFromUrl) {
      store.getState().setSelectedBookingId(selectedBookingIdFromUrl);
    }
  }, [selectedBookingIdFromUrl, store]);

  return (
    <BookingDetailsSheetStoreContext.Provider value={store}>
      {children}
    </BookingDetailsSheetStoreContext.Provider>
  );
}

export function useBookingDetailsSheetStore<T>(selector: (state: BookingDetailsSheetStore) => T): T {
  const store = React.useContext(BookingDetailsSheetStoreContext);
  if (!store) {
    throw new Error("useBookingDetailsSheetStore must be used within BookingDetailsSheetStoreProvider");
  }
  return useStore(store, selector);
}

// For direct store access (needed for subscribe and getState)
export function useBookingDetailsSheetStoreApi() {
  const store = React.useContext(BookingDetailsSheetStoreContext);
  if (!store) {
    throw new Error("useBookingDetailsSheetStoreApi must be used within BookingDetailsSheetStoreProvider");
  }
  return store;
}
