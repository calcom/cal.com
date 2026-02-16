import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookingStatus } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

interface UseBookingConfirmationOptions {
  isRecurring?: boolean;
  isTabRecurring?: boolean;
  isTabUnconfirmed?: boolean;
}

interface BookingConfirmParams {
  bookingId: number;
  confirmed: boolean;
  recurringEventId?: string | null;
  reason?: string;
  seatReferenceUid?: string;
}

export function useBookingConfirmation(options: UseBookingConfirmationOptions = {}) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
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
    onError: (error) => {
      showToast(error.message || t("booking_confirmation_failed"), "error");
      utils.viewer.bookings.invalidate();
    },
  });

  const bookingConfirm = ({ bookingId, confirmed, recurringEventId, reason, seatReferenceUid }: BookingConfirmParams) => {
    const body: {
      bookingId: number;
      confirmed: boolean;
      reason: string;
      recurringEventId?: string;
      seatReferenceUid?: string;
    } = {
      bookingId,
      confirmed,
      reason: reason || "",
    };

    if ((isTabRecurring || isTabUnconfirmed) && isRecurring && recurringEventId) {
      body.recurringEventId = recurringEventId;
    }

    if (seatReferenceUid) {
      body.seatReferenceUid = seatReferenceUid;
    }

    mutation.mutate(body);
  };

  const handleReject = () => {
    setRejectionDialogIsOpen(true);
  };

  return {
    bookingConfirm,
    handleReject,
    rejectionDialogIsOpen,
    setRejectionDialogIsOpen,
    isPending: mutation.isPending,
  };
}
