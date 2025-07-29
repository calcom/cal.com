import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";
import type { ActionType } from "@calcom/ui/components/table";

import type { BookingItemProps } from "./BookingListItem";

export interface BookingActionContext {
  booking: BookingItemProps;
  isUpcoming: boolean;
  isOngoing: boolean;
  isBookingInPast: boolean;
  isCancelled: boolean;
  isConfirmed: boolean;
  isRejected: boolean;
  isPending: boolean;
  isRescheduled: boolean;
  isRecurring: boolean;
  isTabRecurring: boolean;
  isTabUnconfirmed: boolean;
  isBookingFromRoutingForm: boolean;
  isDisabledCancelling: boolean;
  isDisabledRescheduling: boolean;
  isCalVideoLocation: boolean;
  showPendingPayment: boolean;
  cardCharged: boolean;
  attendeeList: Array<{
    name: string;
    email: string;
    id: number;
    noShow: boolean;
    phoneNumber: string | null;
  }>;
  getSeatReferenceUid: () => string | undefined;
  t: (key: string) => string;
}

export function getPendingActions(context: BookingActionContext): ActionType[] {
  const { booking, isPending, isTabRecurring, isTabUnconfirmed, isRecurring, showPendingPayment, t } =
    context;

  const actions: ActionType[] = [
    {
      id: "reject",
      label: (isTabRecurring || isTabUnconfirmed) && isRecurring ? t("reject_all") : t("reject"),
      icon: "ban",
      disabled: false, // This would be controlled by mutation state in the component
    },
  ];

  // For bookings with payment, only confirm if the booking is paid for
  // Original logic: (isPending && !paymentAppData.enabled) || (paymentAppData.enabled && !!paymentAppData.price && booking.paid)
  if ((isPending && !showPendingPayment) || (showPendingPayment && booking.paid)) {
    actions.push({
      id: "confirm",
      bookingId: booking.id,
      label: (isTabRecurring || isTabUnconfirmed) && isRecurring ? t("confirm_all") : t("confirm"),
      icon: "check" as const,
      disabled: false, // This would be controlled by mutation state in the component
    });
  }

  return actions;
}

export function getCancelEventAction(context: BookingActionContext): ActionType {
  const { booking, isTabRecurring, isRecurring, getSeatReferenceUid, t } = context;

  return {
    id: "cancel",
    label: isTabRecurring && isRecurring ? t("cancel_all_remaining") : t("cancel_event"),
    href: `/booking/${booking.uid}?cancel=true${
      isTabRecurring && isRecurring ? "&allRemainingBookings=true" : ""
    }${booking.seatsReferences.length ? `&seatReferenceUid=${getSeatReferenceUid()}` : ""}`,
    icon: "circle-x",
    color: "destructive",
    disabled: isActionDisabled("cancel", context),
  };
}

export function getVideoOptionsActions(context: BookingActionContext): ActionType[] {
  const { booking, isBookingInPast, isConfirmed, isCalVideoLocation, t } = context;

  return [
    {
      id: "view_recordings",
      label: t("view_recordings"),
      icon: "video",
      disabled: !(isBookingInPast && isConfirmed && isCalVideoLocation && booking.isRecorded),
    },
    {
      id: "meeting_session_details",
      label: t("view_session_details"),
      icon: "info",
      disabled: !(isBookingInPast && isConfirmed && isCalVideoLocation),
    },
  ];
}

