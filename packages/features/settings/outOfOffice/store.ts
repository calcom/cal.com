"use client";

import { createWithEqualityFn } from "zustand/traditional";

import type { BookingRedirectForm } from "./CreateOrEditOutOfOfficeModal";

export type OutOfOfficeModalStore = {
  /**
   * Whether the modal is currently open
   */
  isOpen: boolean;
  /**
   * Current entry being edited, or null for creating a new entry
   */
  currentEntry: BookingRedirectForm | null;
  /**
   * Open the modal for creating a new entry
   */
  openForCreate: () => void;
  /**
   * Open the modal for editing an existing entry
   */
  openForEdit: (entry: BookingRedirectForm) => void;
  /**
   * Close the modal and reset state
   */
  close: () => void;
};

/**
 * Global store for Out of Office modal state.
 * This persists across component remounts caused by navigation.
 */
export const useOutOfOfficeModalStore = createWithEqualityFn<OutOfOfficeModalStore>((set) => ({
  isOpen: false,
  currentEntry: null,
  openForCreate: () => set({ isOpen: true, currentEntry: null }),
  openForEdit: (entry: BookingRedirectForm) => set({ isOpen: true, currentEntry: entry }),
  close: () => set({ isOpen: false, currentEntry: null }),
}));
