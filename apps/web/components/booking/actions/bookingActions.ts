import { isWithinMinimumRescheduleNotice } from "@calcom/features/bookings/lib/reschedule/isWithinMinimumRescheduleNotice";
import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";
import type { ActionType } from "@calcom/ui/components/table";

import type { BookingItemProps } from "../types";

interface BookingActionContext {
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
  isAttendee: boolean;
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

function getConfirmLabel(
  isTabRecurring: boolean,
  isTabUnconfirmed: boolean,
  isRecurring: boolean,
  t: (key: string) => string
): string {
  if ((isTabRecurring || isTabUnconfirmed) && isRecurring) {
    return t("confirm_all");
  }
  return t("confirm");
}

function getRejectLabel(
  isTabRecurring: boolean,
  isTabUnconfirmed: boolean,
  isRecurring: boolean,
  t: (key: string) => string
): string {
  if ((isTabRecurring || isTabUnconfirmed) && isRecurring) {
    return t("reject_all");
  }
  return t("reject");
}

function getCancelLabel(
  isTabRecurring: boolean,
  isRecurring: boolean,
  t: (key: string) => string
): string {
  if (isTabRecurring && isRecurring) {
    return t("cancel_all_remaining");
  }
  return t("cancel_event");
}

function getNoShowLabel(
  attendeeList: Array<{ noShow: boolean }>,
  t: (key: string) => string
): string {
  if (attendeeList.length === 1 && attendeeList[0].noShow) {
    return t("unmark_as_no_show");
  }
  return t("mark_as_no_show");
}

function getNoShowIcon(attendeeList: Array<{ noShow: boolean }>): string {
  if (attendeeList.length === 1 && attendeeList[0].noShow) {
    return "eye";
  }
  return "eye-off";
}

function getChargeCardLabel(
  cardCharged: boolean,
  t: (key: string) => string
): string {
  if (cardCharged) {
    return t("no_show_fee_charged");
  }
  return t("collect_no_show_fee");
}

function buildRescheduleHref(
  bookingUid: string,
  seatsLength: number,
  isAttendee: boolean,
  seatReferenceUid: string | undefined
): string {
  let href = `/reschedule/${bookingUid}`;
  if (seatsLength && isAttendee && seatReferenceUid) {
    href += `?seatReferenceUid=${seatReferenceUid}`;
  }
  return href;
}

function buildRescheduleAction(
  context: BookingActionContext,
  seatReferenceUid: string | undefined
): ActionType {
  const { booking, isBookingInPast, isDisabledRescheduling, isAttendee, t } =
    context;
  return {
    id: "reschedule",
    icon: "clock",
    label: t("reschedule_booking"),
    href: buildRescheduleHref(
      booking.uid,
      booking.seatsReferences.length,
      isAttendee,
      seatReferenceUid
    ),
    disabled: isActionDisabled("reschedule", {
      ...context,
      booking,
      isBookingInPast,
      isDisabledRescheduling,
    }),
  };
}

function buildRescheduleRequestAction(
  context: BookingActionContext
): ActionType {
  const { booking, isBookingInPast, isDisabledRescheduling, t } = context;
  return {
    id: "reschedule_request",
    icon: "send",
    iconClassName: "rotate-45 w-[16px] -translate-x-0.5 ",
    label: t("send_reschedule_request"),
    disabled:
      isActionDisabled("reschedule_request", {
        ...context,
        booking,
        isBookingInPast,
        isDisabledRescheduling,
      }) || booking.seatsReferences.length > 0,
  };
}

function buildRerouteAction(
  isBookingFromRoutingForm: boolean,
  t: (key: string) => string
): ActionType | null {
  if (isBookingFromRoutingForm) {
    return {
      id: "reroute",
      label: t("reroute"),
      icon: "waypoints",
      disabled: false,
    };
  }
  return null;
}

function buildAddMembersAction(
  booking: BookingItemProps,
  t: (key: string) => string
): ActionType | null {
  if (booking.eventType?.disableGuests) {
    return null;
  }
  return {
    id: "add_members",
    label: t("additional_guests"),
    icon: "user-plus",
    disabled: false,
  };
}

function buildReassignAction(
  isReassignable: boolean,
  t: (key: string) => string
): ActionType | null {
  if (isReassignable) {
    return {
      id: "reassign",
      label: t("reassign"),
      icon: "users",
      disabled: false,
    };
  }
  return null;
}

function buildChargeCardAction(
  booking: BookingItemProps,
  cardCharged: boolean,
  t: (key: string) => string
): ActionType | null {
  if (
    booking.status === BookingStatus.ACCEPTED &&
    booking.paid &&
    booking.payment[0]?.paymentOption === "HOLD"
  ) {
    return {
      id: "charge_card",
      label: getChargeCardLabel(cardCharged, t),
      icon: "credit-card",
      disabled: cardCharged,
    };
  }
  return null;
}

export function getPendingActions(context: BookingActionContext): ActionType[] {
  const {
    booking,
    isPending,
    isTabRecurring,
    isTabUnconfirmed,
    isRecurring,
    showPendingPayment,
    t,
  } = context;
  const actions: ActionType[] = [];

  // For bookings with payment, only confirm if the booking is paid for
  // Original logic: (isPending && !paymentAppData.enabled) || (paymentAppData.enabled && !!paymentAppData.price && booking.paid)
  if (
    (isPending && !showPendingPayment) ||
    (showPendingPayment && booking.paid)
  ) {
    actions.push({
      id: "confirm",
      bookingUid: booking.uid,
      label: getConfirmLabel(isTabRecurring, isTabUnconfirmed, isRecurring, t),
      icon: "check" as const,
      disabled: false, // This would be controlled by mutation state in the component
    });
  }

  actions.push({
    id: "reject",
    label: getRejectLabel(isTabRecurring, isTabUnconfirmed, isRecurring, t),
    icon: "ban",
    disabled: false, // This would be controlled by mutation state in the component
  });

  return actions;
}

export function getCancelEventAction(
  context: BookingActionContext
): ActionType {
  const { booking, isTabRecurring, isRecurring, t } = context;
  return {
    id: "cancel",
    label: getCancelLabel(isTabRecurring, isRecurring, t),
    icon: "circle-x",
    color: "destructive",
    disabled: isActionDisabled("cancel", context),
    bookingUid: booking.uid,
  };
}

export function getVideoOptionsActions(
  context: BookingActionContext
): ActionType[] {
  const { booking, isBookingInPast, isConfirmed, isCalVideoLocation, t } =
    context;
  return [
    {
      id: "view_recordings",
      label: t("view_recordings"),
      icon: "video",
      disabled: !(
        isBookingInPast &&
        isConfirmed &&
        isCalVideoLocation &&
        booking.isRecorded
      ),
    },
    {
      id: "meeting_session_details",
      label: t("view_session_details"),
      icon: "info",
      disabled: !(isBookingInPast && isConfirmed && isCalVideoLocation),
    },
  ];
}

export function getEditEventActions(
  context: BookingActionContext
): ActionType[] {
  const { booking, isBookingFromRoutingForm, getSeatReferenceUid, t } = context;
  const seatReferenceUid = getSeatReferenceUid();
  const isReassignableRoundRobin =
    booking.eventType.schedulingType === SchedulingType.ROUND_ROBIN;
  const isManagedChildEvent = booking.eventType.parentId != null;
  const isReassignable = isReassignableRoundRobin || isManagedChildEvent;

  const actions: (ActionType | null)[] = [
    buildRescheduleAction(context, seatReferenceUid),
    buildRescheduleRequestAction(context),
    buildRerouteAction(isBookingFromRoutingForm, t),
    {
      id: "change_location",
      label: t("edit_location"),
      icon: "map-pin",
      disabled: false,
    },
    buildAddMembersAction(booking, t),
    buildReassignAction(isReassignable, t),
  ];
  return actions.filter(Boolean) as ActionType[];
}

export function getReportAction(context: BookingActionContext): ActionType {
  const { booking, t } = context;
  return {
    id: "report",
    label: t("report_booking"),
    icon: "flag",
    color: "destructive",
    disabled: !!booking.report,
  };
}

export function getAfterEventActions(
  context: BookingActionContext
): ActionType[] {
  const { booking, cardCharged, attendeeList, t } = context;
  const actions: (ActionType | null)[] = [
    ...getVideoOptionsActions(context),
    buildChargeCardAction(booking, cardCharged, t),
    {
      id: "no_show",
      label: getNoShowLabel(attendeeList, t),
      icon: getNoShowIcon(attendeeList),
      disabled: false, // This would be controlled by booking state in the component
    },
  ];
  return actions.filter(Boolean) as ActionType[];
}

export function shouldShowPendingActions(
  context: BookingActionContext
): boolean {
  const { isPending, isUpcoming, isCancelled } = context;
  return isPending && isUpcoming && !isCancelled;
}

export function shouldShowEditActions(context: BookingActionContext): boolean {
  const { isPending, isTabRecurring, isRecurring, isCancelled } = context;
  return !isPending && !(isTabRecurring && isRecurring) && !isCancelled;
}

export function shouldShowRecurringCancelAction(
  context: BookingActionContext
): boolean {
  const { isTabRecurring, isRecurring } = context;
  return isTabRecurring && isRecurring;
}

export function shouldShowIndividualReportButton(
  context: BookingActionContext
): boolean {
  const { booking, isPending, isUpcoming, isCancelled, isRejected } = context;
  const hasDropdown = shouldShowEditActions(context);
  return (
    !booking.report &&
    !hasDropdown &&
    (isCancelled || isRejected || (isPending && isUpcoming))
  );
}

export function isActionDisabled(
  actionId: string,
  context: BookingActionContext
): boolean {
  const {
    booking,
    isBookingInPast,
    isDisabledRescheduling,
    isDisabledCancelling,
    isAttendee,
  } = context;

  switch (actionId) {
    case "reschedule":
    case "reschedule_request": {
      // Only apply minimum reschedule notice restriction if user is NOT the organizer
      // If user is an attendee (or not authenticated), apply the restriction
      const isUserOrganizer =
        !isAttendee &&
        booking.loggedInUser?.userId &&
        booking.user?.id &&
        booking.loggedInUser.userId === booking.user.id;
      const isWithinMinimumNotice =
        !isUserOrganizer &&
        isWithinMinimumRescheduleNotice(
          new Date(booking.startTime),
          booking.eventType.minimumRescheduleNotice ?? null
        );
      return (
        (isBookingInPast && !booking.eventType.allowReschedulingPastBookings) ||
        isDisabledRescheduling ||
        isWithinMinimumNotice
      );
    }
    case "cancel":
      return isDisabledCancelling || isBookingInPast;
    case "view_recordings":
      return !(
        isBookingInPast &&
        booking.status === BookingStatus.ACCEPTED &&
        context.isCalVideoLocation
      );
    case "meeting_session_details":
      return !(
        isBookingInPast &&
        booking.status === BookingStatus.ACCEPTED &&
        context.isCalVideoLocation
      );
    case "charge_card":
      return context.cardCharged;
    default:
      return false;
  }
}

export function getActionLabel(
  actionId: string,
  context: BookingActionContext
): string {
  const { isTabRecurring, isRecurring, attendeeList, cardCharged, t } = context;

  switch (actionId) {
    case "reject":
      return getRejectLabel(
        isTabRecurring,
        context.isTabUnconfirmed,
        isRecurring,
        t
      );
    case "confirm":
      return getConfirmLabel(
        isTabRecurring,
        context.isTabUnconfirmed,
        isRecurring,
        t
      );
    case "cancel":
      return getCancelLabel(isTabRecurring, isRecurring, t);
    case "no_show":
      return getNoShowLabel(attendeeList, t);
    case "charge_card":
      return getChargeCardLabel(cardCharged, t);
    default:
      return t(actionId);
  }
}

export type { BookingActionContext };
