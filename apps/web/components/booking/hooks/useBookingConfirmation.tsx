import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookingStatus } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";
import { TextAreaField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

interface UseBookingConfirmationOptions {
  isRecurring?: boolean;
  isTabRecurring?: boolean;
  isTabUnconfirmed?: boolean;
}

export function useBookingConfirmation(options: UseBookingConfirmationOptions = {}) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [rejectionDialogIsOpen, setRejectionDialogIsOpen] = useState(false);

  const { isRecurring = false, isTabRecurring = false, isTabUnconfirmed = false } = options;

  const mutation = trpc.viewer.bookings.confirm.useMutation({
    onSuccess: (data) => {
      if (data?.status === BookingStatus.REJECTED) {
        setRejectionDialogIsOpen(false);
        showToast(t("booking_rejection_success"), "success");
      } else {
        showToast(t("booking_confirmation_success"), "success");
      }
      utils.viewer.bookings.invalidate();
      utils.viewer.me.bookingUnconfirmedCount.invalidate();
    },
    onError: () => {
      showToast(t("booking_confirmation_failed"), "error");
      utils.viewer.bookings.invalidate();
    },
  });

  const bookingConfirm = (bookingId: number, confirmed: boolean, recurringEventId?: string | null) => {
    let body = {
      bookingId,
      confirmed,
      reason: rejectionReason,
    };

    /**
     * Only pass down the recurring event id when we need to confirm the entire series, which happens in
     * the "Recurring" tab and "Unconfirmed" tab, to support confirming discretionally in the "Recurring" tab.
     */
    if ((isTabRecurring || isTabUnconfirmed) && isRecurring && recurringEventId) {
      body = Object.assign({}, body, { recurringEventId });
    }

    mutation.mutate(body);
  };

  const handleReject = () => {
    setRejectionDialogIsOpen(true);
  };

  const RejectionDialog = ({
    bookingId,
    recurringEventId,
  }: {
    bookingId: number;
    recurringEventId?: string | null;
  }) => (
    <DialogContent title={t("rejection_reason_title")} description={t("rejection_reason_description")}>
      <div>
        <TextAreaField
          name="rejectionReason"
          label={
            <>
              {t("rejection_reason")}
              <span className="text-subtle font-normal"> (Optional)</span>
            </>
          }
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
        />
      </div>

      <DialogFooter>
        <DialogClose />
        <Button
          disabled={mutation.isPending}
          data-testid="rejection-confirm"
          onClick={() => {
            bookingConfirm(bookingId, false, recurringEventId);
          }}>
          {t("rejection_confirmation")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  return {
    bookingConfirm,
    handleReject,
    rejectionReason,
    setRejectionReason,
    rejectionDialogIsOpen,
    setRejectionDialogIsOpen,
    isPending: mutation.isPending,
    RejectionDialog,
  };
}
