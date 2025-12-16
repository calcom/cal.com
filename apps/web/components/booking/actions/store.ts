"use client";

import type React from "react";
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
  isCancelDialogOpen: boolean;

  // Dialog setters
  setRejectionDialogIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setChargeCardDialogIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setViewRecordingsDialogIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setMeetingSessionDetailsDialogIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsNoShowDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsOpenRescheduleDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setIsOpenReassignDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setIsOpenLocationDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setIsOpenAddGuestsDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setIsOpenReportDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setRerouteDialogIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCancelDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
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
    isCancelDialogOpen: false,

    // Dialog setters
    setRejectionDialogIsOpen: (isOpen) =>
      set((state) => ({
        rejectionDialogIsOpen: typeof isOpen === "function" ? isOpen(state.rejectionDialogIsOpen) : isOpen,
      })),
    setChargeCardDialogIsOpen: (isOpen) =>
      set((state) => ({
        chargeCardDialogIsOpen: typeof isOpen === "function" ? isOpen(state.chargeCardDialogIsOpen) : isOpen,
      })),
    setViewRecordingsDialogIsOpen: (isOpen) =>
      set((state) => ({
        viewRecordingsDialogIsOpen:
          typeof isOpen === "function" ? isOpen(state.viewRecordingsDialogIsOpen) : isOpen,
      })),
    setMeetingSessionDetailsDialogIsOpen: (isOpen) =>
      set((state) => ({
        meetingSessionDetailsDialogIsOpen:
          typeof isOpen === "function" ? isOpen(state.meetingSessionDetailsDialogIsOpen) : isOpen,
      })),
    setIsNoShowDialogOpen: (isOpen) =>
      set((state) => ({
        isNoShowDialogOpen: typeof isOpen === "function" ? isOpen(state.isNoShowDialogOpen) : isOpen,
      })),
    setIsOpenRescheduleDialog: (isOpen) =>
      set((state) => ({
        isOpenRescheduleDialog: typeof isOpen === "function" ? isOpen(state.isOpenRescheduleDialog) : isOpen,
      })),
    setIsOpenReassignDialog: (isOpen) =>
      set((state) => ({
        isOpenReassignDialog: typeof isOpen === "function" ? isOpen(state.isOpenReassignDialog) : isOpen,
      })),
    setIsOpenLocationDialog: (isOpen) =>
      set((state) => ({
        isOpenSetLocationDialog:
          typeof isOpen === "function" ? isOpen(state.isOpenSetLocationDialog) : isOpen,
      })),
    setIsOpenAddGuestsDialog: (isOpen) =>
      set((state) => ({
        isOpenAddGuestsDialog: typeof isOpen === "function" ? isOpen(state.isOpenAddGuestsDialog) : isOpen,
      })),
    setIsOpenReportDialog: (isOpen) =>
      set((state) => ({
        isOpenReportDialog: typeof isOpen === "function" ? isOpen(state.isOpenReportDialog) : isOpen,
      })),
    setRerouteDialogIsOpen: (isOpen) =>
      set((state) => ({
        rerouteDialogIsOpen: typeof isOpen === "function" ? isOpen(state.rerouteDialogIsOpen) : isOpen,
      })),
    setIsCancelDialogOpen: (isOpen) =>
      set((state) => ({
        isCancelDialogOpen: typeof isOpen === "function" ? isOpen(state.isCancelDialogOpen) : isOpen,
      })),
  }));
};
