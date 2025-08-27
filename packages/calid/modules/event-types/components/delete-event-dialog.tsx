"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  Button,
} from "@calid/features/ui";
import React from "react";

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
          <DialogClose asChild>
            <Button color="secondary">Cancel</Button>
          </DialogClose>
          <Button color="destructive" onClick={onConfirm} loading={isDeleting}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
