"use client";

import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@calid/features/ui/components/dialog";
import React from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";

import type { DeleteDialogState } from "../types/event-types";

interface DeleteEventDialogProps {
  deleteDialog: DeleteDialogState;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export const DeleteEventDialog: React.FC<DeleteEventDialogProps> = ({
  deleteDialog,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  const { t } = useLocale();
  const { open, schedulingType } = deleteDialog;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {schedulingType === SchedulingType.MANAGED ? "Delete Managed Event Type" : "Delete Event Type"}
          </DialogTitle>
          <DialogDescription>
            {schedulingType === SchedulingType.MANAGED ? (
              <ul className="ml-4 mt-2 list-disc">
                <li>This will delete the managed event type and all its instances</li>
                <li>All associated bookings will be cancelled</li>
              </ul>
            ) : (
              "Are you sure you want to delete this event type? This action cannot be undone."
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose />
          <Button color="destructive" onClick={onConfirm} loading={isDeleting}>
            {t("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
