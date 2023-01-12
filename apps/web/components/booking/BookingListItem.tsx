import { BookingStatus } from "@prisma/client";
import { useRouter } from "next/router";
import { useState } from "react";

import { EventLocationType, getEventLocationType } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import ViewRecordingsDialog from "@calcom/features/ee/video/ViewRecordingsDialog";
import classNames from "@calcom/lib/classNames";
import { formatTime } from "@calcom/lib/date-fns";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { getEveryFreqFor } from "@calcom/lib/recurringStrings";
import { RouterInputs, RouterOutputs, trpc } from "@calcom/trpc/react";
import {
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  Icon,
  MeetingTimeInTimezones,
  showToast,
  TextArea,
  Tooltip,
  ActionType,
  TableActions,
} from "@calcom/ui";

import useMeQuery from "@lib/hooks/useMeQuery";

import { EditLocationDialog } from "@components/dialog/EditLocationDialog";
import { RescheduleDialog } from "@components/dialog/RescheduleDialog";

type BookingListingStatus = RouterInputs["viewer"]["bookings"]["get"]["filters"]["status"];

type BookingItem = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][number];

type BookingItemProps = BookingItem & {
  listingStatus: BookingListingStatus;
  recurringInfo: RouterOutputs["viewer"]["bookings"]["get"]["recurringInfo"][number] | undefined;
};

