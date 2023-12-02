import { useState } from "react";

import getPaymentAppData from "@calcom/lib/getPaymentAppData";
import { useBookerUrl } from "@calcom/lib/hooks/useBookerUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookingStatus } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { ActionType } from "@calcom/ui";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  showToast,
  TableActions,
  TextAreaField,
} from "@calcom/ui";
import { Ban, Check, Clock, CreditCard, MapPin, Send, X } from "@calcom/ui/components/icon";

import type { BookingItemProps } from "@components/booking/BookingListItem";
import RescheduleRequestSentBadge from "@components/booking/RescheduleRequestSentBadge";

interface BookingListItemActionsProps {
  booking: BookingItemProps;
  setChargeCardDialogIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setViewRecordingsDialogIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsOpenRescheduleDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setIsOpenLocationDialog: React.Dispatch<React.SetStateAction<boolean>>;
  showViewRecordingsButton: boolean;
  showCheckRecordingButton: boolean;
}

export function computeBookingFlags(booking: BookingItemProps) {
  return {
    isUpcoming: new Date(booking.endTime) >= new Date(),
    isPast: new Date(booking.endTime) < new Date(),
    isCancelled: booking.status === BookingStatus.CANCELLED,
    isConfirmed: booking.status === BookingStatus.ACCEPTED,
    isRejected: booking.status === BookingStatus.REJECTED,
    isPending: booking.status === BookingStatus.PENDING,
    isRecurring: booking.recurringEventId !== null,
    isTabRecurring: booking.listingStatus === "recurring",
    isTabUnconfirmed: booking.listingStatus === "unconfirmed",
  };
}

