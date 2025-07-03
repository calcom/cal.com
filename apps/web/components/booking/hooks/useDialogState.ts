import type React from "react";
import { useState, useCallback } from "react";

type DialogType =
  | "rejection"
  | "chargeCard"
  | "viewRecordings"
  | "noShow"
  | "reschedule"
  | "reassign"
  | "location"
  | "addGuests"
  | "reroute";

interface DialogState {
  [key: string]: boolean;
}

interface DialogActions {
  openDialog: (dialog: DialogType) => void;
  closeDialog: (dialog: DialogType) => void;
  isDialogOpen: (dialog: DialogType) => boolean;
  closeAllDialogs: () => void;
  getDialogSetter: (dialog: DialogType) => React.Dispatch<React.SetStateAction<boolean>>;
}

export function useDialogState(): [DialogState, DialogActions] {
  const [dialogState, setDialogState] = useState<DialogState>({
    rejection: false,
    chargeCard: false,
    viewRecordings: false,
    noShow: false,
    reschedule: false,
    reassign: false,
    location: false,
    addGuests: false,
    reroute: false,
  });

  const openDialog = useCallback((dialog: DialogType) => {
    setDialogState((prev) => ({ ...prev, [dialog]: true }));
  }, []);

  const closeDialog = useCallback((dialog: DialogType) => {
    setDialogState((prev) => ({ ...prev, [dialog]: false }));
  }, []);

  const isDialogOpen = useCallback(
    (dialog: DialogType) => {
      return dialogState[dialog] || false;
    },
    [dialogState]
  );

  const closeAllDialogs = useCallback(() => {
    setDialogState({
      rejection: false,
      chargeCard: false,
      viewRecordings: false,
      noShow: false,
      reschedule: false,
      reassign: false,
      location: false,
      addGuests: false,
      reroute: false,
    });
  }, []);

  const getDialogSetter = useCallback(
    (dialog: DialogType): React.Dispatch<React.SetStateAction<boolean>> => {
      return (value: React.SetStateAction<boolean>) => {
        const newValue = typeof value === "function" ? value(dialogState[dialog] || false) : value;
        if (newValue) {
          openDialog(dialog);
        } else {
          closeDialog(dialog);
        }
      };
    },
    [dialogState, openDialog, closeDialog]
  );

  return [
    dialogState,
    {
      openDialog,
      closeDialog,
      isDialogOpen,
      closeAllDialogs,
      getDialogSetter,
    },
  ];
}