export function getEditEventActions(context: BookingActionContext): ActionType[] {
  const {
    booking,
    isBookingInPast,
    isDisabledRescheduling,
    isBookingFromRoutingForm,
    getSeatReferenceUid,
    t,
  } = context;

  const actions: (ActionType | null)[] = [
    {
      id: "reschedule",
      icon: "clock",
      label: t("reschedule_booking"),
      href: `/reschedule/${booking.uid}${
        booking.seatsReferences.length ? `?seatReferenceUid=${getSeatReferenceUid()}` : ""
      }`,
      disabled:
        (isBookingInPast && !booking.eventType.allowReschedulingPastBookings) || isDisabledRescheduling,
    },
    {
      id: "reschedule_request",
      icon: "send",
      iconClassName: "rotate-45 w-[16px] -translate-x-0.5 ",
      label: t("send_reschedule_request"),
      disabled:
        (isBookingInPast && !booking.eventType.allowReschedulingPastBookings) || isDisabledRescheduling,
    },
    isBookingFromRoutingForm
      ? {
          id: "reroute",
          label: t("reroute"),
          icon: "waypoints",
          disabled: false,
        }
      : null,
    {
      id: "change_location",
      label: t("edit_location"),
      icon: "map-pin",
      disabled: false,
    },
    booking.eventType?.disableGuests
      ? null
      : {
          id: "add_members",
          label: t("additional_guests"),
          icon: "user-plus",
          disabled: false,
        },
    // Reassign (if round robin)
    booking.eventType.schedulingType === SchedulingType.ROUND_ROBIN
      ? {
          id: "reassign",
          label: t("reassign"),
          icon: "users",
          disabled: false,
        }
      : null,
  ];

  return actions.filter(Boolean) as ActionType[];
}

export function getAfterEventActions(context: BookingActionContext): ActionType[] {
  const { booking, cardCharged, attendeeList, t } = context;

  const actions: (ActionType | null)[] = [
    ...getVideoOptionsActions(context),
    booking.status === BookingStatus.ACCEPTED && booking.paid && booking.payment[0]?.paymentOption === "HOLD"
      ? {
          id: "charge_card",
          label: cardCharged ? t("no_show_fee_charged") : t("collect_no_show_fee"),
          icon: "credit-card",
          disabled: cardCharged,
        }
      : null,
    {
      id: "no_show",
      label:
        attendeeList.length === 1 && attendeeList[0].noShow ? t("unmark_as_no_show") : t("mark_as_no_show"),
      icon: attendeeList.length === 1 && attendeeList[0].noShow ? "eye" : "eye-off",
      disabled: false, // This would be controlled by booking state in the component
    },
  ];

  return actions.filter(Boolean) as ActionType[];
}

export function shouldShowPendingActions(context: BookingActionContext): boolean {
  const { isPending, isUpcoming, isCancelled } = context;
  return isPending && isUpcoming && !isCancelled;
}

export function shouldShowEditActions(context: BookingActionContext): boolean {
  const { isPending, isTabRecurring, isRecurring, isCancelled } = context;
  return !isPending && !(isTabRecurring && isRecurring) && !isCancelled;
}

export function shouldShowRecurringCancelAction(context: BookingActionContext): boolean {
  const { isTabRecurring, isRecurring } = context;
  return isTabRecurring && isRecurring;
}

export function isActionDisabled(actionId: string, context: BookingActionContext): boolean {
  const { booking, isBookingInPast, isDisabledRescheduling, isDisabledCancelling, isPending, isConfirmed } =
    context;

  switch (actionId) {
    case "reschedule":
    case "reschedule_request":
      return (isBookingInPast && !booking.eventType.allowReschedulingPastBookings) || isDisabledRescheduling;
    case "cancel":
      return isDisabledCancelling || (isBookingInPast && isPending && !isConfirmed);
    case "view_recordings":
      return !(isBookingInPast && booking.status === BookingStatus.ACCEPTED && context.isCalVideoLocation);
    case "meeting_session_details":
      return !(isBookingInPast && booking.status === BookingStatus.ACCEPTED && context.isCalVideoLocation);
    case "charge_card":
      return context.cardCharged;
    default:
      return false;
  }
}

export function getActionLabel(actionId: string, context: BookingActionContext): string {
  const { booking, isTabRecurring, isRecurring, attendeeList, cardCharged, t } = context;

  switch (actionId) {
    case "reject":
      return (isTabRecurring || context.isTabUnconfirmed) && isRecurring ? t("reject_all") : t("reject");
    case "confirm":
      return (isTabRecurring || context.isTabUnconfirmed) && isRecurring ? t("confirm_all") : t("confirm");
    case "cancel":
      return isTabRecurring && isRecurring ? t("cancel_all_remaining") : t("cancel_event");
    case "no_show":
      return attendeeList.length === 1 && attendeeList[0].noShow
        ? t("unmark_as_no_show")
        : t("mark_as_no_show");
    case "charge_card":
      return cardCharged ? t("no_show_fee_charged") : t("collect_no_show_fee");
    default:
      return t(actionId);
  }
}
