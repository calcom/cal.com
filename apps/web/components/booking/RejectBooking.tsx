import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { RecurringEvent } from "@calcom/types/Calendar";
import { Button, Icon, TextArea } from "@calcom/ui";

type Props = {
  booking: {
    title?: string;
    uid?: string;
    id?: number;
  };
  profile: {
    name: string | null;
    slug: string | null;
  };
  recurringEvent: RecurringEvent | null;
  team?: string | null;
  setIsCancellationMode: (value: boolean) => void;
  theme: string | null;
  allRemainingBookings: boolean;
  seatReferenceUid?: string;
  bookingCancelledEventProps: {
    booking: unknown;
    organizer: {
      name: string;
      email: string;
      timeZone?: string;
    };
    eventType: unknown;
  };
};

export default function CancelBooking(props: Props) {
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const { t } = useLocale();
  const router = useRouter();
  const { booking, allRemainingBookings, seatReferenceUid, bookingCancelledEventProps } = props;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(booking ? null : t("booking_already_cancelled"));

  const mutation = trpc.viewer.bookings.confirm.useMutation({
    onSuccess: (data) => {
      if (data?.status === BookingStatus.REJECTED) {
        showToast(t("booking_rejection_success"), "success");
      } else {
        showToast(t("booking_confirmation_success"), "success");
      }
      utils.viewer.bookings.invalidate();
    },
    onError: () => {
      showToast(t("booking_confirmation_failed"), "error");
      utils.viewer.bookings.invalidate();
    },
  });

  const cancelBookingRef = useCallback((node: HTMLTextAreaElement) => {
    if (node !== null) {
      node.scrollIntoView({ behavior: "smooth" });
      node.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {error && (
        <div className="mt-8">
          <div className="bg-error mx-auto flex h-12 w-12 items-center justify-center rounded-full">
            <Icon name="x" className="h-6 w-6 text-red-600" />
          </div>
          <div className="mt-3 text-center sm:mt-5">
            <h3 className="text-emphasis text-lg font-medium leading-6" id="modal-title">
              {error}
            </h3>
          </div>
        </div>
      )}
      {!error && (
        <div className="mt-5 sm:mt-6">
          <TextArea
            name="rejectionReason"
            label={
              <>
                {t("rejection_reason")}
                <span className="text-subtle font-normal"> (Optional)</span>
              </>
            }
            ref={cancelBookingRef}
            placeholder={t("cancellation_reason_placeholder")}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="mb-4 mt-2 w-full "
            rows={3}
          />
          <div className="flex flex-col-reverse rtl:space-x-reverse ">
            <div className="ml-auto flex w-full space-x-4 ">
              <Button
                className="ml-auto"
                color="secondary"
                onClick={() => props.setIsCancellationMode(false)}>
                {t("nevermind")}
              </Button>
              <Button
                disabled={mutation.isPending}
                data-testid="rejection-confirm"
                onClick={() => {
                  bookingConfirm(false);
                }}>
                {t("rejection_confirmation")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
