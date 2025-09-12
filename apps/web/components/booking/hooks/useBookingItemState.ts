import { useState } from "react";

export type DialogState = {
  reschedule: boolean;
  reassign: boolean;
  editLocation: boolean;
  addGuests: boolean;
  chargeCard: boolean;
  viewRecordings: boolean;
  meetingSessionDetails: boolean;
  noShowAttendees: boolean;
  rejection: boolean;
  reroute: boolean;
};

export function useBookingItemState() {
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [dialogState, setDialogState] = useState<DialogState>({
    reschedule: false,
    reassign: false,
    editLocation: false,
    addGuests: false,
    chargeCard: false,
    viewRecordings: false,
    meetingSessionDetails: false,
    noShowAttendees: false,
    rejection: false,
    reroute: false,
  });

  const openDialog = (dialog: keyof DialogState) => {
    setDialogState((prevState) => ({
      ...prevState,
      [dialog]: true,
    }));
  };

  const closeDialog = (dialog: keyof DialogState) => {
    setDialogState((prevState) => ({
      ...prevState,
      [dialog]: false,
    }));
  };

  const toggleDialog = (dialog: keyof DialogState) => {
    setDialogState((prevState) => ({
      ...prevState,
      [dialog]: !prevState[dialog],
    }));
  };

  // Helper function to reset all dialogs (useful when one action should close others)
  const resetDialogs = () => {
    setDialogState({
      reschedule: false,
      reassign: false,
      editLocation: false,
      addGuests: false,
      chargeCard: false,
      viewRecordings: false,
      meetingSessionDetails: false,
      noShowAttendees: false,
      rejection: false,
      reroute: false,
    });
  };

  return {
    dialogState,
    openDialog,
    closeDialog,
    toggleDialog,
    resetDialogs,
    rejectionReason,
    setRejectionReason,
  };
}
