import { useCallback, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, TextArea } from "@calcom/ui";

type Props = {
  booking: {
    uid?: string | null;
    id: number;
    recurringEventId: string | null;
  };
  setIsRejectionMode: () => void;
};

export default function RejectBooking(props: Props) {
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const { booking } = props;
  const isRecurring = booking.recurringEventId !== null;

  const mutation = trpc.viewer.bookings.confirm.useMutation({
    onSuccess: () => {
      props.setIsRejectionMode();
      utils.viewer.bookings.invalidate();
    },
    onError: () => {
      utils.viewer.bookings.invalidate();
    },
  });

  const bookingConfirm = async (confirm: boolean) => {
    let body = {
      bookingId: booking.id,
      confirmed: confirm,
      reason: rejectionReason,
    };
    if (isRecurring) {
      body = Object.assign({}, body, { recurringEventId: booking.recurringEventId });
    }
    mutation.mutate(body);
  };

  const rejectBookingRef = useCallback((node: HTMLTextAreaElement) => {
    if (node !== null) {
      node.scrollIntoView({ behavior: "smooth" });
      node.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="mt-5 sm:mt-6">
        <label className="text-default font-medium">
          <>
            {t("rejection_reason")}
            <span className="text-subtle font-normal"> (Optional)</span>
          </>
        </label>
        <TextArea
          ref={rejectBookingRef}
          placeholder={t("rejection_reason_placeholder")}
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          className="mb-4 mt-2 w-full "
          rows={3}
        />
        <div className="flex flex-col-reverse rtl:space-x-reverse ">
          <div className="ml-auto flex w-full space-x-4 ">
            <Button className="ml-auto" color="secondary" onClick={() => props.setIsRejectionMode()}>
              {t("nevermind")}
            </Button>
            <Button
              loading={mutation.isPending}
              data-testid="rejection-confirm"
              onClick={() => {
                bookingConfirm(false);
              }}>
              {t("rejection_confirmation")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
