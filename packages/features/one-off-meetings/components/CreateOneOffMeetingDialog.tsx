"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Dialog, DialogContent } from "@calcom/ui/components/dialog";

import { OneOffMeetingCalendarView } from "./OneOffMeetingCalendarView";

interface CreateOneOffMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateOneOffMeetingDialog({ open, onOpenChange, onSuccess }: CreateOneOffMeetingDialogProps) {
  const { t } = useLocale();

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSuccess = () => {
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        type="creation"
        enableOverflow
        className="h-[90vh] max-h-[900px] sm:max-w-[95vw]"
        preventCloseOnOutsideClick>
        <OneOffMeetingCalendarView onSuccess={handleSuccess} onCancel={handleClose} />
      </DialogContent>
    </Dialog>
  );
}
