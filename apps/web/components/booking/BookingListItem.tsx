import { BookingStatus } from "@prisma/client";
import { useRouter } from "next/router";
import { useState } from "react";

import { EventLocationType, getEventLocationType } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { getEveryFreqFor } from "@calcom/lib/recurringStrings";
import { inferQueryInput, inferQueryOutput, trpc } from "@calcom/trpc/react";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/Dialog";
import { Icon } from "@calcom/ui/Icon";
import { Tooltip } from "@calcom/ui/Tooltip";
import { TextArea } from "@calcom/ui/form/fields";
import Button from "@calcom/ui/v2/core/Button";

import useMeQuery from "@lib/hooks/useMeQuery";
import { extractRecurringDates } from "@lib/parseDate";

import { EditLocationDialog } from "@components/dialog/EditLocationDialog";
import { RescheduleDialog } from "@components/dialog/RescheduleDialog";
import TableActions, { ActionType } from "@components/ui/TableActions";

type BookingListingStatus = inferQueryInput<"viewer.bookings">["status"];

type BookingItem = inferQueryOutput<"viewer.bookings">["bookings"][number];

type BookingItemProps = BookingItem & {
  listingStatus: BookingListingStatus;
  recurringBookings?: BookingItem[];
};

function BookingListItem(booking: BookingItemProps) {
  // Get user so we can determine 12/24 hour format preferences
  const query = useMeQuery();
  const user = query.data;
  const { t, i18n } = useLocale();
  const utils = trpc.useContext();
  const router = useRouter();
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [rejectionDialogIsOpen, setRejectionDialogIsOpen] = useState(false);
  const mutation = trpc.useMutation(["viewer.bookings.confirm"], {
    onSuccess: () => {
      setRejectionDialogIsOpen(false);
      utils.invalidateQueries("viewer.bookings");
    },
  });

  const bookingConfirm = async (confirm: boolean) => {
    let body = {
      bookingId: booking.id,
      confirmed: confirm,
      reason: rejectionReason,
    };
    /**
     * Only pass down the recurring event id when we need to confirm the entire series, which happens in
     * the "Recurring" tab, to support confirming discretionally in the "Recurring" tab.
     */
    if (booking.listingStatus === "recurring" && booking.recurringEventId !== null) {
      body = Object.assign({}, body, { recurringEventId: booking.recurringEventId });
    }
    mutation.mutate(body);
  };

  const isUpcoming = new Date(booking.endTime) >= new Date();
  const isCancelled = booking.status === BookingStatus.CANCELLED;
  const isConfirmed = booking.status === BookingStatus.ACCEPTED;
  const isRejected = booking.status === BookingStatus.REJECTED;
  const isPending = booking.status === BookingStatus.PENDING;

  const pendingActions: ActionType[] = [
    {
      id: "reject",
      label:
        booking.listingStatus === "recurring" && booking.recurringEventId !== null
          ? t("reject_all")
          : t("reject"),
      onClick: () => {
        setRejectionDialogIsOpen(true);
      },
      icon: Icon.FiSlash,
      disabled: mutation.isLoading,
    },
    {
      id: "confirm",
      label:
        booking.listingStatus === "recurring" && booking.recurringEventId !== null
          ? t("confirm_all")
          : t("confirm"),
      onClick: () => {
        bookingConfirm(true);
      },
      icon: Icon.FiCheck,
      disabled: mutation.isLoading,
      color: "primary",
    },
  ];

  let bookedActions: ActionType[] = [
    {
      id: "cancel",
      label:
        booking.listingStatus === "recurring" && booking.recurringEventId !== null
          ? t("cancel_all_remaining")
          : t("cancel"),
      /* When cancelling we need to let the UI and the API know if the intention is to
         cancel all remaining bookings or just that booking instance. */
      href: `/cancel/${booking.uid}${
        booking.listingStatus === "recurring" && booking.recurringEventId !== null
          ? "?allRemainingBookings=true"
          : ""
      }`,
      icon: Icon.FiX,
    },
    {
      id: "edit_booking",
      label: t("edit_booking"),
      icon: Icon.FiEdit,
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

  if (booking.listingStatus === "recurring" && booking.recurringEventId !== null) {
    bookedActions = bookedActions.filter((action) => action.id !== "edit_booking");
  }

  const RequestSentMessage = () => {
    return (
      <div className="flex ml-1 mr-8 text-gray-500" data-testid="request_reschedule_sent">
        <Icon.FiSend className="-mt-[1px] w-4 rotate-45" />
        <p className="ml-2 ">{t("reschedule_request_sent")}</p>
      </div>
    );
  };

  const startTime = dayjs(booking.startTime).format(isUpcoming ? "ddd, D MMM" : "D MMMM YYYY");
  const [isOpenRescheduleDialog, setIsOpenRescheduleDialog] = useState(false);
  const [isOpenSetLocationDialog, setIsOpenLocationDialog] = useState(false);
  const setLocationMutation = trpc.useMutation("viewer.bookings.editLocation", {
    onSuccess: () => {
      showToast(t("location_updated"), "success");
      setIsOpenLocationDialog(false);
      utils.invalidateQueries("viewer.bookings");
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

  // Calculate the booking date(s) and setup recurring event data to show
  let recurringStrings: string[] = [];
  let recurringDates: Date[] = [];

  if (booking.recurringBookings && booking.eventType.recurringEvent?.freq !== undefined) {
    [recurringStrings, recurringDates] = extractRecurringDates(
      booking.recurringBookings,
      user?.timeZone,
      i18n
    );
  }

  const location = booking.location || "";

  const onClick = () => {
    router.push({
      pathname: "/success",
      query: {
        date: booking.startTime,
        // TODO: Booking when fetched should have id 0 already(for Dynamic Events).
        type: booking.eventType.id || 0,
        eventSlug: booking.eventType.slug,
        user: user?.username || "",
        name: booking.attendees[0] ? booking.attendees[0].name : undefined,
        email: booking.attendees[0] ? booking.attendees[0].email : undefined,
        location: location,
        eventName: booking.eventType.eventName || "",
        bookingId: booking.id,
        recur: booking.recurringEventId,
        reschedule: isConfirmed,
        listingStatus: booking.listingStatus,
        status: booking.status,
      },
    });
  };
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
            <DialogClose>
              <Button color="secondary">{t("cancel")}</Button>
            </DialogClose>

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

      <tr className="flex hover:bg-neutral-50">
        <td className="hidden align-top ltr:pl-6 rtl:pr-6 sm:table-cell sm:w-44" onClick={onClick}>
          <div className="cursor-pointer py-4">
            <div className="text-sm leading-6 text-gray-900">{startTime}</div>
            <div className="text-sm text-gray-500">
              {dayjs(booking.startTime).format(user && user.timeFormat === 12 ? "h:mma" : "HH:mm")} -{" "}
              {dayjs(booking.endTime).format(user && user.timeFormat === 12 ? "h:mma" : "HH:mm")}
            </div>
            <div className="text-sm text-gray-400">
              {booking.recurringBookings &&
                booking.eventType?.recurringEvent?.freq &&
                (booking.listingStatus === "recurring" || booking.listingStatus === "cancelled") && (
                  <div className="underline decoration-gray-400 decoration-dashed underline-offset-2">
                    <div className="flex">
                      <Tooltip
                        content={recurringStrings.map((aDate, key) => (
                          <p key={key}>{aDate}</p>
                        ))}>
                        <div className="text-gray-600 dark:text-white">
                          <Icon.FiRefreshCcw
                            stroke-width="3"
                            className="float-left mr-1 mt-1.5 inline-block h-3 w-3 text-gray-400"
                          />
                          <p className="mt-1 pl-5 text-xs">
                            {booking.status === BookingStatus.ACCEPTED
                              ? `${t("event_remaining", {
                                  count: recurringDates.length,
                                })}`
                              : getEveryFreqFor({
                                  t,
                                  recurringEvent: booking.eventType.recurringEvent,
                                  recurringCount: booking.recurringBookings.length,
                                })}
                          </p>
                        </div>
                      </Tooltip>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </td>
        <td className={"flex-1 px-4" + (isRejected ? " line-through" : "")} onClick={onClick}>
          <div className="cursor-pointer py-4">
            <div className="sm:hidden">
              {isPending && <Tag className="mb-2 ltr:mr-2 rtl:ml-2">{t("unconfirmed")}</Tag>}
              {!!booking?.eventType?.price && !booking.paid && (
                <Tag className="mb-2 ltr:mr-2 rtl:ml-2">Pending payment</Tag>
              )}
              <div className="text-sm font-medium text-gray-900">
                {startTime}:{" "}
                <small className="text-sm text-gray-500">
                  {dayjs(booking.startTime).format("HH:mm")} - {dayjs(booking.endTime).format("HH:mm")}
                </small>
              </div>
            </div>
            <div
              title={booking.title}
              className={classNames(
                "max-w-56 truncate text-sm font-medium leading-6 text-neutral-900 md:max-w-max",
                isCancelled ? "line-through" : ""
              )}>
              {booking.eventType?.team && <strong>{booking.eventType.team.name}: </strong>}
              {booking.title}
              {!!booking?.eventType?.price && !booking.paid && (
                <Tag className="hidden ltr:ml-2 rtl:mr-2 sm:inline-flex">Pending payment</Tag>
              )}
              {isPending && <Tag className="hidden ltr:ml-2 rtl:mr-2 sm:inline-flex">{t("unconfirmed")}</Tag>}
            </div>
            {booking.description && (
              <div
                className="max-w-52 md:max-w-96 truncate text-sm text-gray-500"
                title={booking.description}>
                &quot;{booking.description}&quot;
              </div>
            )}

            {booking.attendees.length !== 0 && (
              <a
                className="text-sm text-gray-900 hover:text-blue-500"
                href={"mailto:" + booking.attendees[0].email}
                onClick={(e) => e.stopPropagation()}>
                {booking.attendees[0].email}
              </a>
            )}
            {isCancelled && booking.rescheduled && (
              <div className="mt-2 inline-block text-left text-sm md:hidden">
                <RequestSentMessage />
              </div>
            )}
          </div>
        </td>

        <td className="whitespace-nowrap py-4 text-right text-sm font-medium ltr:pr-4 rtl:pl-4">
          {isUpcoming && !isCancelled ? (
            <>
              {isPending && user?.id === booking.user?.id && <TableActions actions={pendingActions} />}
              {isConfirmed && <TableActions actions={bookedActions} />}
              {isRejected && <div className="text-sm text-gray-500">{t("rejected")}</div>}
            </>
          ) : null}
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

const Tag = ({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) => {
  return (
    <span
      className={`inline-flex items-center rounded-sm bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-800 ${className}`}>
      {children}
    </span>
  );
};

export default BookingListItem;
