import { Button } from "@calid/features/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@calid/features/ui/components/dropdown-menu";
import { Icon } from "@calid/features/ui/components/icon";
import { triggerToast } from "@calid/features/ui/components/toast";
import type { AssignmentReason } from "@prisma/client";
import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { flushSync } from "react-dom";
import { Controller, useFieldArray, useForm } from "react-hook-form";

import type { getEventLocationValue } from "@calcom/app-store/locations";
import { getSuccessPageLocationMessage, guessEventLocationType } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import "@calcom/dayjs/locales";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { MeetingSessionDetailsDialog } from "@calcom/features/ee/video/MeetingSessionDetailsDialog";
import ViewRecordingsDialog from "@calcom/features/ee/video/ViewRecordingsDialog";
import { formatTime } from "@calcom/lib/dayjs";
import { getPaymentAppData } from "@calcom/lib/getPaymentAppData";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useGetTheme } from "@calcom/lib/hooks/useTheme";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import isSmsCalEmail from "@calcom/lib/isSmsCalEmail";
import { getEveryFreqFor } from "@calcom/lib/recurringStrings";
import { BookingStatus } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
import type { RouterInputs, RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import type { RecurringEvent } from "@calcom/types/Calendar";
import type { Ensure } from "@calcom/types/utils";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";
import { DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";
import { MeetingTimeInTimezones } from "@calcom/ui/components/popover";
import { TableActions } from "@calcom/ui/components/table";
import type { ActionType } from "@calcom/ui/components/table";
import { Tooltip } from "@calcom/ui/components/tooltip";

import assignmentReasonBadgeTitleMap from "@lib/booking/assignmentReasonBadgeTitleMap";

import { AddGuestsDialog } from "@components/dialog/AddGuestsDialog";
import { BookingCancelDialog } from "@components/dialog/BookingCancelDialog";
import { BookingSeatsDialog } from "@components/dialog/BookingSeatsDialog";
import { CancelInstancesDialog } from "@components/dialog/CancelInstancesDialog";
import { ChargeCardDialog } from "@components/dialog/ChargeCardDialog";
import { EditLocationDialog } from "@components/dialog/EditLocationDialog";
import { MeetingNotesDialog } from "@components/dialog/MeetingNotesDialog";
import { ReassignDialog } from "@components/dialog/ReassignDialog";
import { RejectBookingDialog } from "@components/dialog/RejectBookingDialog";
import { RerouteDialog } from "@components/dialog/RerouteDialog";
import { RescheduleDialog } from "@components/dialog/RescheduleDialog";
import { RescheduleInstanceDialog } from "@components/dialog/RescheduleInstanceDialog";
import { WorkflowStatusDialog } from "@components/dialog/WorkflowStatusDialog";

import { BookingExpandedCard } from "./BookingExpandedCard";
import {
  getPendingActions,
  getCancelEventAction,
  getRescheduleEventLink,
  getEditEventActions,
  getAfterEventActions,
  shouldShowPendingActions,
  type BookingActionContext,
} from "./bookingActions";

type BookingListingStatus = RouterInputs["viewer"]["bookings"]["calid_get"]["filters"]["status"];

type BookingItem = RouterOutputs["viewer"]["bookings"]["calid_get"]["bookings"][number];

export type BookingItemProps = BookingItem & {
  expandedBooking: number | null;
  setExpandedBooking: Dispatch<SetStateAction<number | null>>;
  listingStatus: BookingListingStatus;
  recurringInfo: RouterOutputs["viewer"]["bookings"]["calid_get"]["recurringInfo"][number] | undefined;
  loggedInUser: {
    userId: number | undefined;
    userTimeZone: string | undefined;
    userTimeFormat: number | null | undefined;
    userEmail: string | undefined;
  };
  isToday: boolean;
};

type ParsedBooking = ReturnType<typeof buildParsedBooking>;
type TeamEvent = Ensure<NonNullable<ParsedBooking["eventType"]>, "team">;
type TeamEventBooking = Omit<ParsedBooking, "eventType"> & {
  eventType: TeamEvent;
};
type ReroutableBooking = Ensure<TeamEventBooking, "routedFromRoutingFormReponse">;

function buildParsedBooking(booking: BookingItemProps) {
  const bookingEventType = booking.eventType.id
    ? (booking.eventType as Ensure<
        typeof booking.eventType,
        "id" | "length" | "title" | "slug" | "schedulingType" | "team"
      >)
    : null;

  const parsedMetadata = bookingMetadataSchema.safeParse(booking.metadata ?? null);
  const bookingMetadata = parsedMetadata.success ? parsedMetadata.data : null;

  return {
    ...booking,
    eventType: bookingEventType,
    metadata: bookingMetadata,
  };
}

const isBookingReroutable = (booking: ParsedBooking): booking is ReroutableBooking => {
  return !!booking.routedFromRoutingFormReponse && !!booking.eventType?.team;
};

export default function BookingListItem(booking: BookingItemProps) {
  const parsedBooking = buildParsedBooking(booking);

  const { userTimeZone, userTimeFormat, userEmail, userId } = booking.loggedInUser;
  const {
    t,
    i18n: { language },
  } = useLocale();
  const utils = trpc.useUtils();
  const [rejectionDialogIsOpen, setRejectionDialogIsOpen] = useState(false);
  const [chargeCardDialogIsOpen, setChargeCardDialogIsOpen] = useState(false);
  const [viewRecordingsDialogIsOpen, setViewRecordingsDialogIsOpen] = useState<boolean>(false);
  const [meetingSessionDetailsDialogIsOpen, setMeetingSessionDetailsDialogIsOpen] = useState<boolean>(false);
  const [isNoShowDialogOpen, setIsNoShowDialogOpen] = useState<boolean>(false);
  const cardCharged = booking?.payment[0]?.success;
  const [isWorkflowStatusDialogOpen, setIsWorkflowStatusDialogOpen] = useState(false);
  const [isMeetingNotesDialogOpen, setIsMeetingNotesDialogOpen] = useState(false);
  const [meetingNotesEditingNotes, setMeetingNotesEditingNotes] = useState("");
  // Check if booking has workflow insights
  const hasWorkflowInsights =
    parsedBooking.workflowInsights &&
    Array.isArray(parsedBooking.workflowInsights) &&
    parsedBooking.workflowInsights.length > 0;

  // Check if booking is multi-seat
  const isMultiSeat = booking.seatsReferences && booking.seatsReferences.length > 1;

  const attendeeList = booking.attendees.map((attendee) => {
    return {
      name: attendee.name,
      email: attendee.email,
      id: attendee.id,
      noShow: attendee.noShow || false,
      phoneNumber: attendee.phoneNumber,
    };
  });

  const noShowMutation = trpc.viewer.loggedInViewerRouter.markNoShow.useMutation({
    onSuccess: async (data) => {
      triggerToast(data.message, "success");
      await utils.viewer.bookings.invalidate();
    },
    onError: (err) => {
      triggerToast(err.message, "error");
    },
  });

  const getIconFromLocationValue = (value: string) => {
    switch (value) {
      case "phone":
        return "phone";
      case "userPhone":
        return "phone";
      case "inPerson":
        return "map-pin";
      case "attendeeInPerson":
        return "map-pin";
      case "link":
        return "link";
      case "somewhereElse":
        return "map";
      default:
        return "video";
    }
  };

  const mutation = trpc.viewer.bookings.confirm.useMutation({
    onSuccess: () => {
      triggerToast(t("booking_confirmation_success"), "success");
      utils.viewer.bookings.invalidate();
    },
    onError: () => {
      triggerToast(t("booking_confirmation_failed"), "error");
      utils.viewer.bookings.invalidate();
    },
  });

  const { expandedBooking, setExpandedBooking } = booking;

  const isUpcoming = dayjs(booking.endTime).tz(userTimeZone) >= dayjs().tz(userTimeZone);
  const isOngoing = isUpcoming && dayjs().tz(userTimeZone) >= dayjs(booking.startTime).tz(userTimeZone);
  const isBookingInPast = dayjs(booking.endTime).tz(userTimeZone) < dayjs().tz(userTimeZone);
  const isCancelled = booking.status === BookingStatus.CANCELLED;
  const isConfirmed = booking.status === BookingStatus.ACCEPTED;
  const isRejected = booking.status === BookingStatus.REJECTED;
  const isPending = booking.status === BookingStatus.PENDING;
  const isRescheduled = booking.fromReschedule !== null;

  // NEW: Check if booking is recurring based on metadata
  const isRecurring = !!parsedBooking.metadata?.recurringEvent;

  const isTabRecurring = booking.listingStatus === "recurring";
  const isTabUnconfirmed = booking.listingStatus === "unconfirmed";
  const isBookingFromRoutingForm = isBookingReroutable(parsedBooking);

  const paymentAppData = getPaymentAppData(booking.eventType);

  const location = booking.location as ReturnType<typeof getEventLocationValue>;
  const locationVideoCallUrl = parsedBooking.metadata?.videoCallUrl;

  const { resolvedTheme, forcedTheme } = useGetTheme();
  const hasDarkTheme = !forcedTheme && resolvedTheme === "dark";
  const eventTypeColor =
    booking.eventType.eventTypeColor &&
    booking.eventType.eventTypeColor[hasDarkTheme ? "darkEventTypeColor" : "lightEventTypeColor"];

  const locationToDisplay = getSuccessPageLocationMessage(
    locationVideoCallUrl ? locationVideoCallUrl : location,
    t,
    booking.status
  );
  const provider = guessEventLocationType(location);

  const isDisabledCancelling = booking.eventType.disableCancelling;
  const isDisabledRescheduling = booking.eventType.disableRescheduling;

  const bookingConfirm = async (confirm: boolean) => {
    let body = {
      bookingId: booking.id,
      confirmed: confirm,
      reason: "",
    };

    // NEW: For recurring bookings, we use the booking's own uid since each booking
    // now represents the full series in metadata
    if ((isTabRecurring || isTabUnconfirmed) && isRecurring) {
      body = Object.assign({}, body, { recurringEventId: booking.uid });
    }
    mutation.mutate(body);
  };

  const getSeatReferenceUid = () => {
    if (!booking.seatsReferences[0]) {
      return undefined;
    }
    return booking.seatsReferences[0].referenceUid;
  };

  const hasTeam = booking.eventType?.calIdTeam?.id !== null;
  const hasUserId = booking.eventType?.userId !== null;
  const isUserOwner = booking.eventType?.userId === userId;

  const attendeePhoneNo = isPrismaObjOrUndefined(booking.responses)?.attendeePhoneNumber as
    | string
    | undefined;

  const actionContext: BookingActionContext = {
    booking,
    isUpcoming,
    isOngoing,
    isBookingInPast,
    isCancelled,
    isConfirmed,
    isRejected,
    isPending,
    isRescheduled,
    isRecurring,
    isTabRecurring,
    isTabUnconfirmed,
    isBookingFromRoutingForm,
    isDisabledCancelling,
    isDisabledRescheduling: isDisabledRescheduling && hasUserId && !isUserOwner,
    isCalVideoLocation:
      !booking.location ||
      booking.location === "integrations:daily" ||
      (typeof booking.location === "string" && booking.location.trim() === ""),
    showPendingPayment: paymentAppData.enabled && booking.payment.length && !booking.paid,
    cardCharged,
    attendeeList,
    getSeatReferenceUid,
    attendeePhoneNumber: attendeePhoneNo,
    t,
  } as BookingActionContext;

  const basePendingActions = getPendingActions(actionContext);
  const pendingActions: ActionType[] = basePendingActions.map((action) => ({
    ...action,
    onClick:
      action.id === "reject"
        ? () => setRejectionDialogIsOpen(true)
        : action.id === "confirm"
        ? () => bookingConfirm(true)
        : undefined,
    disabled: action.disabled || mutation.isPending,
  })) as ActionType[];

  const cancelEventAction = getCancelEventAction(actionContext);

  const rescheduleEventLink = getRescheduleEventLink(actionContext);

  const bookingYear = dayjs(booking.startTime).year();
  const currentYear = dayjs().year();
  const isDifferentYear = bookingYear !== currentYear;

  const startTime = dayjs(booking.startTime)
    .tz(userTimeZone)
    .locale(language)
    .format(isUpcoming ? (isDifferentYear ? "ddd, D MMM YYYY" : "ddd, D MMM") : "D MMMM YYYY");
  const [isOpenRescheduleDialog, setIsOpenRescheduleDialog] = useState(false);
  const [isOpenReassignDialog, setIsOpenReassignDialog] = useState(false);

  const [isOpenSetLocationDialog, setIsOpenLocationDialog] = useState(false);

  const [isOpenSetCancellationDialog, setIsOpenCancellationDialog] = useState(false);
  const [isOpenAddGuestsDialog, setIsOpenAddGuestsDialog] = useState(false);
  const [rerouteDialogIsOpen, setRerouteDialogIsOpen] = useState(false);
  const [isCancelInstanceDialogOpen, setIsCancelInstanceDialogOpen] = useState(false);
  const [isBookingSeatsDialogOpen, setIsBookingSeatsDialogOpen] = useState(false);
  const [isRescheduleInstanceDialogOpen, setIsRescheduleInstanceDialogOpen] = useState(false);

  const setLocationMutation = trpc.viewer.bookings.editLocation.useMutation({
    onSuccess: () => {
      triggerToast(t("location_updated"), "success");
      setIsOpenLocationDialog(false);
      utils.viewer.bookings.invalidate();
    },
    onError: (e) => {
      const errorMessages: Record<string, string> = {
        UNAUTHORIZED: t("you_are_unauthorized_to_make_this_change_to_the_booking"),
        BAD_REQUEST: e.message,
      };

      const message = errorMessages[e.data?.code as string] || t("location_update_failed");
      triggerToast(message, "error");
    },
  });

  const saveNotesMutation = trpc.viewer.bookings.saveNote.useMutation({
    onSuccess: async () => {
      setIsMeetingNotesDialogOpen(false);
      triggerToast(t("meeting_notes_saved"), "success");
      await utils.viewer.bookings.invalidate();
    },
  });

  const handleMeetingNoteSave = async () => {
    await saveNotesMutation.mutate({ bookingId: booking.id, meetingNote: meetingNotesEditingNotes });
  };

  const openWhatsAppChat = (phoneNumber: string) => {
    const width = 800;
    const height = 600;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    const options = `width=${width},height=${height},left=${left},top=${top},resizable,scrollbars=yes,status=1`;
    const cleanedPhoneNumber = phoneNumber.replace(/\D/g, "");
    const urlEndcodedTextMessage = encodeURIComponent(
      `Hi, I'm running late by 5 minutes. I'll be there soon.`
    );
    const whatsappLink = `https://api.whatsapp.com/send?phone=${cleanedPhoneNumber}&text=${urlEndcodedTextMessage}`;
    window.open(whatsappLink, "_blank", options);
  };

  const saveLocation = async ({
    newLocation,
    credentialId,
  }: {
    newLocation: string;
    credentialId: number | null;
  }) => {
    try {
      await setLocationMutation.mutateAsync({
        bookingId: booking.id,
        newLocation,
        credentialId,
      });
    } catch {
      // Errors are shown through the mutation onError handler
    }
  };

  // NEW: Get recurring dates from recurringInfo generated by backend
  // This now comes from RRule generation instead of querying multiple booking records
  const recurringDates = booking.recurringInfo
    ? [
        ...booking.recurringInfo.bookings.ACCEPTED,
        ...booking.recurringInfo.bookings.CANCELLED,
        ...booking.recurringInfo.bookings.PENDING,
      ].sort((date1: string, date2: string) => new Date(date1).getTime() - new Date(date2).getTime())
    : undefined;

  const buildBookingLink = () => {
    const urlSearchParams = new URLSearchParams({
      allRemainingBookings: isTabRecurring.toString(),
    });
    if (booking.attendees?.[0]?.email) urlSearchParams.set("email", booking.attendees[0].email);
    return `/booking/${booking.uid}?${urlSearchParams.toString()}`;
  };

  const bookingLink = buildBookingLink();

  const title = booking.title;

  const isCalVideoLocation =
    !booking.location ||
    booking.location === "integrations:daily" ||
    (typeof booking.location === "string" && booking.location.trim() === "");

  const showPendingPayment = paymentAppData.enabled && booking.payment.length && !booking.paid;

  const isRecurringBookingOnRecurringTab =
    isRecurring &&
    isConfirmed &&
    isTabRecurring &&
    !isCancelled &&
    booking.recurringInfo?.bookings?.[BookingStatus.ACCEPTED]?.some(
      (date) => new Date(date).getTime() > new Date().getTime()
    );

  const baseEditEventActions = getEditEventActions(actionContext);

  const editEventActions: ActionType[] = baseEditEventActions.map((action) => ({
    ...action,
    href: action.id === "reschedule" && isRecurringBookingOnRecurringTab ? undefined : action.href,
    onClick:
      action.id === "reschedule" && isRecurringBookingOnRecurringTab
        ? (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
            e.preventDefault();
            e.stopPropagation();
            setIsRescheduleInstanceDialogOpen(true);
          }
        : action.id === "reschedule_request"
        ? () => setIsOpenRescheduleDialog(true)
        : action.id === "change_location"
        ? () => setIsOpenLocationDialog(true)
        : action.id === "add_members"
        ? () => setIsOpenAddGuestsDialog(true)
        : action.id === "meeting_notes"
        ? (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
            e.stopPropagation();
            setMeetingNotesEditingNotes(parsedBooking.metadata?.meetingNote ?? "");
            setIsMeetingNotesDialogOpen(true);
          }
        : action.id === "whatsapp_chat"
        ? (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
            e.stopPropagation();
            attendeePhoneNo && openWhatsAppChat(attendeePhoneNo);
          }
        : action.id === "cancel_event"
        ? (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
            e.stopPropagation();
            if (isRecurringBookingOnRecurringTab) {
              setIsCancelInstanceDialogOpen(true);
            } else {
              setIsOpenCancellationDialog(true);
            }
          }
        : action.id === "no_show"
        ? () => {
            if (attendeeList.length === 1) {
              const attendee = attendeeList[0];
              noShowMutation.mutate({
                bookingUid: booking.uid,
                attendees: [{ email: attendee.email, noShow: !attendee.noShow }],
              });
              return;
            }
            setIsNoShowDialogOpen(true);
          }
        : undefined,
  })) as ActionType[];

  const baseAfterEventActions = getAfterEventActions(actionContext);
  const afterEventActions: ActionType[] = baseAfterEventActions.map((action) => ({
    ...action,
    onClick:
      action.id === "view_recordings"
        ? () => setViewRecordingsDialogIsOpen(true)
        : action.id === "meeting_session_details"
        ? () => setMeetingSessionDetailsDialogIsOpen(true)
        : action.id === "charge_card"
        ? () => setChargeCardDialogIsOpen(true)
        : action.id === "no_show"
        ? () => {
            if (attendeeList.length === 1) {
              const attendee = attendeeList[0];
              noShowMutation.mutate({
                bookingUid: booking.uid,
                attendees: [{ email: attendee.email, noShow: !attendee.noShow }],
              });
              return;
            }
            setIsNoShowDialogOpen(true);
          }
        : undefined,
    disabled:
      action.disabled ||
      (action.id === "no_show" && !(isBookingInPast || isOngoing)) ||
      (action.id === "view_recordings" && !booking.isRecorded),
  })) as ActionType[];

  const rescheduleBooking = (href: string) => {
    window.open(href, "_blank");
  };

  const handleCancelInstances = async (selectedDates: Date[]) => {
    try {
      triggerToast("Cancelling selected instances...", "success");

      const response = await fetch("/api/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: booking.uid,
          cancellationReason: "Host cancelled selected instances",
          cancelledBy: booking.user?.email,
          autoRefund: false,
          cancelledDates: selectedDates.map((date) => date.toISOString()),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to cancel instances");
      }

      triggerToast(`Excluded ${selectedDates.length} instance(s) from the series`, "success");
      utils.viewer.bookings.invalidate();
      setIsCancelInstanceDialogOpen(false);
    } catch (error) {
      console.error("Cancel instances error:", error);
      triggerToast(error instanceof Error ? error.message : "Failed to cancel instances", "error");
    }
  };

  const showBookingSeatsDialogButton =
    isUpcoming && !isCancelled && !isRecurring && isConfirmed && booking.eventType.seatsPerTimeSlot > 1;

  return (
    <>
      {isNoShowDialogOpen && (
        <NoShowAttendeesDialog
          bookingUid={booking.uid}
          attendees={attendeeList}
          setIsOpen={setIsNoShowDialogOpen}
          isOpen={isNoShowDialogOpen}
        />
      )}

      <RescheduleDialog
        isOpenDialog={isOpenRescheduleDialog}
        setIsOpenDialog={setIsOpenRescheduleDialog}
        bookingUId={booking.uid}
      />

      <BookingCancelDialog
        isOpenDialog={isOpenSetCancellationDialog}
        setIsOpenDialog={setIsOpenCancellationDialog}
        seatReferenceUid={getSeatReferenceUid()}
        bookingUId={booking.uid}
        {...booking}
        isTabRecurring={isTabRecurring}
      />

      {isOpenReassignDialog && (
        <ReassignDialog
          isOpenDialog={isOpenReassignDialog}
          setIsOpenDialog={setIsOpenReassignDialog}
          bookingId={booking.id}
          teamId={booking.eventType?.calIdTeam?.id || 0}
          bookingFromRoutingForm={isBookingFromRoutingForm}
        />
      )}

      <EditLocationDialog
        booking={booking}
        saveLocation={saveLocation}
        isOpenDialog={isOpenSetLocationDialog}
        setShowLocationModal={setIsOpenLocationDialog}
        teamId={booking.eventType?.calIdTeam?.id}
      />
      <AddGuestsDialog
        isOpenDialog={isOpenAddGuestsDialog}
        setIsOpenDialog={setIsOpenAddGuestsDialog}
        bookingId={booking.id}
      />
      {isRecurringBookingOnRecurringTab && (
        <CancelInstancesDialog
          isOpenDialog={isCancelInstanceDialogOpen}
          setIsOpenDialog={setIsCancelInstanceDialogOpen}
          bookingUid={booking.uid}
          eventStartTime={new Date(booking.startTime)}
          userTimeZone={userTimeZone ?? "UTC"}
          userTimeFormat={userTimeFormat ?? 24}
          onSubmitCancelInstances={handleCancelInstances}
          recurringEvent={parsedBooking.metadata?.recurringEvent as RecurringEvent}
        />
      )}

      {showBookingSeatsDialogButton && (
        <BookingSeatsDialog
          isOpenDialog={isBookingSeatsDialogOpen}
          setIsOpenDialog={setIsBookingSeatsDialogOpen}
          bookingUid={booking.uid}
          eventFields={booking.eventType.bookingFields}
          bookingSeats={booking.seatsReferences}
          userTimeFormat={userTimeFormat ?? 24}
        />
      )}

      {isRecurringBookingOnRecurringTab && (
        <RescheduleInstanceDialog
          isOpen={isRescheduleInstanceDialogOpen}
          setIsOpen={setIsRescheduleInstanceDialogOpen}
          recurringEvent={parsedBooking.metadata?.recurringEvent as RecurringEvent}
          eventStartTime={new Date(booking.startTime)}
          eventType={booking.eventType}
          bookingUid={booking.uid}
          userTimeZone={userTimeZone ?? "UTC"}
          userTimeFormat={userTimeFormat ?? 24}
        />
      )}
      {hasWorkflowInsights && (
        <WorkflowStatusDialog
          isOpenDialog={isWorkflowStatusDialogOpen}
          setIsOpenDialog={setIsWorkflowStatusDialogOpen}
          workflowInsights={parsedBooking.workflowInsights as any[]}
          isMultiSeat={isMultiSeat}
        />
      )}
      <MeetingNotesDialog
        isOpenDialog={isMeetingNotesDialogOpen}
        setIsOpenDialog={setIsMeetingNotesDialogOpen}
        notes={meetingNotesEditingNotes}
        setNotes={setMeetingNotesEditingNotes}
        handleMeetingNoteSave={handleMeetingNoteSave}
        hideTrigger
      />
      {booking.paid && booking.payment[0] && (
        <ChargeCardDialog
          isOpenDialog={chargeCardDialogIsOpen}
          setIsOpenDialog={setChargeCardDialogIsOpen}
          bookingId={booking.id}
          paymentAmount={booking.payment[0].amount}
          paymentCurrency={booking.payment[0].currency}
        />
      )}
      {isCalVideoLocation && (
        <ViewRecordingsDialog
          booking={booking}
          isOpenDialog={viewRecordingsDialogIsOpen}
          setIsOpenDialog={setViewRecordingsDialogIsOpen}
          timeFormat={userTimeFormat ?? null}
        />
      )}
      {isCalVideoLocation && meetingSessionDetailsDialogIsOpen && (
        <MeetingSessionDetailsDialog
          booking={booking}
          isOpenDialog={meetingSessionDetailsDialogIsOpen}
          setIsOpenDialog={setMeetingSessionDetailsDialogIsOpen}
          timeFormat={userTimeFormat ?? null}
        />
      )}
      <RejectBookingDialog
        {...booking}
        isOpenDialog={rejectionDialogIsOpen}
        setIsOpenDialog={setRejectionDialogIsOpen}
        isTabRecurring={isTabRecurring}
        isTabUnconfirmed={isTabUnconfirmed}
        isRecurring={isRecurring}
      />

      <div
        data-testid={`booking-uid-${booking.uid}`}
        className="bg-default border-default my-1.5 flex w-full flex-col items-start justify-between rounded-md border hover:shadow-md">
        <div data-testid="booking-item" data-today={String(booking.isToday)} className="group w-full">
          <div className="cursor-pointer">
            <div className="flex flex-col pb-4">
              <div className="flex flex-col lg:flex-row">
                <div
                  data-testid="title-and-attendees"
                  onClick={() =>
                    flushSync(() => {
                      setExpandedBooking(expandedBooking === booking.id ? null : booking.id);
                    })
                  }
                  className={`w-full px-4${isRejected ? " line-through" : ""}`}>
                  {/* Time and Badges for mobile */}
                  <div className="w-full pb-2 pt-4 sm:hidden">
                    <div className="flex w-full items-center justify-between sm:hidden">
                      <div className="text-emphasis text-sm leading-6">{startTime}</div>
                      <div className="text-subtle pr-2 text-sm">
                        {formatTime(booking.startTime, userTimeFormat, userTimeZone)} -{" "}
                        {formatTime(booking.endTime, userTimeFormat, userTimeZone)}
                        <MeetingTimeInTimezones
                          timeFormat={userTimeFormat}
                          userTimezone={userTimeZone}
                          startTime={booking.startTime}
                          endTime={booking.endTime}
                          attendees={booking.attendees}
                        />
                      </div>
                    </div>

                    {isPending && (
                      <Badge className="sm:hidden ltr:mr-2 rtl:ml-2" variant="orange">
                        {t("unconfirmed")}
                      </Badge>
                    )}
                    {booking.eventType?.calIdTeam && (
                      <Badge className="sm:hidden ltr:mr-2 rtl:ml-2" variant="gray">
                        {booking.eventType.calIdTeam.name}
                      </Badge>
                    )}
                    {showPendingPayment && (
                      <Badge className="sm:hidden ltr:mr-2 rtl:ml-2" variant="orange">
                        {t("pending_payment")}
                      </Badge>
                    )}
                    {recurringDates !== undefined && (
                      <div className="text-muted text-sm sm:hidden">
                        <RecurringBookingsTooltip
                          userTimeFormat={userTimeFormat}
                          userTimeZone={userTimeZone}
                          booking={booking}
                          recurringDates={recurringDates}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex cursor-pointer flex-col items-start justify-start pt-6">
                    <div
                      title={title}
                      className={classNames(
                        "text-emphasis flex w-full flex-wrap items-baseline gap-x-2 gap-y-1 align-top text-base font-semibold leading-6"
                      )}>
                      <span className={isCancelled ? "line-through" : ""}>{booking.eventType?.title}</span>
                      <span className="text-subtle text-xs font-medium">with</span>
                      <span className="!decoration-none text-default text-sm font-medium">
                        {attendeeList[0]?.name}
                      </span>
                      {attendeeList.length > 1 && (
                        <span className="text-default text-sm font-medium">
                          + {attendeeList.length - 1} more
                        </span>
                      )}
                      {showPendingPayment && (
                        <Badge className="hidden sm:inline-flex" variant="orange">
                          {t("pending_payment")}
                        </Badge>
                      )}
                    </div>
                    <div className="text-subtle flex w-full cursor-pointer flex-row items-center py-2 text-xs font-medium">
                      <div className="">{booking.isToday ? t("today_capitalized") : startTime}</div>
                      <span className="px-2">{" • "}</span>
                      <div className="flex items-center">
                        {formatTime(booking.startTime, userTimeFormat, userTimeZone)} -{" "}
                        {formatTime(booking.endTime, userTimeFormat, userTimeZone)}
                        <MeetingTimeInTimezones
                          timeFormat={userTimeFormat}
                          userTimezone={userTimeZone}
                          startTime={booking.startTime}
                          endTime={booking.endTime}
                          attendees={booking.attendees}
                        />
                      </div>
                    </div>
                    {!isPending && (
                      <div className="mb-1">
                        {(provider?.label ||
                          (typeof locationToDisplay === "string" &&
                            locationToDisplay?.startsWith("https://"))) &&
                          locationToDisplay.startsWith("http") && (
                            <a
                              href={locationToDisplay}
                              onClick={(e) => e.stopPropagation()}
                              target="_blank"
                              title={locationToDisplay}
                              rel="noreferrer"
                              className="text-active text-xs leading-6 hover:underline">
                              <div className="flex items-center gap-2">
                                <Icon name={getIconFromLocationValue(location)} className="h-4 w-4" />
                                {provider?.label
                                  ? t("join_event_location", { eventLocationType: provider?.label })
                                  : t("join_meeting")}
                              </div>
                            </a>
                          )}
                      </div>
                    )}
                    <BookingItemBadges
                      booking={booking}
                      isPending={isPending}
                      recurringDates={recurringDates}
                      userTimeFormat={userTimeFormat}
                      userTimeZone={userTimeZone}
                      isRescheduled={isRescheduled}
                      isRejected={isRejected}
                      isCancelledAndRescheduled={isCancelled && !!booking.rescheduled}
                    />
                  </div>
                </div>

                <div className="flex w-full flex-col lg:w-auto">
                  <div className="flex w-full flex-row flex-wrap items-end justify-end space-x-2 space-y-2 py-4 pl-4 text-right text-sm font-medium lg:flex-row lg:flex-nowrap lg:items-start lg:space-y-0 lg:pl-0 ltr:pr-4 rtl:pl-4">
                    {shouldShowPendingActions(actionContext) && <TableActions actions={pendingActions} />}
                    <Button
                      color="secondary"
                      disabled={!hasWorkflowInsights || isRejected}
                      StartIcon="zap"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsWorkflowStatusDialogOpen(true);
                      }}
                      className="flex items-center space-x-2"
                      aria-label="View workflow status">
                      <span>{t("workflow_status")}</span>
                    </Button>

                    {showBookingSeatsDialogButton && (
                      <Button
                        color="secondary"
                        onClick={() => setIsBookingSeatsDialogOpen(true)}
                        className="flex items-center space-x-2">
                        <span>{t("booking_seats")}</span>
                      </Button>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button StartIcon="ellipsis" color="secondary" variant="button" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {editEventActions.map((action) => (
                          <DropdownMenuItem
                            key={action.id}
                            className="rounded-lg"
                            disabled={action.disabled}
                            color={action.color}
                            StartIcon={action.icon}
                            href={action.href}
                            onClick={action.onClick}
                            data-bookingid={action.bookingId}
                            data-testid={action.id}>
                            {action.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex-1" />

                  <div className="flex flex-row justify-end pr-4">
                    <button
                      className="align-end text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedBooking(expandedBooking === booking.id ? null : booking.id);
                      }}>
                      <span>{t("details")}</span>
                      <Icon
                        name="chevron-down"
                        className={`h-4 w-4 transition-transform ${
                          expandedBooking === booking.id ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {expandedBooking === booking.id && (
              <BookingExpandedCard key={booking.id} isHost={true} showExpandedActions={true} {...booking} />
            )}
          </div>
        </div>
      </div>

      {isBookingFromRoutingForm && (
        <RerouteDialog
          isOpenDialog={rerouteDialogIsOpen}
          setIsOpenDialog={setRerouteDialogIsOpen}
          booking={{ ...parsedBooking, eventType: parsedBooking.eventType }}
        />
      )}
    </>
  );
}

const BookingItemBadges = ({
  booking,
  isPending,
  recurringDates,
  userTimeFormat,
  userTimeZone,
  isRescheduled,
  isRejected,
  isCancelledAndRescheduled,
}: {
  booking: BookingItemProps;
  isPending: boolean;
  recurringDates: Date[] | undefined;
  userTimeFormat: number | null | undefined;
  userTimeZone: string | undefined;
  isRescheduled: boolean;
  isRejected?: boolean;
  isCancelledAndRescheduled?: boolean;
}) => {
  const { t } = useLocale();

  return (
    <div className="flex flex-row flex-wrap items-center gap-2">
      {isRejected && <Badge variant="gray">{t("rejected")}</Badge>}
      {isCancelledAndRescheduled && (
        <Badge startIcon="send" size="md" variant="gray" data-testid="request_reschedule_sent">
          {t("reschedule_request_sent")}
        </Badge>
      )}
      {isPending && <Badge variant="orange">{t("unconfirmed")}</Badge>}
      {isRescheduled && (
        <Tooltip content={`${t("rescheduled_by")} ${booking.rescheduler}`}>
          <Badge variant="orange">{t("rescheduled")}</Badge>
        </Tooltip>
      )}
      {booking.eventType?.calIdTeam && <Badge variant="gray">{booking.eventType.calIdTeam.name}</Badge>}
      {booking?.assignmentReason.length > 0 && (
        <AssignmentReasonTooltip
          assignmentReason={{
            ...booking.assignmentReason[0],
            createdAt: new Date(booking.assignmentReason[0].createdAt),
          }}
        />
      )}
      {booking.paid && !booking.payment[0] ? (
        <Badge variant="orange">{t("error_collecting_card")}</Badge>
      ) : booking.paid ? (
        booking.paid &&
        (isPrismaObjOrUndefined(booking.metadata)?.paymentStatus === "refunded" ? (
          <Badge className="ltr:mr-2 rtl:ml-2" variant="red" data-testid="refunded_badge">
            {t("refunded")}
          </Badge>
        ) : (
          <Badge className="ltr:mr-2 rtl:ml-2" variant="green" data-testid="paid_badge">
            {booking.payment[0].paymentOption === "HOLD" ? t("card_held") : t("paid")}
          </Badge>
        ))
      ) : null}

      {recurringDates !== undefined && (
        <div className="text-muted -mt-1 text-sm">
          <RecurringBookingsTooltip
            userTimeFormat={userTimeFormat}
            userTimeZone={userTimeZone}
            booking={booking}
            recurringDates={recurringDates}
          />
        </div>
      )}
    </div>
  );
};

interface RecurringBookingsTooltipProps {
  booking: BookingItemProps;
  recurringDates: Date[];
  userTimeZone: string | undefined;
  userTimeFormat: number | null | undefined;
}

const RecurringBookingsTooltip = ({
  booking,
  recurringDates,
  userTimeZone,
  userTimeFormat,
}: RecurringBookingsTooltipProps) => {
  const {
    t,
    i18n: { language },
  } = useLocale();
  const now = new Date();

  // NEW: Calculate remaining count from generated occurrences, excluding cancelled dates
  const recurringCount =
    recurringDates?.filter((recurringDate) => {
      return (
        recurringDate.getTime() >= now.getTime() &&
        !(booking.recurringInfo?.bookings.CANCELLED ?? []).includes(recurringDate)
      );
    }).length ?? 0;

  //  Check if booking has recurring metadata
  const hasRecurringEvent = !!(booking.metadata as Record<string, any> | null)?.recurringEvent;

  return (
    (booking.recurringInfo &&
      hasRecurringEvent &&
      (booking.listingStatus === "recurring" ||
        booking.listingStatus === "unconfirmed" ||
        booking.listingStatus === "cancelled") && (
        <div className="underline decoration-gray-400 decoration-dashed underline-offset-2">
          <div className="flex">
            <Tooltip
              content={recurringDates.map((aDate, key) => {
                const pastOrCancelled =
                  aDate < now ||
                  booking.recurringInfo?.bookings.CANCELLED.map((date) => date.toString()).includes(
                    aDate.toString()
                  );
                return (
                  <p key={key} className={classNames(pastOrCancelled && "line-through")}>
                    {formatTime(aDate, userTimeFormat, userTimeZone)}
                    {" - "}
                    {dayjs(aDate).locale(language).format("D MMMM YYYY")}
                  </p>
                );
              })}>
              <div className="text-default flex items-center gap-2">
                <Icon
                  name="refresh-ccw"
                  strokeWidth="3"
                  className="text-muted float-left inline-block h-4 w-4"
                />
                <p className="text-xs">
                  {booking.status === BookingStatus.ACCEPTED
                    ? `${t("event_remaining_other", {
                        count: recurringCount,
                      })}`
                    : getEveryFreqFor({
                        t,
                        recurringEvent: (booking.metadata as Record<string, any>)?.recurringEvent,
                        recurringCount: booking.recurringInfo.count,
                      })}
                </p>
              </div>
            </Tooltip>
          </div>
        </div>
      )) ||
    null
  );
};

interface UserProps {
  id: number;
  name: string | null;
  email: string;
}

const FirstAttendee = ({
  user,
  currentEmail,
}: {
  user: UserProps;
  currentEmail: string | null | undefined;
}) => {
  const { t } = useLocale();
  return user.email === currentEmail ? (
    <div className="inline-block">{t("you")}</div>
  ) : (
    <a
      key={user.email}
      className=" hover:text-blue-500"
      href={`mailto:${user.email}`}
      onClick={(e) => e.stopPropagation()}>
      {user.name || user.email}
    </a>
  );
};

type AttendeeProps = {
  name?: string;
  email: string;
  phoneNumber: string | null;
  id: number;
  noShow: boolean;
};

type NoShowProps = {
  bookingUid: string;
  isBookingInPast: boolean;
};

const Attendee = (attendeeProps: AttendeeProps & NoShowProps) => {
  const { email, name, bookingUid, isBookingInPast, noShow, phoneNumber } = attendeeProps;
  const { t } = useLocale();

  const utils = trpc.useUtils();
  const [openDropdown, setOpenDropdown] = useState(false);
  const { copyToClipboard, isCopied } = useCopy();

  const noShowMutation = trpc.viewer.loggedInViewerRouter.markNoShow.useMutation({
    onSuccess: async (data) => {
      triggerToast(data.message, "success");
      await utils.viewer.bookings.invalidate();
    },
    onError: (err) => {
      triggerToast(err.message, "error");
    },
  });

  return (
    <DropdownMenu open={openDropdown} onOpenChange={setOpenDropdown}>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="guest"
          onClick={(e) => e.stopPropagation()}
          className="radix-state-open:text-blue-500 transition hover:text-blue-500">
          {noShow ? (
            <>
              {name || email} <Icon name="eye-off" className="inline h-4" />
            </>
          ) : (
            <>{name || email}</>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        {!isSmsCalEmail(email) && (
          <DropdownMenuItem
            className="focus:outline-none"
            StartIcon="mail"
            href={`mailto:${email}`}
            onClick={(e) => {
              setOpenDropdown(false);
              e.stopPropagation();
            }}>
            {t("email")}
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          className="focus:outline-none"
          StartIcon={isCopied ? "clipboard-check" : "clipboard"}
          onClick={(e) => {
            e.preventDefault();
            const isEmailCopied = isSmsCalEmail(email);
            copyToClipboard(isEmailCopied ? email : phoneNumber ?? "");
            setOpenDropdown(false);
            triggerToast(isEmailCopied ? t("email_copied") : t("phone_number_copied"), "success");
          }}>
          {!isCopied ? t("copy") : t("copied")}
        </DropdownMenuItem>

        {isBookingInPast && (
          <DropdownMenuItem
            className="focus:outline-none"
            data-testid={noShow ? "unmark-no-show" : "mark-no-show"}
            onClick={(e) => {
              e.preventDefault();
              setOpenDropdown(false);
              noShowMutation.mutate({
                bookingUid,
                attendees: [{ noShow: !noShow, email }],
              });
            }}
            StartIcon={noShow ? "eye" : "eye-off"}>
            {noShow ? t("unmark_as_no_show") : t("mark_as_no_show")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

type GroupedAttendeeProps = {
  attendees: AttendeeProps[];
  bookingUid: string;
};

const GroupedAttendees = (groupedAttendeeProps: GroupedAttendeeProps) => {
  const { bookingUid } = groupedAttendeeProps;
  const attendees = groupedAttendeeProps.attendees.map((attendee) => {
    return {
      id: attendee.id,
      email: attendee.email,
      name: attendee.name,
      noShow: attendee.noShow || false,
    };
  });
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const noShowMutation = trpc.viewer.loggedInViewerRouter.markNoShow.useMutation({
    onSuccess: async (data) => {
      triggerToast(t(data.message), "success");
      await utils.viewer.bookings.invalidate();
    },
    onError: (err) => {
      triggerToast(err.message, "error");
    },
  });
  const { control, handleSubmit } = useForm<{
    attendees: AttendeeProps[];
  }>({
    defaultValues: {
      attendees,
    },
    mode: "onBlur",
  });

  const { fields } = useFieldArray({
    control,
    name: "attendees",
  });

  const onSubmit = (data: { attendees: AttendeeProps[] }) => {
    const filteredData = data.attendees.slice(1);
    noShowMutation.mutate({ bookingUid, attendees: filteredData });
    setOpenDropdown(false);
  };

  const [openDropdown, setOpenDropdown] = useState(false);

  return (
    <DropdownMenu open={openDropdown} onOpenChange={setOpenDropdown}>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="more-guests"
          onClick={(e) => e.stopPropagation()}
          className="radix-state-open:text-blue-500 transition hover:text-blue-500 focus:outline-none">
          {t("plus_more", { count: attendees.length - 1 })}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuLabel className="text-xs font-medium uppercase">
          {t("mark_as_no_show_title")}
        </DropdownMenuLabel>

        <form onSubmit={handleSubmit(onSubmit)}>
          {fields.slice(1).map((field, index) => (
            <Controller
              key={field.id}
              name={`attendees.${index + 1}.noShow`}
              control={control}
              render={({ field: { onChange, value } }) => (
                <DropdownMenuCheckboxItem
                  checked={value || false}
                  onCheckedChange={onChange}
                  className="pr-8 focus:outline-none"
                  onClick={(e) => {
                    e.preventDefault();
                    onChange(!value);
                  }}>
                  <span className={value ? "line-through" : ""}>{field.email}</span>
                </DropdownMenuCheckboxItem>
              )}
            />
          ))}

          <DropdownMenuSeparator />

          <div className="flex justify-end p-2">
            <Button
              data-testid="update-no-show"
              color="secondary"
              onClick={(e) => {
                e.preventDefault();
                handleSubmit(onSubmit)();
              }}>
              {t("mark_as_no_show_title")}
            </Button>
          </div>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const NoShowAttendeesDialog = ({
  attendees,
  isOpen,
  setIsOpen,
  bookingUid,
}: {
  attendees: AttendeeProps[];
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  bookingUid: string;
}) => {
  const { t } = useLocale();
  const [noShowAttendees, setNoShowAttendees] = useState(
    attendees.map((attendee) => ({
      id: attendee.id,
      email: attendee.email,
      name: attendee.name,
      noShow: attendee.noShow || false,
    }))
  );

  const utils = trpc.useUtils();
  const noShowMutation = trpc.viewer.loggedInViewerRouter.markNoShow.useMutation({
    onSuccess: async (data) => {
      const newValue = data.attendees[0];
      setNoShowAttendees((old) =>
        old.map((attendee) =>
          attendee.email === newValue.email ? { ...attendee, noShow: newValue.noShow } : attendee
        )
      );
      triggerToast(t(data.message), "success");
      await utils.viewer.bookings.invalidate();
    },
    onError: (err) => {
      triggerToast(err.message, "error");
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={() => setIsOpen(false)}>
      <DialogContent title={t("mark_as_no_show_title")} description={t("no_show_description")}>
        {noShowAttendees.map((attendee) => (
          <form
            key={attendee.id}
            onSubmit={(e) => {
              e.preventDefault();
              noShowMutation.mutate({
                bookingUid,
                attendees: [{ email: attendee.email, noShow: !attendee.noShow }],
              });
            }}>
            <div className="bg-muted flex items-center justify-between rounded-md px-4 py-2">
              <span className="text-emphasis flex flex-col text-sm">
                {attendee.name}
                {attendee.email && <span className="text-muted">({attendee.email})</span>}
              </span>
              <Button color="minimal" type="submit" StartIcon={attendee.noShow ? "eye-off" : "eye"}>
                {attendee.noShow ? t("unmark_as_no_show") : t("mark_as_no_show")}
              </Button>
            </div>
          </form>
        ))}
        <DialogFooter noSticky>
          <DialogClose>{t("done")}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const GroupedGuests = ({ guests }: { guests: AttendeeProps[] }) => {
  const [openDropdown, setOpenDropdown] = useState(false);
  const { t } = useLocale();
  const { copyToClipboard, isCopied } = useCopy();
  const [selectedEmail, setSelectedEmail] = useState("");

  return (
    <DropdownMenu
      open={openDropdown}
      onOpenChange={(value) => {
        setOpenDropdown(value);
        setSelectedEmail("");
      }}>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="radix-state-open:text-blue-500 transition hover:text-blue-500 focus:outline-none">
          {t("plus_more", { count: guests.length - 1 })}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuLabel className="text-xs font-medium uppercase">{t("guests")}</DropdownMenuLabel>

        {guests.slice(1).map((guest) => (
          <DropdownMenuItem
            key={guest.id}
            className="pr-6 focus:outline-none"
            StartIcon={selectedEmail === guest.email ? "circle-check" : undefined}
            onClick={(e) => {
              e.preventDefault();
              setSelectedEmail(guest.email);
            }}>
            <span className={selectedEmail !== guest.email ? "pl-6" : ""}>{guest.email}</span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <div className="flex justify-end space-x-2 p-2">
          <Link href={`mailto:${selectedEmail}`}>
            <Button
              color="secondary"
              disabled={selectedEmail.length === 0}
              onClick={(e) => {
                setOpenDropdown(false);
                e.stopPropagation();
              }}>
              {t("email")}
            </Button>
          </Link>

          <Button
            color="secondary"
            disabled={selectedEmail.length === 0}
            onClick={(e) => {
              e.preventDefault();
              copyToClipboard(selectedEmail);
              triggerToast(t("email_copied"), "success");
            }}>
            {!isCopied ? t("copy") : t("copied")}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const DisplayAttendees = ({
  attendees,
  user,
  currentEmail,
  bookingUid,
  isBookingInPast,
}: {
  attendees: AttendeeProps[];
  user: UserProps | null;
  currentEmail?: string | null;
  bookingUid: string;
  isBookingInPast: boolean;
}) => {
  const { t } = useLocale();
  attendees.sort((a, b) => a.id - b.id);

  return (
    <div className="align-center !decoration-none text-sm font-bold text-slate-500">
      {/* {attendees.length > 1 ? <span>,&nbsp;</span> : <span>&nbsp;{t("and")}&nbsp;</span>} */}
      <Attendee
        name={attendees[0].name}
        email={attendees[0].email}
        phoneNumber={attendees[0].phoneNumber}
        id={attendees[0].id}
        noShow={attendees[0].noShow}
        bookingUid={bookingUid}
        isBookingInPast={isBookingInPast}
      />
      {attendees.length > 1 && (
        <>
          <div>&nbsp;{t("and")}&nbsp;</div>
          {attendees.length > 2 ? (
            <Tooltip
              content={attendees.slice(1).map((attendee) => (
                <p key={attendee.email}>
                  <Attendee {...attendee} bookingUid={bookingUid} isBookingInPast={isBookingInPast} />
                </p>
              ))}>
              {isBookingInPast ? (
                <GroupedAttendees attendees={attendees} bookingUid={bookingUid} />
              ) : (
                <GroupedGuests guests={attendees} />
              )}
            </Tooltip>
          ) : (
            <Attendee {...attendees[1]} bookingUid={bookingUid} isBookingInPast={isBookingInPast} />
          )}
        </>
      )}
    </div>
  );
};

const AssignmentReasonTooltip = ({ assignmentReason }: { assignmentReason: AssignmentReason }) => {
  const { t } = useLocale();
  const badgeTitle = assignmentReasonBadgeTitleMap(assignmentReason.reasonEnum);
  return (
    <Tooltip content={<p>{assignmentReason.reasonString}</p>}>
      <Badge className="ltr:mr-2 rtl:ml-2" variant="gray">
        {t(badgeTitle)}
      </Badge>
    </Tooltip>
  );
};
