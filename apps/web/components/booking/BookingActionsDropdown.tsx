import { useState } from "react";
import type { z } from "zod";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { MeetingSessionDetailsDialog } from "@calcom/features/ee/video/MeetingSessionDetailsDialog";
import ViewRecordingsDialog from "@calcom/features/ee/video/ViewRecordingsDialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@calcom/ui/components/dropdown";
import { TextAreaField } from "@calcom/ui/components/form";
import type { ActionType } from "@calcom/ui/components/table";
import { showToast } from "@calcom/ui/components/toast";

import { AddGuestsDialog } from "@components/dialog/AddGuestsDialog";
import { ChargeCardDialog } from "@components/dialog/ChargeCardDialog";
import { EditLocationDialog } from "@components/dialog/EditLocationDialog";
import { ReassignDialog } from "@components/dialog/ReassignDialog";
import { ReportBookingDialog } from "@components/dialog/ReportBookingDialog";
import { RerouteDialog } from "@components/dialog/RerouteDialog";
import { RescheduleDialog } from "@components/dialog/RescheduleDialog";

import { useBookingActionsStoreContext } from "./BookingActionsStoreProvider";
import {
  getCancelEventAction,
  getEditEventActions,
  getAfterEventActions,
  getReportAction,
  shouldShowEditActions,
  type BookingActionContext,
} from "./bookingActions";
import type { BookingItemProps } from "./types";

interface BookingActionsDropdownProps {
  booking: BookingItemProps;
}

