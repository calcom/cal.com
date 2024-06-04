import Link from "next/link";
import { useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";

import type { EventLocationType, getEventLocationValue } from "@calcom/app-store/locations";
import {
  getEventLocationType,
  getSuccessPageLocationMessage,
  guessEventLocationType,
} from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
// TODO: Use browser locale, implement Intl in Dayjs maybe?
import "@calcom/dayjs/locales";
import ViewRecordingsDialog from "@calcom/features/ee/video/ViewRecordingsDialog";
import classNames from "@calcom/lib/classNames";
import { formatTime } from "@calcom/lib/date-fns";
import getPaymentAppData from "@calcom/lib/getPaymentAppData";
import { useBookerUrl } from "@calcom/lib/hooks/useBookerUrl";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { getEveryFreqFor } from "@calcom/lib/recurringStrings";
import { BookingStatus } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
import type { RouterInputs, RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import type { ActionType } from "@calcom/ui";
import {
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  Icon,
  MeetingTimeInTimezones,
  showToast,
  TableActions,
  TextAreaField,
  Tooltip,
  Dropdown,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@calcom/ui";

import { ChargeCardDialog } from "@components/dialog/ChargeCardDialog";
import { EditLocationDialog } from "@components/dialog/EditLocationDialog";
import { RescheduleDialog } from "@components/dialog/RescheduleDialog";

type BookingListingStatus = RouterInputs["viewer"]["bookings"]["get"]["filters"]["status"];

type BookingItem = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][number];

type BookingItemProps = BookingItem & {
  listingStatus: BookingListingStatus;
  recurringInfo: RouterOutputs["viewer"]["bookings"]["get"]["recurringInfo"][number] | undefined;
  loggedInUser: {
    userId: number | undefined;
    userTimeZone: string | undefined;
    userTimeFormat: number | null | undefined;
    userEmail: string | undefined;
  };
};

function BookingListItem(booking: BookingItemProps) {
  const bookerUrl = useBookerUrl();
  const { userId, userTimeZone, userTimeFormat, userEmail } = booking.loggedInUser;

  const {
    t,
    i18n: { language },
  } = useLocale();
  const utils = trpc.useUtils();
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [rejectionDialogIsOpen, setRejectionDialogIsOpen] = useState(false);
  const [chargeCardDialogIsOpen, setChargeCardDialogIsOpen] = useState(false);
  const [viewRecordingsDialogIsOpen, setViewRecordingsDialogIsOpen] = useState<boolean>(false);
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

  const isUpcoming = new Date(booking.endTime) >= new Date();
  const isBookingInPast = new Date(booking.endTime) < new Date();
  const isCancelled = booking.status === BookingStatus.CANCELLED;
  const isConfirmed = booking.status === BookingStatus.ACCEPTED;
  const isRejected = booking.status === BookingStatus.REJECTED;
  const isPending = booking.status === BookingStatus.PENDING;
  const isRecurring = booking.recurringEventId !== null;
  const isTabRecurring = booking.listingStatus === "recurring";
  const isTabUnconfirmed = booking.listingStatus === "unconfirmed";

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
      icon: "ban",
      disabled: mutation.isPending,
    },
    // For bookings with payment, only confirm if the booking is paid for
    ...((isPending && !paymentAppData.enabled) ||
    (paymentAppData.enabled && !!paymentAppData.price && booking.paid)
      ? [
          {
            id: "confirm",
            bookingId: booking.id,
            label: (isTabRecurring || isTabUnconfirmed) && isRecurring ? t("confirm_all") : t("confirm"),
            onClick: () => {
              bookingConfirm(true);
            },
            icon: "check" as const,
            disabled: mutation.isPending,
          },
        ]
      : []),
  ];

  let bookedActions: ActionType[] = [
    {
      id: "cancel",
      label: isTabRecurring && isRecurring ? t("cancel_all_remaining") : t("cancel_event"),
      /* When cancelling we need to let the UI and the API know if the intention is to
               cancel all remaining bookings or just that booking instance. */
      href: `/booking/${booking.uid}?cancel=true${
        isTabRecurring && isRecurring ? "&allRemainingBookings=true" : ""
      }${booking.seatsReferences.length ? `&seatReferenceUid=${getSeatReferenceUid()}` : ""}
      `,
      icon: "x" as const,
    },
    {
      id: "edit_booking",
      label: t("edit"),
      actions: [
        {
          id: "reschedule",
          icon: "clock" as const,
          label: t("reschedule_booking"),
          href: `${bookerUrl}/reschedule/${booking.uid}${
            booking.seatsReferences.length ? `?seatReferenceUid=${getSeatReferenceUid()}` : ""
          }`,
        },
        {
          id: "reschedule_request",
          icon: "send" as const,
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
          icon: "map-pin" as const,
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
      icon: "credit-card" as const,
    },
  ];

  if (isTabRecurring && isRecurring) {
    bookedActions = bookedActions.filter((action) => action.id !== "edit_booking");
  }

  if (isBookingInPast && isPending && !isConfirmed) {
    bookedActions = bookedActions.filter((action) => action.id !== "cancel");
  }

  const RequestSentMessage = () => {
    return (
      <Badge startIcon="send" size="md" variant="gray" data-testid="request_reschedule_sent">
        {t("reschedule_request_sent")}
      </Badge>
    );
  };

  const startTime = dayjs(booking.startTime)
    .tz(userTimeZone)
    .locale(language)
    .format(isUpcoming ? "ddd, D MMM" : "D MMMM YYYY");
  const [isOpenRescheduleDialog, setIsOpenRescheduleDialog] = useState(false);
  const [isOpenSetLocationDialog, setIsOpenLocationDialog] = useState(false);
  const setLocationMutation = trpc.viewer.bookings.editLocation.useMutation({
    onSuccess: () => {
      showToast(t("location_updated"), "success");
      setIsOpenLocationDialog(false);
      utils.viewer.bookings.invalidate();
    },
  });

  const saveLocation = (
    newLocationType: EventLocationType["type"],
    details: {
      [key: string]: string;
    }
  ) => {
    let newLocation = newLocationType as string;
    const eventLocationType = getEventLocationType(newLocationType);
    if (eventLocationType?.organizerInputType) {
      newLocation = details[Object.keys(details)[0]];
    }
    setLocationMutation.mutate({ bookingId: booking.id, newLocation, details });
  };

  // Getting accepted recurring dates to show
  const recurringDates = booking.recurringInfo?.bookings[BookingStatus.ACCEPTED]
    .concat(booking.recurringInfo?.bookings[BookingStatus.CANCELLED])
    .concat(booking.recurringInfo?.bookings[BookingStatus.PENDING])
    .sort((date1: Date, date2: Date) => date1.getTime() - date2.getTime());

  const buildBookingLink = () => {
    const urlSearchParams = new URLSearchParams({
      allRemainingBookings: isTabRecurring.toString(),
    });
    if (booking.attendees[0]) urlSearchParams.set("email", booking.attendees[0].email);
    return `/booking/${booking.uid}?${urlSearchParams.toString()}`;
  };

  const bookingLink = buildBookingLink();

  const title = booking.title;

  const showViewRecordingsButton = !!(booking.isRecorded && isBookingInPast && isConfirmed);
  const showCheckRecordingButton =
    isBookingInPast &&
    isConfirmed &&
    !booking.isRecorded &&
    (!booking.location || booking.location === "integrations:daily" || booking?.location?.trim() === "");

  const showRecordingActions: ActionType[] = [
    {
      id: "view_recordings",
      label: showCheckRecordingButton ? t("check_for_recordings") : t("view_recordings"),
      onClick: () => {
        setViewRecordingsDialogIsOpen(true);
      },
      color: showCheckRecordingButton ? "secondary" : "primary",
      disabled: mutation.isPending,
    },
  ];

  const showPendingPayment = paymentAppData.enabled && booking.payment.length && !booking.paid;
  const attendeeList = booking.attendees.map((attendee) => {
    return {
      name: attendee.name,
      email: attendee.email,
      id: attendee.id,
      noShow: attendee.noShow || false,
    };
  });
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
        teamId={booking.eventType?.team?.id}
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
      {(showViewRecordingsButton || showCheckRecordingButton) && (
        <ViewRecordingsDialog
          booking={booking}
          isOpenDialog={viewRecordingsDialogIsOpen}
          setIsOpenDialog={setViewRecordingsDialogIsOpen}
          timeFormat={userTimeFormat ?? null}
        />
      )}
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

      <tr data-testid="booking-item" className="hover:bg-muted group flex flex-col sm:flex-row">
        <td className="hidden align-top ltr:pl-6 rtl:pr-6 sm:table-cell sm:min-w-[12rem]">
          <Link href={bookingLink}>
            <div className="cursor-pointer py-4">
              <div className="text-emphasis text-sm leading-6">{startTime}</div>
              <div className="text-subtle text-sm">
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
              {!isPending && (
                <div>
                  {(provider?.label || locationToDisplay?.startsWith("https://")) &&
                    locationToDisplay.startsWith("http") && (
                      <a
                        href={locationToDisplay}
                        onClick={(e) => e.stopPropagation()}
                        target="_blank"
                        title={locationToDisplay}
                        rel="noreferrer"
                        className="text-sm leading-6 text-blue-600 hover:underline dark:text-blue-400">
                        <div className="flex items-center gap-2">
                          {provider?.iconUrl && (
                            <img
                              src={provider.iconUrl}
                              className="h-4 w-4 rounded-sm"
                              alt={`${provider?.label} logo`}
                            />
                          )}
                          {provider?.label
                            ? t("join_event_location", { eventLocationType: provider?.label })
                            : t("join_meeting")}
                        </div>
                      </a>
                    )}
                </div>
              )}
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
              {booking.paid && !booking.payment[0] ? (
                <Badge className="ltr:mr-2 rtl:ml-2" variant="orange">
                  {t("error_collecting_card")}
                </Badge>
              ) : booking.paid ? (
                <Badge className="ltr:mr-2 rtl:ml-2" variant="green" data-testid="paid_badge">
                  {booking.payment[0].paymentOption === "HOLD" ? t("card_held") : t("paid")}
                </Badge>
              ) : null}
              {recurringDates !== undefined && (
                <div className="text-muted mt-2 text-sm">
                  <RecurringBookingsTooltip
                    userTimeFormat={userTimeFormat}
                    userTimeZone={userTimeZone}
                    booking={booking}
                    recurringDates={recurringDates}
                  />
                </div>
              )}
            </div>
          </Link>
        </td>
        <td data-testid="title-and-attendees" className={`w-full px-4${isRejected ? " line-through" : ""}`}>
          <Link href={bookingLink}>
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
                <Badge className="ltr:mr-2 rtl:ml-2 sm:hidden" variant="orange">
                  {t("unconfirmed")}
                </Badge>
              )}
              {booking.eventType?.team && (
                <Badge className="ltr:mr-2 rtl:ml-2 sm:hidden" variant="gray">
                  {booking.eventType.team.name}
                </Badge>
              )}
              {showPendingPayment && (
                <Badge className="ltr:mr-2 rtl:ml-2 sm:hidden" variant="orange">
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

            <div className="cursor-pointer py-4">
              <div
                title={title}
                className={classNames(
                  "max-w-10/12 sm:max-w-56 text-emphasis text-sm font-medium leading-6 md:max-w-full",
                  isCancelled ? "line-through" : ""
                )}>
                {title}
                <span> </span>

                {showPendingPayment && (
                  <Badge className="hidden sm:inline-flex" variant="orange">
                    {t("pending_payment")}
                  </Badge>
                )}
              </div>
              {booking.description && (
                <div
                  className="max-w-10/12 sm:max-w-32 md:max-w-52 xl:max-w-80 text-default truncate text-sm"
                  title={booking.description}>
                  &quot;{booking.description}&quot;
                </div>
              )}
              {booking.attendees.length !== 0 && (
                <DisplayAttendees
                  attendees={attendeeList}
                  user={booking.user}
                  currentEmail={userEmail}
                  bookingUid={booking.uid}
                  isBookingInPast={isBookingInPast}
                />
              )}
              {isCancelled && booking.rescheduled && (
                <div className="mt-2 inline-block md:hidden">
                  <RequestSentMessage />
                </div>
              )}
            </div>
          </Link>
        </td>
        <td className="flex w-full justify-end py-4 pl-4 text-right text-sm font-medium ltr:pr-4 rtl:pl-4 sm:pl-0">
          {isUpcoming && !isCancelled ? (
            <>
              {isPending && userId === booking.user?.id && <TableActions actions={pendingActions} />}
              {isConfirmed && <TableActions actions={bookedActions} />}
              {isRejected && <div className="text-subtle text-sm">{t("rejected")}</div>}
            </>
          ) : null}
          {isBookingInPast && isPending && !isConfirmed ? <TableActions actions={bookedActions} /> : null}
          {(showViewRecordingsButton || showCheckRecordingButton) && (
            <TableActions actions={showRecordingActions} />
          )}
          {isCancelled && booking.rescheduled && (
            <div className="hidden h-full items-center md:flex">
              <RequestSentMessage />
            </div>
          )}
          {booking.status === "ACCEPTED" && booking.paid && booking.payment[0]?.paymentOption === "HOLD" && (
            <div className="ml-2">
              <TableActions actions={chargeCardActions} />
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
  const recurringCount = recurringDates.filter((recurringDate) => {
    return (
      recurringDate >= now &&
      !booking.recurringInfo?.bookings[BookingStatus.CANCELLED]
        .map((date) => date.toString())
        .includes(recurringDate.toString())
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
                    .map((date) => date.toString())
                    .includes(aDate.toString());
                return (
                  <p key={key} className={classNames(pastOrCancelled && "line-through")}>
                    {formatTime(aDate, userTimeFormat, userTimeZone)}
                    {" - "}
                    {dayjs(aDate).locale(language).format("D MMMM YYYY")}
                  </p>
                );
              })}>
              <div className="text-default">
                <Icon
                  name="refresh-ccw"
                  strokeWidth="3"
                  className="text-muted float-left mr-1 mt-1.5 inline-block h-3 w-3"
                />
                <p className="mt-1 pl-5 text-xs">
                  {booking.status === BookingStatus.ACCEPTED
                    ? `${t("event_remaining_other", {
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
      href={`mailto:${user.email}`}
      onClick={(e) => e.stopPropagation()}>
      {user.name}
    </a>
  );
};

type AttendeeProps = {
  name?: string;
  email: string;
  id: number;
  noShow: boolean;
};

type NoShowProps = {
  bookingUid: string;
  isBookingInPast: boolean;
};

const Attendee = (attendeeProps: AttendeeProps & NoShowProps) => {
  const { email, name, bookingUid, isBookingInPast, noShow: noShowAttendee } = attendeeProps;
  const { t } = useLocale();

  const [noShow, setNoShow] = useState(noShowAttendee);
  const [openDropdown, setOpenDropdown] = useState(false);
  const { copyToClipboard, isCopied } = useCopy();

  const noShowMutation = trpc.viewer.public.noShow.useMutation({
    onSuccess: async () => {
      showToast(
        t(noShow ? "x_marked_as_no_show" : "x_unmarked_as_no_show", {
          x: name || email,
        }),
        "success"
      );
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  function toggleNoShow({
    attendee,
    bookingUid,
  }: {
    attendee: { email: string; noShow: boolean };
    bookingUid: string;
  }) {
    noShowMutation.mutate({ bookingUid, attendees: [attendee] });
    setNoShow(!noShow);
  }

  return (
    <Dropdown open={openDropdown} onOpenChange={setOpenDropdown}>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="guest"
          onClick={(e) => e.stopPropagation()}
          className="radix-state-open:text-blue-500 hover:text-blue-500">
          {noShow ? (
            <s>
              {name || email} <Icon name="eye-off" className="inline h-4" />
            </s>
          ) : (
            <>{name || email}</>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem className="focus:outline-none">
          <DropdownItem
            StartIcon="mail"
            href={`mailto:${email}`}
            onClick={(e) => {
              setOpenDropdown(false);
              e.stopPropagation();
            }}>
            <a href={`mailto:${email}`}>{t("email")}</a>
          </DropdownItem>
        </DropdownMenuItem>
        <DropdownMenuItem className="focus:outline-none">
          <DropdownItem
            StartIcon={isCopied ? "clipboard-check" : "clipboard"}
            onClick={(e) => {
              e.preventDefault();
              copyToClipboard(email);
              setOpenDropdown(false);
              showToast(t("email_copied"), "success");
            }}>
            {!isCopied ? t("copy") : t("copied")}
          </DropdownItem>
        </DropdownMenuItem>
        {isBookingInPast && (
          <DropdownMenuItem className="focus:outline-none">
            {noShow ? (
              <DropdownItem
                data-testid="unmark-no-show"
                onClick={(e) => {
                  setOpenDropdown(false);
                  toggleNoShow({ attendee: { noShow: false, email }, bookingUid });
                  e.preventDefault();
                }}
                StartIcon="eye">
                {t("unmark_as_no_show")}
              </DropdownItem>
            ) : (
              <DropdownItem
                data-testid="mark-no-show"
                onClick={(e) => {
                  setOpenDropdown(false);
                  toggleNoShow({ attendee: { noShow: true, email }, bookingUid });
                  e.preventDefault();
                }}
                StartIcon="eye-off">
                {t("mark_as_no_show")}
              </DropdownItem>
            )}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </Dropdown>
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
  const noShowMutation = trpc.viewer.public.noShow.useMutation({
    onSuccess: async () => {
      showToast(t("no_show_updated"), "success");
    },
    onError: (err) => {
      showToast(err.message, "error");
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
    <Dropdown open={openDropdown} onOpenChange={setOpenDropdown}>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="more-guests"
          onClick={(e) => e.stopPropagation()}
          className="radix-state-open:text-blue-500 hover:text-blue-500 focus:outline-none">
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
          <div className=" flex justify-end p-2">
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
    </Dropdown>
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
    <div className="text-emphasis text-sm">
      {user && <FirstAttendee user={user} currentEmail={currentEmail} />}
      {attendees.length > 1 ? <span>,&nbsp;</span> : <span>&nbsp;{t("and")}&nbsp;</span>}
      <Attendee {...attendees[0]} bookingUid={bookingUid} isBookingInPast={isBookingInPast} />
      {attendees.length > 1 && (
        <>
          <div className="text-emphasis inline-block text-sm">&nbsp;{t("and")}&nbsp;</div>
          {attendees.length > 2 ? (
            <Tooltip
              content={attendees.slice(1).map((attendee) => (
                <p key={attendee.email}>
                  <Attendee {...attendee} bookingUid={bookingUid} isBookingInPast={isBookingInPast} />
                </p>
              ))}>
              {isBookingInPast && <GroupedAttendees attendees={attendees} bookingUid={bookingUid} />}
            </Tooltip>
          ) : (
            <Attendee {...attendees[1]} bookingUid={bookingUid} isBookingInPast={isBookingInPast} />
          )}
        </>
      )}
    </div>
  );
};

export default BookingListItem;
