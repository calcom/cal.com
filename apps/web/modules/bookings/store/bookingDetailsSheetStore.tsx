"use client";

import React, { useEffect, useRef, useState } from "react";
import { createStore, useStore } from "zustand";

import { useSelectedBookingUid } from "../hooks/useSelectedBookingUid";
import type { BookingOutput } from "../types";

export type PendingSelectionType = "first" | "last" | null;

/**
 * Capabilities interface for view-specific navigation logic.
 * This allows different views (list/calendar) to provide their own
 * navigation implementations without the core store knowing about them.
 */
export interface NavigationCapabilities {
  /**
   * Check if navigation to the previous period is possible
   * (e.g., previous page in list view, previous week in calendar view)
   */
  canNavigateToPreviousPeriod: () => boolean;

  /**
   * Check if navigation to the next period is possible
   * (e.g., next page in list view, next week in calendar view)
   */
  canNavigateToNextPeriod: () => boolean;

  /**
   * Request navigation to the previous period.
   * This should trigger the view state update (e.g., page index change).
   * The parent component will handle fetching data and updating bookings.
   */
  requestPreviousPeriod: () => void;

  /**
   * Request navigation to the next period.
   * This should trigger the view state update (e.g., page index change).
   * The parent component will handle fetching data and updating bookings.
   */
  requestNextPeriod: () => void;
}

interface BookingDetailsSheetStore {
  // Core state (view-agnostic)
  selectedBookingUid: string | null;
  bookings: BookingOutput[];
  isTransitioning: boolean;
  pendingSelection: PendingSelectionType;

  // Injected capabilities (provided by adapters)
  capabilities: NavigationCapabilities | null;

  // Core actions
  setSelectedBookingUid: (uid: string | null) => void;
  setBookings: (bookings: BookingOutput[]) => void;
  setCapabilities: (capabilities: NavigationCapabilities | null) => void;
  clearSelection: () => void;
  clearPendingSelection: () => void;
  setIsTransitioning: (isTransitioning: boolean) => void;

  // Navigation methods (delegates to capabilities)
  navigateNext: () => Promise<void>;
  navigatePrevious: () => Promise<void>;

  // Simple getters (no view-specific logic)
  getSelectedBooking: () => BookingOutput | null;
  getCurrentIndex: () => number;
  hasNextInArray: () => boolean;
  hasPreviousInArray: () => boolean;
  isFirstInArray: () => boolean;
  isLastInArray: () => boolean;
}

type BookingDetailsSheetStoreType = ReturnType<typeof createBookingDetailsSheetStore>;

const createBookingDetailsSheetStore = (initialBookings: BookingOutput[] = []) => {
  return createStore<BookingDetailsSheetStore>((set, get) => ({
    // Initial state
    selectedBookingUid: null,
    bookings: initialBookings,
    isTransitioning: false,
    pendingSelection: null,
    capabilities: null,

    // Actions
    setSelectedBookingUid: (uid) => {
      set({ selectedBookingUid: uid });
    },
    setBookings: (bookings) => set({ bookings }),
    setCapabilities: (capabilities) => set({ capabilities }),
    clearSelection: () => set({ selectedBookingUid: null }),
    clearPendingSelection: () => set({ pendingSelection: null }),
    setIsTransitioning: (isTransitioning) => set({ isTransitioning }),

    // Core getters
    getSelectedBooking: () => {
      const state = get();
      if (!state.selectedBookingUid) return null;
      return state.bookings.find((booking) => booking.uid === state.selectedBookingUid) ?? null;
    },

    getCurrentIndex: () => {
      const { bookings, selectedBookingUid } = get();
      if (!selectedBookingUid) return -1;
      return bookings.findIndex((b) => b.uid === selectedBookingUid);
    },

    hasNextInArray: () => {
      const { bookings, getCurrentIndex } = get();
      const index = getCurrentIndex();
      return index >= 0 && index < bookings.length - 1;
    },

    hasPreviousInArray: () => {
      const { getCurrentIndex } = get();
      return getCurrentIndex() > 0;
    },

    isFirstInArray: () => get().getCurrentIndex() === 0,

    isLastInArray: () => {
      const { bookings, getCurrentIndex } = get();
      return getCurrentIndex() === bookings.length - 1;
    },

    // Navigation methods
    navigateNext: async () => {
      const state = get();

      // Try navigating within current array first
      if (state.hasNextInArray()) {
        const nextIndex = state.getCurrentIndex() + 1;
        set({ selectedBookingUid: state.bookings[nextIndex].uid });
        return;
      }

      // Need to navigate to next period
      if (!state.capabilities?.canNavigateToNextPeriod()) return;

      // Set pending selection to "first" and mark as transitioning
      set({ isTransitioning: true, pendingSelection: "first" });
      // Trigger page/week change synchronously - the parent component will handle the data fetch
      state.capabilities.requestNextPeriod();
    },

    navigatePrevious: async () => {
      const state = get();

      // Try navigating within current array first
      if (state.hasPreviousInArray()) {
        const prevIndex = state.getCurrentIndex() - 1;
        set({ selectedBookingUid: state.bookings[prevIndex].uid });
        return;
      }

      // Need to navigate to previous period
      if (!state.capabilities?.canNavigateToPreviousPeriod()) {
        return;
      }

      // Set pending selection to "last" and mark as transitioning
      set({ isTransitioning: true, pendingSelection: "last" });
      // Trigger page/week change synchronously - the parent component will handle the data fetch
      state.capabilities.requestPreviousPeriod();
    },
  }));
};

const BookingDetailsSheetStoreContext = React.createContext<BookingDetailsSheetStoreType | null>(null);

export function BookingDetailsSheetStoreProvider({
  children,
  bookings,
  capabilities,
}: {
  children: React.ReactNode;
  bookings: BookingOutput[];
  capabilities?: NavigationCapabilities | null;
}) {
  const [store] = useState(() => createBookingDetailsSheetStore(bookings));
  const [selectedBookingUidFromUrl, setSelectedBookingUidToUrl] = useSelectedBookingUid();
  const previousBookingsRef = useRef<BookingOutput[]>(bookings);

  // Update bookings in store
  useEffect(() => {
    const previousBookings = previousBookingsRef.current;
    const hasBookingsChanged = bookings !== previousBookings;

    if (!hasBookingsChanged) return;

    store.getState().setBookings(bookings);
    previousBookingsRef.current = bookings;
  }, [bookings, store]);

  // Update capabilities when they change
  useEffect(() => {
    store.getState().setCapabilities(capabilities ?? null);
  }, [capabilities, store]);

  // Sync Store → URL
  useEffect(() => {
    const unsubscribe = store.subscribe((state) => {
      const storeUid = state.selectedBookingUid;
      if (storeUid !== selectedBookingUidFromUrl) {
        setSelectedBookingUidToUrl(storeUid);
      }
    });

    return unsubscribe;
  }, [selectedBookingUidFromUrl, setSelectedBookingUidToUrl, store]);

  // Sync URL → Store
  useEffect(() => {
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