function BookingListItemActions({
  booking,
  setChargeCardDialogIsOpen,
  setViewRecordingsDialogIsOpen,
  setIsOpenRescheduleDialog,
  setIsOpenLocationDialog,
  showViewRecordingsButton,
  showCheckRecordingButton,
}: BookingListItemActionsProps) {
  const bookerUrl = useBookerUrl();
  const { userId } = booking.loggedInUser;

  const { t } = useLocale();
  const utils = trpc.useContext();
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [rejectionDialogIsOpen, setRejectionDialogIsOpen] = useState(false);
  const cardCharged = booking?.payment[0]?.success;
  const mutation = trpc.viewer.bookings.confirm.useMutation({
    onSuccess: (data) => {
      if (data?.status === BookingStatus.REJECTED) {
        setRejectionDialogIsOpen(false);
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

  const {
    isUpcoming,
    isPast,
    isCancelled,
    isConfirmed,
    isRejected,
    isPending,
    isRecurring,
    isTabRecurring,
    isTabUnconfirmed,
  } = computeBookingFlags(booking);

  const paymentAppData = getPaymentAppData(booking.eventType);

  const bookingConfirm = async (confirm: boolean) => {
    let body = {
      bookingId: booking.id,
      confirmed: confirm,
      reason: rejectionReason,
    };
    /**
     * Only pass down the recurring event id when we need to confirm the entire series, which happens in
     * the "Recurring" tab and "Unconfirmed" tab, to support confirming discretionally in the "Recurring" tab.
     */
    if ((isTabRecurring || isTabUnconfirmed) && isRecurring) {
      body = Object.assign({}, body, { recurringEventId: booking.recurringEventId });
    }
    mutation.mutate(body);
  };

  const getSeatReferenceUid = () => {
    if (!booking.seatsReferences[0]) {
      return undefined;
    }
    return booking.seatsReferences[0].referenceUid;
  };

  const pendingActions: ActionType[] = [
    {
      id: "reject",
      label: (isTabRecurring || isTabUnconfirmed) && isRecurring ? t("reject_all") : t("reject"),
      onClick: () => {
        setRejectionDialogIsOpen(true);
      },
      icon: Ban,
      disabled: mutation.isLoading,
    },
    // For bookings with payment, only confirm if the booking is paid for
    ...((isPending && !paymentAppData.enabled) ||
    (paymentAppData.enabled && !!paymentAppData.price && booking.paid)
      ? [
          {
            id: "confirm",
            label: (isTabRecurring || isTabUnconfirmed) && isRecurring ? t("confirm_all") : t("confirm"),
            onClick: () => {
              bookingConfirm(true);
            },
            icon: Check,
            disabled: mutation.isLoading,
          },
        ]
      : []),
  ];

  let bookedActions: ActionType[] = [
    {
      id: "cancel",
      label: isTabRecurring && isRecurring ? t("cancel_all_remaining") : t("cancel"),
      /* When cancelling we need to let the UI and the API know if the intention is to
               cancel all remaining bookings or just that booking instance. */
      href: `/booking/${booking.uid}?cancel=true${
        isTabRecurring && isRecurring ? "&allRemainingBookings=true" : ""
      }${booking.seatsReferences.length ? `&seatReferenceUid=${getSeatReferenceUid()}` : ""}
      `,
      icon: X,
    },
    {
      id: "edit_booking",
      label: t("edit"),
      actions: [
        {
          id: "reschedule",
          icon: Clock,
          label: t("reschedule_booking"),
          href: `${bookerUrl}/reschedule/${booking.uid}${
            booking.seatsReferences.length ? `?seatReferenceUid=${getSeatReferenceUid()}` : ""
          }`,
        },
        {
          id: "reschedule_request",
          icon: Send,
          iconClassName: "rotate-45 w-[16px] -translate-x-0.5 ",
          label: t("send_reschedule_request"),
          onClick: () => {
            setIsOpenRescheduleDialog(true);
          },
        },
        {
          id: "change_location",
          label: t("edit_location"),
          onClick: () => {
            setIsOpenLocationDialog(true);
          },
          icon: MapPin,
        },
      ],
    },
  ];

  const chargeCardActions: ActionType[] = [
    {
      id: "charge_card",
      label: cardCharged ? t("no_show_fee_charged") : t("collect_no_show_fee"),
      disabled: cardCharged,
      onClick: () => {
        setChargeCardDialogIsOpen(true);
      },
      icon: CreditCard,
    },
  ];

  if (isTabRecurring && isRecurring) {
    bookedActions = bookedActions.filter((action) => action.id !== "edit_booking");
  }

  if (isPast && isPending && !isConfirmed) {
    bookedActions = bookedActions.filter((action) => action.id !== "cancel");
  }

  const showRecordingActions: ActionType[] = [
    {
      id: "view_recordings",
      label: showCheckRecordingButton ? t("check_for_recordings") : t("view_recordings"),
      onClick: () => {
        setViewRecordingsDialogIsOpen(true);
      },
      color: showCheckRecordingButton ? "secondary" : "primary",
      disabled: mutation.isLoading,
    },
  ];

  return (
    <>
      {/* NOTE: Should refactor this dialog component as is being rendered multiple times */}
      <Dialog open={rejectionDialogIsOpen} onOpenChange={setRejectionDialogIsOpen}>
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
              disabled={mutation.isLoading}
              data-testid="rejection-confirm"
              onClick={() => {
                bookingConfirm(false);
              }}>
              {t("rejection_confirmation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <td className="flex w-full justify-end py-4 pl-4 text-right text-sm font-medium ltr:pr-4 rtl:pl-4 sm:pl-0">
        {isUpcoming && !isCancelled ? (
          <>
            {isPending && userId === booking.user?.id && <TableActions actions={pendingActions} />}
            {isConfirmed && <TableActions actions={bookedActions} />}
            {isRejected && <div className="text-subtle text-sm">{t("rejected")}</div>}
          </>
        ) : null}
        {isPast && isPending && !isConfirmed ? <TableActions actions={bookedActions} /> : null}
        {(showViewRecordingsButton || showCheckRecordingButton) && (
          <TableActions actions={showRecordingActions} />
        )}
        {isCancelled && booking.rescheduled && (
          <div className="hidden h-full items-center md:flex">
            <RescheduleRequestSentBadge />
          </div>
        )}
        {booking.status === "ACCEPTED" && booking.paid && booking.payment[0]?.paymentOption === "HOLD" && (
          <div className="ml-2">
            <TableActions actions={chargeCardActions} />
          </div>
        )}
      </td>
    </>
  );
}

export default BookingListItemActions;
