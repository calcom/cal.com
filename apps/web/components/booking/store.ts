"use client";

import { createStore } from "zustand";

export type BookingActionsStore = {
  // Dialog states
  rejectionDialogIsOpen: boolean;
  chargeCardDialogIsOpen: boolean;
  viewRecordingsDialogIsOpen: boolean;
  meetingSessionDetailsDialogIsOpen: boolean;
  isNoShowDialogOpen: boolean;
  isOpenRescheduleDialog: boolean;
  isOpenReassignDialog: boolean;
  isOpenSetLocationDialog: boolean;
  isOpenAddGuestsDialog: boolean;
  isOpenReportDialog: boolean;
  rerouteDialogIsOpen: boolean;

  // Dialog setters
  setRejectionDialogIsOpen: (isOpen: boolean) => void;
  setChargeCardDialogIsOpen: (isOpen: boolean) => void;
  setViewRecordingsDialogIsOpen: (isOpen: boolean) => void;
  setMeetingSessionDetailsDialogIsOpen: (isOpen: boolean) => void;
  setIsNoShowDialogOpen: (isOpen: boolean) => void;
  setIsOpenRescheduleDialog: (isOpen: boolean) => void;
  setIsOpenReassignDialog: (isOpen: boolean) => void;
  setIsOpenLocationDialog: (isOpen: boolean) => void;
  setIsOpenAddGuestsDialog: (isOpen: boolean) => void;
  setIsOpenReportDialog: (isOpen: boolean) => void;
  setRerouteDialogIsOpen: (isOpen: boolean) => void;

  // Rejection reason state
  rejectionReason: string;
  setRejectionReason: (reason: string) => void;
};

export const createBookingActionsStore = () => {
  return createStore<BookingActionsStore>((set) => ({
    // Initial dialog states
    rejectionDialogIsOpen: false,
    chargeCardDialogIsOpen: false,
    viewRecordingsDialogIsOpen: false,
    meetingSessionDetailsDialogIsOpen: false,
    isNoShowDialogOpen: false,
    isOpenRescheduleDialog: false,
    isOpenReassignDialog: false,
    isOpenSetLocationDialog: false,
    isOpenAddGuestsDialog: false,
    isOpenReportDialog: false,
    rerouteDialogIsOpen: false,

    // Dialog setters
    setRejectionDialogIsOpen: (isOpen: boolean) => set({ rejectionDialogIsOpen: isOpen }),
    setChargeCardDialogIsOpen: (isOpen: boolean) => set({ chargeCardDialogIsOpen: isOpen }),
    setViewRecordingsDialogIsOpen: (isOpen: boolean) => set({ viewRecordingsDialogIsOpen: isOpen }),
    setMeetingSessionDetailsDialogIsOpen: (isOpen: boolean) =>
      set({ meetingSessionDetailsDialogIsOpen: isOpen }),
    setIsNoShowDialogOpen: (isOpen: boolean) => set({ isNoShowDialogOpen: isOpen }),
    setIsOpenRescheduleDialog: (isOpen: boolean) => set({ isOpenRescheduleDialog: isOpen }),
    setIsOpenReassignDialog: (isOpen: boolean) => set({ isOpenReassignDialog: isOpen }),
    setIsOpenLocationDialog: (isOpen: boolean) => set({ isOpenSetLocationDialog: isOpen }),
    setIsOpenAddGuestsDialog: (isOpen: boolean) => set({ isOpenAddGuestsDialog: isOpen }),
    setIsOpenReportDialog: (isOpen: boolean) => set({ isOpenReportDialog: isOpen }),
    setRerouteDialogIsOpen: (isOpen: boolean) => set({ rerouteDialogIsOpen: isOpen }),

    // Rejection reason state
    rejectionReason: "",
    setRejectionReason: (reason: string) => set({ rejectionReason: reason }),
  }));
};
