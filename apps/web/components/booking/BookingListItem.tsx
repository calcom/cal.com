import React, { useState } from "react";
import Link from "next/link";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import dayjs from "@calcom/dayjs";
import classNames from "@calcom/lib/classNames";
import {
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  showToast,
  TableActions,
  TextAreaField,
  Tooltip,
} from "@calcom/ui";
import { Ban, Check, Clock, CreditCard, MapPin, RefreshCcw, Send, X } from "@calcom/ui/components/icon";
import { ChargeCardDialog } from "@components/dialog/ChargeCardDialog";
import { EditLocationDialog } from "@components/dialog/EditLocationDialog";
import { RescheduleDialog } from "@components/dialog/RescheduleDialog";

import {
  formatTime,
  getEventLocationType,
  getEveryFreqFor,
  getSuccessPageLocationMessage,
  guessEventLocationType,
} from "@calcom/app-store/locations";

import { getPaymentAppData } from "@calcom/lib/getPaymentAppData";
import { useBookerUrl } from "@calcom/lib/hooks/useBookerUrl";

import type { ActionType } from "@calcom/ui";
import type { BookingItemProps } from "./types"; // replace with the actual path

const BookingListItem = ({ booking, listingStatus, recurringInfo, loggedInUser }: BookingItemProps) => {
  const bookerUrl = useBookerUrl();
  const { userId, userTimeZone, userTimeFormat, userEmail } = loggedInUser;

  const { t, i18n } = useLocale();
  const utils = trpc.useContext();
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [rejectionDialogIsOpen, setRejectionDialogIsOpen] = useState(false);
  const [chargeCardDialogIsOpen, setChargeCardDialogIsOpen] = useState(false);
  const [viewRecordingsDialogIsOpen, setViewRecordingsDialogIsOpen] = useState<boolean>(false);

  const cardCharged = booking?.payment[0]?.success;
  const mutation = trpc.viewer.bookings.confirm.useMutation({
    onSuccess: (data) => {
      const successMessage = data?.status === "REJECTED" ? "booking_rejection_success" : "booking_confirmation_success";
      showToast(t(successMessage), "success");
      utils.viewer.bookings.invalidate();
    },
    onError: () => {
      showToast(t("booking_confirmation_failed"), "error");
      utils.viewer.bookings.invalidate();
    },
  });

  const isUpcoming = new Date(booking.endTime) >= new Date();
  const isPast = new Date(booking.endTime) < new Date();
  const isCancelled = booking.status === "CANCELLED";
  const isConfirmed = booking.status === "ACCEPTED";
  const isRejected = booking.status === "REJECTED";
  const isPending = booking.status === "PENDING";
  const isRecurring = booking.recurringEventId !== null;
  const isTabRecurring = listingStatus === "recurring";
  const isTabUnconfirmed = listingStatus === "unconfirmed";

  const paymentAppData = getPaymentAppData(booking.eventType);

  const location = booking.location as ReturnType<typeof getEventLocationValue>;
  const locationVideoCallUrl = bookingMetadataSchema.parse(booking?.metadata || {})?.videoCallUrl;

  const locationToDisplay = getSuccessPageLocationMessage(
    locationVideoCallUrl ? locationVideoCallUrl : location,
    t,
    booking.status
  );
  const provider = guessEventLocationType(location);

  const bookingConfirm = async (confirm: boolean) => {
    let body = {
      bookingId: booking.id,
      confirmed: confirm,
      reason: rejectionReason,
    };

    if ((isTabRecurring || isTabUnconfirmed) && isRecurring) {
      body = { ...body, recurringEventId: booking.recurringEventId };
    }

    mutation.mutate(body);
  };

  const getSeatReferenceUid = () => booking.seatsReferences[0]?.referenceUid;

  const pendingActions: ActionType[] = [
    {
      id: "reject",
      label: (isTabRecurring || isTabUnconfirmed) && isRecurring ? t("reject_all") : t("reject"),
      onClick: () => setRejectionDialogIsOpen(true),
      icon: Ban,
      disabled: mutation.isPending,
    },
    ...((isPending && !paymentAppData.enabled) ||
    (paymentAppData.enabled && !!paymentAppData.price && booking.paid)
      ? [
          {
            id: "confirm",
            bookingId: booking.id,
            label: (isTabRecurring || isTabUnconfirmed) && isRecurring ? t("confirm_all") : t("confirm"),
            onClick: () => bookingConfirm(true),
            icon: Check,
            disabled: mutation.isPending,
          },
        ]
      : []),
  ];

  let bookedActions: ActionType[] = [
    {
      id: "cancel",
      label: isTabRecurring && isRecurring ? t("cancel_all_remaining") : t("cancel"),
      href: `/booking/${booking.uid}?cancel=true${isTabRecurring && isRecurring ? "&allRemainingBookings=true" : ""}${
        booking.seatsReferences.length ? `&seatReferenceUid=${getSeatReferenceUid()}` : ""
      }`,
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
          onClick: () => setIsOpenRescheduleDialog(true),
        },
        {
          id: "change_location",
          label: t("edit_location"),
          onClick: () => setIsOpenLocationDialog(true),
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
      onClick: () => setChargeCardDialogIsOpen(true),
      icon: CreditCard,
    },
  ];

  if (isTabRecurring && isRecurring) {
    bookedActions = bookedActions.filter((action) => action.id !== "edit_booking");
  }

  if (isPast && isPending && !isConfirmed) {
    bookedActions = bookedActions.filter((action) => action.id !== "cancel");
  }

  const RequestSentMessage = () => (
    <Badge startIcon={Send} size="md" variant="gray" data-testid="request_reschedule_sent">
      {t("request_sent")}
    </Badge>
  );

  return (
    <div>
      <Dialog isOpen={rejectionDialogIsOpen} onDismiss={() => setRejectionDialogIsOpen(false)}>
        <DialogContent>
          <DialogClose onClick={() => setRejectionDialogIsOpen(false)} />
          <div className="text-2xl font-bold mb-8">{t("reject_booking")}</div>
          <TextAreaField
            label={t("reject_reason")}
            onChange={(e) => setRejectionReason(e.target.value)}
            value={rejectionReason}
            maxLength={500}
          />
        </DialogContent>
        <DialogFooter>
          <Button onClick={() => setRejectionDialogIsOpen(false)}>{t("cancel")}</Button>
          <Button onClick={() => bookingConfirm(false)} variant="primary" loading={mutation.isPending}>
            {t("reject")}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog isOpen={chargeCardDialogIsOpen} onDismiss={() => setChargeCardDialogIsOpen(false)}>
        <DialogContent>
          <DialogClose onClick={() => setChargeCardDialogIsOpen(false)} />
          <ChargeCardDialog booking={booking} onClose={() => setChargeCardDialogIsOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Add your other dialogs here */}

      <Dialog isOpen={viewRecordingsDialogIsOpen} onDismiss={() => setViewRecordingsDialogIsOpen(false)}>
        {/* Add your content for view recordings dialog */}
      </Dialog>

      {/* Add your other dialogs here */}

      <TableActions
        id={booking.id}
        actions={
          isPending
            ? pendingActions
            : [
                ...bookedActions,
                ...chargeCardActions,
                {
                  id: "view_recordings",
                  label: t("view_recordings"),
                  onClick: () => setViewRecordingsDialogIsOpen(true),
                  disabled: !booking?.recordingURLs?.length,
                  tooltip: !booking?.recordingURLs?.length && t("no_recordings"),
                },
              ]
        }
      />

      {/* Your existing code for rendering booking information */}
    </div>
  );
};

export default BookingListItem;