export function BookingActionsDropdown({ booking }: BookingActionsDropdownProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  // Use store for all dialog states
  const rejectionReason = useBookingActionsStoreContext((state) => state.rejectionReason);
  const setRejectionReason = useBookingActionsStoreContext((state) => state.setRejectionReason);
  const rejectionDialogIsOpen = useBookingActionsStoreContext((state) => state.rejectionDialogIsOpen);
  const setRejectionDialogIsOpen = useBookingActionsStoreContext((state) => state.setRejectionDialogIsOpen);
  const chargeCardDialogIsOpen = useBookingActionsStoreContext((state) => state.chargeCardDialogIsOpen);
  const setChargeCardDialogIsOpen = useBookingActionsStoreContext((state) => state.setChargeCardDialogIsOpen);
  const viewRecordingsDialogIsOpen = useBookingActionsStoreContext(
    (state) => state.viewRecordingsDialogIsOpen
  );
  const setViewRecordingsDialogIsOpen = useBookingActionsStoreContext(
    (state) => state.setViewRecordingsDialogIsOpen
  );
  const meetingSessionDetailsDialogIsOpen = useBookingActionsStoreContext(
    (state) => state.meetingSessionDetailsDialogIsOpen
  );
  const setMeetingSessionDetailsDialogIsOpen = useBookingActionsStoreContext(
    (state) => state.setMeetingSessionDetailsDialogIsOpen
  );
  const isNoShowDialogOpen = useBookingActionsStoreContext((state) => state.isNoShowDialogOpen);
  const setIsNoShowDialogOpen = useBookingActionsStoreContext((state) => state.setIsNoShowDialogOpen);
  const isOpenRescheduleDialog = useBookingActionsStoreContext((state) => state.isOpenRescheduleDialog);
  const setIsOpenRescheduleDialog = useBookingActionsStoreContext((state) => state.setIsOpenRescheduleDialog);
  const isOpenReassignDialog = useBookingActionsStoreContext((state) => state.isOpenReassignDialog);
  const setIsOpenReassignDialog = useBookingActionsStoreContext((state) => state.setIsOpenReassignDialog);
  const isOpenSetLocationDialog = useBookingActionsStoreContext((state) => state.isOpenSetLocationDialog);
  const setIsOpenLocationDialog = useBookingActionsStoreContext((state) => state.setIsOpenLocationDialog);
  const isOpenAddGuestsDialog = useBookingActionsStoreContext((state) => state.isOpenAddGuestsDialog);
  const setIsOpenAddGuestsDialog = useBookingActionsStoreContext((state) => state.setIsOpenAddGuestsDialog);
  const isOpenReportDialog = useBookingActionsStoreContext((state) => state.isOpenReportDialog);
  const setIsOpenReportDialog = useBookingActionsStoreContext((state) => state.setIsOpenReportDialog);
  const rerouteDialogIsOpen = useBookingActionsStoreContext((state) => state.rerouteDialogIsOpen);
  const setRerouteDialogIsOpen = useBookingActionsStoreContext((state) => state.setRerouteDialogIsOpen);

  const cardCharged = booking?.payment[0]?.success;

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
      showToast(data.message, "success");
      await utils.viewer.bookings.invalidate();
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const mutation = trpc.viewer.bookings.confirm.useMutation({
    onSuccess: (data) => {
      if (data?.status === "REJECTED") {
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

  const setLocationMutation = trpc.viewer.bookings.editLocation.useMutation({
    onSuccess: () => {
      showToast(t("location_updated"), "success");
      setIsOpenLocationDialog(false);
      utils.viewer.bookings.invalidate();
    },
    onError: (e) => {
      const errorMessages: Record<string, string> = {
        UNAUTHORIZED: t("you_are_unauthorized_to_make_this_change_to_the_booking"),
        BAD_REQUEST: e.message,
      };

      const message = errorMessages[e.data?.code as string] || t("location_update_failed");
      showToast(message, "error");
    },
  });

  const isUpcoming = new Date(booking.endTime) >= new Date();
  const isOngoing = isUpcoming && new Date() >= new Date(booking.startTime);
  const isBookingInPast = new Date(booking.endTime) < new Date();
  const isCancelled = booking.status === "CANCELLED";
  const isConfirmed = booking.status === "ACCEPTED";
  const isRejected = booking.status === "REJECTED";
  const isPending = booking.status === "PENDING";
  const isRescheduled = booking.fromReschedule !== null;
  const isRecurring = booking.recurringEventId !== null;

  const getBookingStatus = (): "upcoming" | "past" | "cancelled" | "rejected" => {
    if (isCancelled) return "cancelled";
    if (isRejected) return "rejected";
    if (isBookingInPast) return "past";
    return "upcoming";
  };

  const isTabRecurring = booking.listingStatus === "recurring";
  const isTabUnconfirmed = booking.listingStatus === "unconfirmed";

  const isBookingFromRoutingForm = !!booking.routedFromRoutingFormReponse && !!booking.eventType?.team;

  const userEmail = booking.loggedInUser.userEmail;
  const userSeat = booking.seatsReferences.find((seat) => !!userEmail && seat.attendee?.email === userEmail);
  const isAttendee = !!userSeat;

  const isCalVideoLocation =
    !booking.location ||
    booking.location === "integrations:daily" ||
    (typeof booking.location === "string" && booking.location.trim() === "");

  const isDisabledCancelling = booking.eventType.disableCancelling;
  const isDisabledRescheduling = booking.eventType.disableRescheduling;

  const getSeatReferenceUid = () => {
    return userSeat?.referenceUid;
  };

  const bookingConfirm = async (confirm: boolean) => {
    let body = {
      bookingId: booking.id,
      confirmed: confirm,
      reason: rejectionReason,
    };

    if ((isTabRecurring || isTabUnconfirmed) && isRecurring) {
      body = Object.assign({}, body, { recurringEventId: booking.recurringEventId });
    }
    mutation.mutate(body);
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
    isDisabledRescheduling,
    isCalVideoLocation,
    showPendingPayment: false, // This will be calculated below
    isAttendee,
    cardCharged,
    attendeeList,
    getSeatReferenceUid,
    t,
  } as BookingActionContext;

  const cancelEventAction = getCancelEventAction(actionContext);

  const baseEditEventActions = getEditEventActions(actionContext);
  const editEventActions: ActionType[] = baseEditEventActions.map((action) => ({
    ...action,
    onClick:
      action.id === "reschedule_request"
        ? () => setIsOpenRescheduleDialog(true)
        : action.id === "reroute"
        ? () => setRerouteDialogIsOpen(true)
        : action.id === "change_location"
        ? () => setIsOpenLocationDialog(true)
        : action.id === "add_members"
        ? () => setIsOpenAddGuestsDialog(true)
        : action.id === "reassign"
        ? () => setIsOpenReassignDialog(true)
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

  const reportAction = getReportAction(actionContext);
  const reportActionWithHandler = {
    ...reportAction,
    onClick: () => setIsOpenReportDialog(true),
  };

  const NoShowAttendeesDialog = ({
    bookingUid,
    attendees,
    setIsOpen,
    isOpen,
  }: {
    bookingUid: string;
    attendees: Array<{
      name: string;
      email: string;
      id: number;
      noShow: boolean;
      phoneNumber: string | null;
    }>;
    setIsOpen: (open: boolean) => void;
    isOpen: boolean;
  }) => {
    const [noShowAttendees, setNoShowAttendees] = useState<
      Array<{
        email: string;
        noShow: boolean;
      }>
    >(attendees.map((attendee) => ({ email: attendee.email, noShow: attendee.noShow })));

    const noShowMutation = trpc.viewer.loggedInViewerRouter.markNoShow.useMutation({
      onSuccess: async (data) => {
        showToast(data.message, "success");
        setIsOpen(false);
        await utils.viewer.bookings.invalidate();
      },
      onError: (err) => {
        showToast(err.message, "error");
      },
    });

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent title={t("mark_as_no_show")}>
          <div className="space-y-2">
            {attendees.map((attendee, index) => (
              <label key={attendee.email} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={noShowAttendees[index]?.noShow || false}
                  onChange={(e) => {
                    const newNoShowAttendees = [...noShowAttendees];
                    newNoShowAttendees[index] = {
                      email: attendee.email,
                      noShow: e.target.checked,
                    };
                    setNoShowAttendees(newNoShowAttendees);
                  }}
                />
                <span>
                  {attendee.name} ({attendee.email})
                </span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <DialogClose />
            <Button
              onClick={() => {
                noShowMutation.mutate({
                  bookingUid,
                  attendees: noShowAttendees,
                });
              }}>
              {t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const parsedBooking = {
    ...booking,
    eventType: booking.eventType.id ? booking.eventType : null,
  };

  // Render dialogs that might be triggered from BookingListItem even if dropdown is not shown
  const dialogs = (
    <>
      <RescheduleDialog
        isOpenDialog={isOpenRescheduleDialog}
        setIsOpenDialog={setIsOpenRescheduleDialog}
        bookingUId={booking.uid}
      />
      {isOpenReassignDialog && (
        <ReassignDialog
          isOpenDialog={isOpenReassignDialog}
          setIsOpenDialog={setIsOpenReassignDialog}
          bookingId={booking.id}
          teamId={booking.eventType?.team?.id || 0}
          bookingFromRoutingForm={isBookingFromRoutingForm}
        />
      )}
      <EditLocationDialog
        booking={booking}
        saveLocation={saveLocation}
        isOpenDialog={isOpenSetLocationDialog}
        setShowLocationModal={setIsOpenLocationDialog}
        teamId={booking.eventType?.team?.id}
      />
      <AddGuestsDialog
        isOpenDialog={isOpenAddGuestsDialog}
        setIsOpenDialog={setIsOpenAddGuestsDialog}
        bookingId={booking.id}
      />
      <ReportBookingDialog
        isOpenDialog={isOpenReportDialog}
        setIsOpenDialog={setIsOpenReportDialog}
        bookingUid={booking.uid}
        isRecurring={isRecurring}
        status={getBookingStatus()}
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
          timeFormat={booking.loggedInUser.userTimeFormat ?? null}
        />
      )}
      {isCalVideoLocation && meetingSessionDetailsDialogIsOpen && (
        <MeetingSessionDetailsDialog
          booking={booking}
          isOpenDialog={meetingSessionDetailsDialogIsOpen}
          setIsOpenDialog={setMeetingSessionDetailsDialogIsOpen}
          timeFormat={booking.loggedInUser.userTimeFormat ?? null}
        />
      )}
      {isNoShowDialogOpen && (
        <NoShowAttendeesDialog
          bookingUid={booking.uid}
          attendees={attendeeList}
          setIsOpen={setIsNoShowDialogOpen}
          isOpen={isNoShowDialogOpen}
        />
      )}
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
              disabled={mutation.isPending}
              data-testid="rejection-confirm"
              onClick={() => {
                bookingConfirm(false);
              }}>
              {t("rejection_confirmation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isBookingFromRoutingForm &&
        parsedBooking.eventType &&
        parsedBooking.eventType.id !== undefined &&
        parsedBooking.eventType.slug !== undefined &&
        parsedBooking.eventType.title !== undefined &&
        parsedBooking.routedFromRoutingFormReponse && (
          <RerouteDialog
            isOpenDialog={rerouteDialogIsOpen}
            setIsOpenDialog={setRerouteDialogIsOpen}
            booking={{
              ...parsedBooking,
              metadata: parsedBooking.metadata as z.infer<typeof bookingMetadataSchema>,
              routedFromRoutingFormReponse: parsedBooking.routedFromRoutingFormReponse,
              eventType: {
                length: parsedBooking.eventType.length ?? 0,
                schedulingType: parsedBooking.eventType.schedulingType ?? null,
                title: parsedBooking.eventType.title,
                id: parsedBooking.eventType.id,
                slug: parsedBooking.eventType.slug,
                team: parsedBooking.eventType.team ?? null,
              },
            }}
          />
        )}
    </>
  );

  // Don't render dropdown if edit actions shouldn't be shown
  if (!shouldShowEditActions(actionContext)) {
    return dialogs;
  }

  return (
    <>
      {dialogs}
      <Dropdown>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            color="secondary"
            variant="icon"
            StartIcon="ellipsis"
            data-testid="booking-actions-dropdown"
          />
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuLabel className="px-2 pb-1 pt-1.5">{t("edit_event")}</DropdownMenuLabel>
            {editEventActions.map((action) => (
              <DropdownMenuItem className="rounded-lg" key={action.id} disabled={action.disabled}>
                <DropdownItem
                  type="button"
                  color={action.color}
                  StartIcon={action.icon}
                  href={action.href}
                  disabled={action.disabled}
                  onClick={action.onClick}
                  data-bookingid={action.bookingId}
                  data-testid={action.id}
                  className={action.disabled ? "text-muted" : undefined}>
                  {action.label}
                </DropdownItem>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="px-2 pb-1 pt-1.5">{t("after_event")}</DropdownMenuLabel>
            {afterEventActions.map((action) => (
              <DropdownMenuItem className="rounded-lg" key={action.id} disabled={action.disabled}>
                <DropdownItem
                  type="button"
                  color={action.color}
                  StartIcon={action.icon}
                  href={action.href}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  data-bookingid={action.bookingId}
                  data-testid={action.id}
                  className={action.disabled ? "text-muted" : undefined}>
                  {action.label}
                </DropdownItem>
              </DropdownMenuItem>
            ))}
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="rounded-lg"
                key={reportActionWithHandler.id}
                disabled={reportActionWithHandler.disabled}>
                <DropdownItem
                  type="button"
                  color={reportActionWithHandler.color}
                  StartIcon={reportActionWithHandler.icon}
                  onClick={reportActionWithHandler.onClick}
                  disabled={reportActionWithHandler.disabled}
                  data-testid={reportActionWithHandler.id}
                  className={reportActionWithHandler.disabled ? "text-muted" : undefined}>
                  {reportActionWithHandler.label}
                </DropdownItem>
              </DropdownMenuItem>
            </>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="rounded-lg"
              key={cancelEventAction.id}
              disabled={cancelEventAction.disabled}>
              <DropdownItem
                type="button"
                color={cancelEventAction.color}
                StartIcon={cancelEventAction.icon}
                href={cancelEventAction.disabled ? undefined : cancelEventAction.href}
                onClick={cancelEventAction.onClick}
                disabled={cancelEventAction.disabled}
                data-bookingid={cancelEventAction.bookingId}
                data-testid={cancelEventAction.id}
                className={cancelEventAction.disabled ? "text-muted" : undefined}>
                {cancelEventAction.label}
              </DropdownItem>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </Dropdown>
    </>
  );
}
