"use client";

import React from "react";
import { createStore, useStore } from "zustand";

import { useSelectedBookingUid } from "../hooks/useSelectedBookingUid";
import type { BookingOutput } from "../types";

interface BookingDetailsSheetStore {
  // State
  selectedBookingUid: string | null;
  bookings: BookingOutput[];

  // Actions
  setSelectedBookingUid: (uid: string | null) => void;
  setBookings: (bookings: BookingOutput[]) => void;
  clearSelection: () => void;

  // Computed getters (used via selectors)
  getSelectedBooking: () => BookingOutput | null;
  getNextBookingUid: () => string | null;
  getPreviousBookingUid: () => string | null;
  hasNext: () => boolean;
  hasPrevious: () => boolean;
}

type BookingDetailsSheetStoreType = ReturnType<typeof createBookingDetailsSheetStore>;

const createBookingDetailsSheetStore = (initialBookings: BookingOutput[] = []) => {
  return createStore<BookingDetailsSheetStore>((set, get) => ({
    // Initial state
    selectedBookingUid: null,
    bookings: initialBookings,

    // Actions
    setSelectedBookingUid: (uid) => set({ selectedBookingUid: uid }),
    setBookings: (bookings) => set({ bookings }),
    clearSelection: () => set({ selectedBookingUid: null }),

    // Computed getters
    getSelectedBooking: () => {
      const state = get();
      if (!state.selectedBookingUid) return null;
      return state.bookings.find((booking) => booking.uid === state.selectedBookingUid) ?? null;
    },

    getNextBookingUid: () => {
      const state = get();
      if (!state.selectedBookingUid) return null;

      const currentIndex = state.bookings.findIndex((booking) => booking.uid === state.selectedBookingUid);
      if (currentIndex === -1 || currentIndex >= state.bookings.length - 1) return null;

      return state.bookings[currentIndex + 1].uid;
    },

    getPreviousBookingUid: () => {
      const state = get();
      if (!state.selectedBookingUid) return null;

      const currentIndex = state.bookings.findIndex((booking) => booking.uid === state.selectedBookingUid);
      if (currentIndex <= 0) return null;

      return state.bookings[currentIndex - 1].uid;
    },

    hasNext: () => {
      const state = get();
      if (!state.selectedBookingUid) return false;

      const currentIndex = state.bookings.findIndex((booking) => booking.uid === state.selectedBookingUid);
      return currentIndex >= 0 && currentIndex < state.bookings.length - 1;
    },

    hasPrevious: () => {
      const state = get();
      if (!state.selectedBookingUid) return false;

      const currentIndex = state.bookings.findIndex((booking) => booking.uid === state.selectedBookingUid);
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
  const [selectedBookingUidFromUrl, setSelectedBookingUidToUrl] = useSelectedBookingUid();

  // Update bookings when they change
  React.useEffect(() => {
    store.getState().setBookings(bookings);
  }, [bookings, store]);

  // Sync Store → URL
  React.useEffect(() => {
    const unsubscribe = store.subscribe((state) => {
      const storeUid = state.selectedBookingUid;
      if (storeUid !== selectedBookingUidFromUrl) {
        setSelectedBookingUidToUrl(storeUid);
      }
    });

    return unsubscribe;
  }, [selectedBookingUidFromUrl, setSelectedBookingUidToUrl, store]);

  // Sync URL → Store
  React.useEffect(() => {
    const currentStoreUid = store.getState().selectedBookingUid;
    if (currentStoreUid !== selectedBookingUidFromUrl) {
      store.getState().setSelectedBookingUid(selectedBookingUidFromUrl);
    }
  }, [selectedBookingUidFromUrl, store]);

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