function BookingListItem(booking: BookingItemProps) {
  // Get user so we can determine 12/24 hour format preferences
  const query = useMeQuery();
  const user = query.data;
  const { t } = useLocale();
  const utils = trpc.useContext();
  const router = useRouter();
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [rejectionDialogIsOpen, setRejectionDialogIsOpen] = useState(false);
  const [viewRecordingsDialogIsOpen, setViewRecordingsDialogIsOpen] = useState<boolean>(false);
  const mutation = trpc.viewer.bookings.confirm.useMutation({
    onSuccess: (data) => {
      if (data.status === BookingStatus.REJECTED) {
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

  const isUpcoming = new Date(booking.endTime) >= new Date();
  const isPast = new Date(booking.endTime) < new Date();
  const isCancelled = booking.status === BookingStatus.CANCELLED;
  const isConfirmed = booking.status === BookingStatus.ACCEPTED;
  const isRejected = booking.status === BookingStatus.REJECTED;
  const isPending = booking.status === BookingStatus.PENDING;
  const isRecurring = booking.recurringEventId !== null;
  const isTabRecurring = booking.listingStatus === "recurring";
  const isTabUnconfirmed = booking.listingStatus === "unconfirmed";

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

  const pendingActions: ActionType[] = [
    {
      id: "reject",
      label: (isTabRecurring || isTabUnconfirmed) && isRecurring ? t("reject_all") : t("reject"),
      onClick: () => {
        setRejectionDialogIsOpen(true);
      },
      icon: Icon.FiSlash,
      disabled: mutation.isLoading,
    },
    {
      id: "confirm",
      label: (isTabRecurring || isTabUnconfirmed) && isRecurring ? t("confirm_all") : t("confirm"),
      onClick: () => {
        bookingConfirm(true);
      },
      icon: Icon.FiCheck,
      disabled: mutation.isLoading,
      color: "primary",
    },
  ];

  const showRecordingActions: ActionType[] = [
    {
      id: "view_recordings",
      label: t("view_recordings"),
      onClick: () => {
        setViewRecordingsDialogIsOpen(true);
      },
      disabled: mutation.isLoading,
    },
  ];

  let bookedActions: ActionType[] = [
    {
      id: "cancel",
      label: isTabRecurring && isRecurring ? t("cancel_all_remaining") : t("cancel"),
      /* When cancelling we need to let the UI and the API know if the intention is to
         cancel all remaining bookings or just that booking instance. */
      href: `/booking/${booking.uid}?cancel=true${
        isTabRecurring && isRecurring ? "&allRemainingBookings=true" : ""
      }`,
      icon: Icon.FiX,
    },
    {
      id: "edit_booking",
      label: t("edit"),
      actions: [
        {
          id: "reschedule",
          icon: Icon.FiClock,
          label: t("reschedule_booking"),
          href: `/reschedule/${booking.uid}`,
        },
        {
          id: "reschedule_request",
          icon: Icon.FiSend,
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
          icon: Icon.FiMapPin,
        },
      ],
    },
  ];

  if (isTabRecurring && isRecurring) {
    bookedActions = bookedActions.filter((action) => action.id !== "edit_booking");
  }

  if (isPast && isPending && !isConfirmed) {
    bookedActions = bookedActions.filter((action) => action.id !== "cancel");
  }

  const RequestSentMessage = () => {
    return (
      <div className="ml-1 mr-8 flex text-gray-500" data-testid="request_reschedule_sent">
        <Icon.FiSend className="-mt-[1px] w-4 rotate-45" />
        <p className="ml-2 ">{t("reschedule_request_sent")}</p>
      </div>
    );
  };

  const startTime = dayjs(booking.startTime).format(isUpcoming ? "ddd, D MMM" : "D MMMM YYYY");
  const [isOpenRescheduleDialog, setIsOpenRescheduleDialog] = useState(false);
  const [isOpenSetLocationDialog, setIsOpenLocationDialog] = useState(false);
  const setLocationMutation = trpc.viewer.bookings.editLocation.useMutation({
    onSuccess: () => {
      showToast(t("location_updated"), "success");
      setIsOpenLocationDialog(false);
      utils.viewer.bookings.invalidate();
    },
  });

  const saveLocation = (newLocationType: EventLocationType["type"], details: { [key: string]: string }) => {
    let newLocation = newLocationType as string;
    const eventLocationType = getEventLocationType(newLocationType);
    if (eventLocationType?.organizerInputType) {
      newLocation = details[Object.keys(details)[0]];
    }
    setLocationMutation.mutate({ bookingId: booking.id, newLocation });
  };

  // Getting accepted recurring dates to show
  const recurringDates = booking.recurringInfo?.bookings[BookingStatus.ACCEPTED]
    .concat(booking.recurringInfo?.bookings[BookingStatus.CANCELLED])
    .concat(booking.recurringInfo?.bookings[BookingStatus.PENDING])
    .sort((date1: Date, date2: Date) => date1.getTime() - date2.getTime());

  const onClickTableData = () => {
    router.push({
      pathname: `/booking/${booking.uid}`,
      query: {
        allRemainingBookings: isTabRecurring,
        email: booking.attendees[0] ? booking.attendees[0].email : undefined,
      },
    });
  };
  const showRecordingsButtons = booking.location === "integrations:daily" && isPast && isConfirmed;
  return (
    <>
      <RescheduleDialog
        isOpenDialog={isOpenRescheduleDialog}
        setIsOpenDialog={setIsOpenRescheduleDialog}
        bookingUId={booking.uid}
      />
      <EditLocationDialog
        booking={booking}
        saveLocation={saveLocation}
        isOpenDialog={isOpenSetLocationDialog}
        setShowLocationModal={setIsOpenLocationDialog}
      />
      {showRecordingsButtons && (
        <ViewRecordingsDialog
          booking={booking}
          isOpenDialog={viewRecordingsDialogIsOpen}
          setIsOpenDialog={setViewRecordingsDialogIsOpen}
          timeFormat={user?.timeFormat ?? null}
        />
      )}
      {/* NOTE: Should refactor this dialog component as is being rendered multiple times */}
      <Dialog open={rejectionDialogIsOpen} onOpenChange={setRejectionDialogIsOpen}>
        <DialogContent>
          <DialogHeader title={t("rejection_reason_title")} />

          <p className="-mt-4 text-sm text-gray-500">{t("rejection_reason_description")}</p>
          <p className="mt-6 mb-2 text-sm font-bold text-black">
            {t("rejection_reason")}
            <span className="font-normal text-gray-500"> (Optional)</span>
          </p>
          <TextArea
            name={t("rejection_reason")}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="mb-5 sm:mb-6"
          />

          <DialogFooter>
            <DialogClose />

            <Button
              disabled={mutation.isLoading}
              onClick={() => {
                bookingConfirm(false);
              }}>
              {t("rejection_confirmation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <tr className="group flex flex-col hover:bg-neutral-50 sm:flex-row">
        <td
          className="hidden align-top ltr:pl-6 rtl:pr-6 sm:table-cell sm:min-w-[12rem]"
          onClick={onClickTableData}>
          <div className="cursor-pointer py-4">
            <div className="text-sm leading-6 text-gray-900">{startTime}</div>
            <div className="text-sm text-gray-500">
              {formatTime(booking.startTime, user?.timeFormat, user?.timeZone)} -{" "}
              {formatTime(booking.endTime, user?.timeFormat, user?.timeZone)}
              <MeetingTimeInTimezones
                timeFormat={user?.timeFormat}
                userTimezone={user?.timeZone}
                startTime={booking.startTime}
                endTime={booking.endTime}
                attendees={booking.attendees}
              />
            </div>
            {isPending && (
              <Badge className="ltr:mr-2 rtl:ml-2" variant="orange">
                {t("unconfirmed")}
              </Badge>
            )}
            {booking.eventType?.team && (
              <Badge className="ltr:mr-2 rtl:ml-2" variant="gray">
                {booking.eventType.team.name}
              </Badge>
            )}
            {booking.paid && (
              <Badge className="ltr:mr-2 rtl:ml-2" variant="green">
                {t("paid")}
              </Badge>
            )}
            {recurringDates !== undefined && (
              <div className="mt-2 text-sm text-gray-400">
                <RecurringBookingsTooltip booking={booking} recurringDates={recurringDates} />
              </div>
            )}
          </div>
        </td>
        <td className={"w-full px-4" + (isRejected ? " line-through" : "")} onClick={onClickTableData}>
          {/* Time and Badges for mobile */}
          <div className="w-full pt-4 pb-2 sm:hidden">
            <div className="flex w-full items-center justify-between sm:hidden">
              <div className="text-sm leading-6 text-gray-900">{startTime}</div>
              <div className="pr-2 text-sm text-gray-500">
                {formatTime(booking.startTime, user?.timeFormat, user?.timeZone)} -{" "}
                {formatTime(booking.endTime, user?.timeFormat, user?.timeZone)}
                <MeetingTimeInTimezones
                  timeFormat={user?.timeFormat}
                  userTimezone={user?.timeZone}
                  startTime={booking.startTime}
                  endTime={booking.endTime}
                  attendees={booking.attendees}
                />
              </div>
            </div>

            {isPending && (
              <Badge className="ltr:mr-2 rtl:ml-2 sm:hidden" variant="orange">
                {t("unconfirmed")}
              </Badge>
            )}
            {booking.eventType?.team && (
              <Badge className="ltr:mr-2 rtl:ml-2 sm:hidden" variant="gray">
                {booking.eventType.team.name}
              </Badge>
            )}
            {!!booking?.eventType?.price && !booking.paid && (
              <Badge className="ltr:mr-2 rtl:ml-2 sm:hidden" variant="orange">
                {t("pending_payment")}
              </Badge>
            )}
            {recurringDates !== undefined && (
              <div className="text-sm text-gray-400 sm:hidden">
                <RecurringBookingsTooltip booking={booking} recurringDates={recurringDates} />
              </div>
            )}
          </div>

          <div className="cursor-pointer py-4">
            <div
              title={booking.title}
              className={classNames(
                "max-w-10/12 sm:max-w-56 text-sm font-medium leading-6 text-gray-900 md:max-w-full",
                isCancelled ? "line-through" : ""
              )}>
              {booking.title}
              <span> </span>

              {!!booking?.eventType?.price && !booking.paid && (
                <Badge className="hidden ltr:ml-2 ltr:mr-2 rtl:ml-2 sm:inline-flex" variant="orange">
                  {t("pending_payment")}
                </Badge>
              )}
            </div>
            {booking.description && (
              <div
                className="max-w-10/12 sm:max-w-32 md:max-w-52 xl:max-w-80 truncate text-sm text-gray-600"
                title={booking.description}>
                &quot;{booking.description}&quot;
              </div>
            )}
            {booking.attendees.length !== 0 && (
              <DisplayAttendees
                attendees={booking.attendees}
                user={booking.user}
                currentEmail={user?.email}
              />
            )}
            {isCancelled && booking.rescheduled && (
              <div className="mt-2 inline-block text-left text-sm md:hidden">
                <RequestSentMessage />
              </div>
            )}
          </div>
        </td>
        <td className="py-4 pl-4 text-right text-sm font-medium ltr:pr-4 rtl:pl-4 sm:pl-0">
          {isUpcoming && !isCancelled ? (
            <>
              {isPending && user?.id === booking.user?.id && <TableActions actions={pendingActions} />}
              {isConfirmed && <TableActions actions={bookedActions} />}
              {isRejected && <div className="text-sm text-gray-500">{t("rejected")}</div>}
            </>
          ) : null}
          {isPast && isPending && !isConfirmed ? <TableActions actions={bookedActions} /> : null}
          {showRecordingsButtons && <TableActions actions={showRecordingActions} />}
          {isCancelled && booking.rescheduled && (
            <div className="hidden h-full items-center md:flex">
              <RequestSentMessage />
            </div>
          )}
        </td>
      </tr>
    </>
  );
}

interface RecurringBookingsTooltipProps {
  booking: BookingItemProps;
  recurringDates: Date[];
}

const RecurringBookingsTooltip = ({ booking, recurringDates }: RecurringBookingsTooltipProps) => {
  // Get user so we can determine 12/24 hour format preferences
  const query = useMeQuery();
  const user = query.data;
  const { t } = useLocale();
  const now = new Date();
  const recurringCount = recurringDates.filter((date) => {
    return (
      date >= now &&
      !booking.recurringInfo?.bookings[BookingStatus.CANCELLED]
        .map((date) => date.toDateString())
        .includes(date.toDateString())
    );
  }).length;

  return (
    (booking.recurringInfo &&
      booking.eventType?.recurringEvent?.freq &&
      (booking.listingStatus === "recurring" ||
        booking.listingStatus === "unconfirmed" ||
        booking.listingStatus === "cancelled") && (
        <div className="underline decoration-gray-400 decoration-dashed underline-offset-2">
          <div className="flex">
            <Tooltip
              content={recurringDates.map((aDate, key) => {
                const pastOrCancelled =
                  aDate < now ||
                  booking.recurringInfo?.bookings[BookingStatus.CANCELLED]
                    .map((date) => date.toDateString())
                    .includes(aDate.toDateString());
                return (
                  <p key={key} className={classNames(pastOrCancelled && "line-through")}>
                    {formatTime(aDate, user?.timeFormat, user?.timeZone)}
                    {" - "}
                    {dayjs(aDate).format("D MMMM YYYY")}
                  </p>
                );
              })}>
              <div className="text-gray-600 dark:text-white">
                <Icon.FiRefreshCcw
                  strokeWidth="3"
                  className="float-left mr-1 mt-1.5 inline-block h-3 w-3 text-gray-400"
                />
                <p className="mt-1 pl-5 text-xs">
                  {booking.status === BookingStatus.ACCEPTED
                    ? `${t("event_remaining", {
                        count: recurringCount,
                      })}`
                    : getEveryFreqFor({
                        t,
                        recurringEvent: booking.eventType.recurringEvent,
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
      href={"mailto:" + user.email}
      onClick={(e) => e.stopPropagation()}>
      {user.name}
    </a>
  );
};

type AttendeeProps = {
  name?: string;
  email: string;
};

const Attendee = ({ email, name }: AttendeeProps) => {
  return (
    <a className="hover:text-blue-500" href={"mailto:" + email} onClick={(e) => e.stopPropagation()}>
      {name || email}
    </a>
  );
};

const DisplayAttendees = ({
  attendees,
  user,
  currentEmail,
}: {
  attendees: AttendeeProps[];
  user: UserProps | null;
  currentEmail?: string | null;
}) => {
  const { t } = useLocale();
  return (
    <div className="text-sm text-gray-900">
      {user && <FirstAttendee user={user} currentEmail={currentEmail} />}
      {attendees.length > 1 ? <span>,&nbsp;</span> : <span>&nbsp;{t("and")}&nbsp;</span>}
      <Attendee {...attendees[0]} />
      {attendees.length > 1 && (
        <>
          <div className="inline-block text-sm text-gray-900">&nbsp;{t("and")}&nbsp;</div>
          {attendees.length > 2 ? (
            <Tooltip
              content={attendees.slice(1).map((attendee) => (
                <p key={attendee.email}>
                  <Attendee {...attendee} />
                </p>
              ))}>
              <div className="inline-block">{t("plus_more", { count: attendees.length - 1 })}</div>
            </Tooltip>
          ) : (
            <Attendee {...attendees[1]} />
          )}
        </>
      )}
    </div>
  );
};

export default BookingListItem;
