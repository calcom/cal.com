import Link from "next/link";
import { useState } from "react";

import type { EventLocationType } from "@calcom/app-store/locations";
import { getEventLocationType } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
// TODO: Use browser locale, implement Intl in Dayjs maybe?
import "@calcom/dayjs/locales";
import classNames from "@calcom/lib/classNames";
import { formatTime } from "@calcom/lib/date-fns";
import getPaymentAppData from "@calcom/lib/getPaymentAppData";
import { useBookerUrl } from "@calcom/lib/hooks/useBookerUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { getRemainingPrice } from "@calcom/lib/payment/price";
import { getEveryFreqFor } from "@calcom/lib/recurringStrings";
import { BookingStatus } from "@calcom/prisma/enums";
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
  MeetingTimeInTimezones,
  showToast,
  TableActions,
  TextAreaField,
  Tooltip,
} from "@calcom/ui";
import {
  Check,
  Clock,
  MapPin,
  RefreshCcw,
  Send,
  Ban,
  X,
  CreditCard,
  DollarSign,
} from "@calcom/ui/components/icon";

import useMeQuery from "@lib/hooks/useMeQuery";

import { ChargeCardDialog } from "@components/dialog/ChargeCardDialog";
import { CompletePaymentDialog } from "@components/dialog/CompletePaymentDialog";
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
  const bookerUrl = useBookerUrl();

  const user = query.data;
  const {
    t,
    i18n: { language },
  } = useLocale();
  const utils = trpc.useContext();
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [rejectionDialogIsOpen, setRejectionDialogIsOpen] = useState(false);
  const [chargeCardDialogIsOpen, setChargeCardDialogIsOpen] = useState(false);
  const [completePaymentDialogIsOpen, setCompletePaymentDialogIsOpen] = useState(false);
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

  const sendPaymentLinkMutation = trpc.viewer.payments.sendPaymentLink.useMutation({
    onSuccess: () => {
      showToast("Coming soon", "success");
    },
    onError: () => {
      console.log("Noop");
    },
  });

  const isUpcoming = new Date(booking.endTime) >= new Date();
  const isDuring = new Date(booking.startTime) <= new Date() && new Date(booking.endTime) > new Date();
  const isPast = new Date(booking.endTime) < new Date();
  const isCancelled = booking.status === BookingStatus.CANCELLED;
  const isConfirmed = booking.status === BookingStatus.ACCEPTED;
  const isRejected = booking.status === BookingStatus.REJECTED;
  const isPending = booking.status === BookingStatus.PENDING;
  const isRecurring = booking.recurringEventId !== null;
  const isTabRecurring = booking.listingStatus === "recurring";
  const isTabUnconfirmed = booking.listingStatus === "unconfirmed";

  type StripeAppData = {
    enabled: boolean;
    price: number;
    currency: string;
    paymentOption: string;
    credentialId?: number;
    chargeDeposit: boolean;
    depositPercentage: number;
  };

  const paymentAppData = getPaymentAppData(booking.eventType) as StripeAppData;

  // console.log({paymentAppData, })

  const paidEvent = booking.eventType.price && booking.eventType.price > 0;
  const paymentOption = booking?.eventType?.metadata?.apps?.stripe?.paymentOption || "ON_BOOKING";
  const isDepositType = booking?.eventType?.metadata?.apps?.stripe?.chargeDeposit || false;
  const isHoldType = booking.paid && booking.payment[0]?.paymentOption === "HOLD";
  const isFullyPaid = booking.paymentStatus === "PAID";
  const isBookingPaid = booking.paid;

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

  function handleSendPaymentLink(method: string) {
    sendPaymentLinkMutation.mutate({
      bookingId: booking.id,
      method: method,
    });
  }

  let bookedActions: ActionType[] = [];

  if (isTabRecurring && isRecurring) {
    bookedActions = bookedActions.filter((action) => action.id !== "edit_booking");
  }

  if (isPast && isPending && !isConfirmed) {
    bookedActions = bookedActions.filter((action) => action.id !== "cancel");
  }

  const PaymentStatus = () => {
    if (paidEvent) {
      switch (paymentOption) {
        case "HOLD":
          return <HoldPaymentStatus />;

        case "ON_BOOKING":
          return <OnBookingPaymentStatus />;
      }
    }

    return null;
  };

  const HoldPaymentStatus = () => {
    if (booking.paid && !booking.payment[0]) {
      return (
        <Badge className="ltr:mr-2 rtl:ml-2" variant="orange">
          {t("error_collecting_card")}
        </Badge>
      );
    }

    if (booking.paymentStatus != "PAID") {
      return (
        <Badge className="ltr:mr-2 rtl:ml-2" variant="green">
          {t("card_held")}
        </Badge>
      );
    }

    /**
     * When payment type is HOLD should only have one payment
     * associated with the booking.
     */
    const payment = booking.payment[0];

    if (payment.amount < booking.eventType.price) {
      return (
        <Badge className="ltr:mr-2 rtl:ml-2" variant="orange" data-testid="paid_badge">
          No Show Fee Charged
        </Badge>
      );
    }

    if (payment.amount >= booking.eventType.price) {
      return (
        <Badge className="ltr:mr-2 rtl:ml-2" variant="green" data-testid="paid_badge">
          {t("paid")}
        </Badge>
      );
    }

    return (
      <>
        <Badge className="ltr:mr-2 rtl:ml-2" variant="green" data-testid="paid_badge">
          {t("card_held")}
        </Badge>
      </>
    );
  };

  const OnBookingPaymentStatus = () => {
    if (booking.paymentStatus === "PARTIAL") {
      return (
        <Badge className="ltr:mr-2 rtl:ml-2" variant="orange">
          Deposit Paid
        </Badge>
      );
    }

    if (booking.paymentStatus === "PAID") {
      return (
        <Badge className="ltr:mr-2 rtl:ml-2" variant="green">
          Paid
        </Badge>
      );
    }

    return (
      <>
        <Badge className="ltr:mr-2 rtl:ml-2" variant="orange">
          PS-{booking.paymentStatus}
        </Badge>
      </>
    );
  };

  const RequestSentMessage = () => {
    return (
      <Badge startIcon={Send} size="md" variant="gray" data-testid="request_reschedule_sent">
        {t("reschedule_request_sent")}
      </Badge>
    );
  };

  const EditActions = () => {
    const editAction = {
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
    };

    const cancelAction = {
      id: "cancel",
      label: isTabRecurring && isRecurring ? t("cancel_all_remaining") : t("cancel"),
      /* When cancelling we need to let the UI and the API know if the intention is to
               cancel all remaining bookings or just that booking instance. */
      href: `/booking/${booking.uid}?cancel=true${
        isTabRecurring && isRecurring ? "&allRemainingBookings=true" : ""
      }${booking.seatsReferences.length ? `&seatReferenceUid=${getSeatReferenceUid()}` : ""}
      `,
      icon: X,
    };

    const actions = [];

    if (isPast) {
      return null;
    }

    if (isPending) {
      return <TableActions actions={[editAction]} />;
    }

    if (isFullyPaid) {
      return <TableActions actions={[editAction]} />;
    }

    return <TableActions actions={[cancelAction, editAction]} />;
  };

  const PaymentActions = () => {
    if (!isConfirmed || !paidEvent) {
      return null;
    }

    if (isConfirmed && isDepositType && (!isUpcoming || isDuring) && !isFullyPaid) {
      const completePaymentAction = {
        id: "complete_payment",
        label: "Complete Payment",
        icon: DollarSign,
        actions: [
          // {
          //   id: "send_email",
          //   icon: Mail,
          //   label: "Send email",
          //   onClick: () => {
          //     handleSendPaymentLink("email");
          //   },
          // },
          {
            id: "charge_card",
            icon: CreditCard,
            label: "Charge card",
            onClick: () => {
              console.log({ booking });
              setCompletePaymentDialogIsOpen(true);
            },
          },
        ],
      };

      return <TableActions actions={[completePaymentAction]} />;
    }

    if (isConfirmed && isHoldType && (!isUpcoming || isDuring) && isBookingPaid && !isFullyPaid) {
      const completePaymentAction = {
        id: "complete_payment",
        label: "Complete Payment",
        icon: DollarSign,
        actions: [
          // {
          //   id: "send_email",
          //   icon: Mail,
          //   label: "Send email",
          //   onClick: () => {
          //     handleSendPaymentLink("email");
          //   },
          // },
          {
            id: "no_show_charge_card",
            label: cardCharged ? t("no_show_fee_charged") : t("collect_no_show_fee"),
            disabled: cardCharged,
            onClick: () => {
              setChargeCardDialogIsOpen(true);
            },
            icon: CreditCard,
          },
          {
            id: "charge_card",
            icon: CreditCard,
            label: "Charge card",
            onClick: () => {
              setCompletePaymentDialogIsOpen(true);
            },
          },
        ],
      };

      // if (isConfirmed && isHoldType && (!isUpcoming || isDuring) && isFullyPaid) {
      return <TableActions actions={[completePaymentAction]} />;
    }

    return null;
  };

  const startTime = dayjs(booking.startTime)
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
          paymentAmount={booking.eventType.price / 2}
          paymentCurrency={booking.payment[0].currency}
        />
      )}
      {booking.payment[0] && (
        <CompletePaymentDialog
          isOpenDialog={completePaymentDialogIsOpen}
          setIsOpenDialog={setCompletePaymentDialogIsOpen}
          bookingId={booking.id}
          paymentAmount={getRemainingPrice(paymentAppData)}
          paymentCurrency={booking.payment[0].currency}
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

      <tr data-testid="booking-item" className="hover:bg-muted group flex flex-col sm:flex-row">
        <td className="hidden align-top ltr:pl-6 rtl:pr-6 sm:table-cell sm:min-w-[12rem]">
          <Link href={bookingLink}>
            <div className="cursor-pointer py-4">
              <div className="text-emphasis text-sm leading-6">{startTime}</div>
              <div className="text-subtle text-sm">
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
              <PaymentStatus />
              {recurringDates !== undefined && (
                <div className="text-muted mt-2 text-sm">
                  <RecurringBookingsTooltip booking={booking} recurringDates={recurringDates} />
                </div>
              )}
            </div>
          </Link>
        </td>
        <td className={`w-full px-4${isRejected ? " line-through" : ""}`}>
          <Link href={bookingLink}>
            {/* Time and Badges for mobile */}
            <div className="w-full pb-2 pt-4 sm:hidden">
              <div className="flex w-full items-center justify-between sm:hidden">
                <div className="text-emphasis text-sm leading-6">{startTime}</div>
                <div className="text-subtle pr-2 text-sm">
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
              <PaymentStatus />
              {recurringDates !== undefined && (
                <div className="text-muted text-sm sm:hidden">
                  <RecurringBookingsTooltip booking={booking} recurringDates={recurringDates} />
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
                  attendees={booking.attendees}
                  user={booking.user}
                  currentEmail={user?.email}
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
        <td className="flex w-full justify-end gap-4 py-4 pl-4 text-right text-sm font-medium ltr:pr-4 rtl:pl-4 sm:pl-0">
          {isUpcoming && !isCancelled ? (
            <>
              {isPending && user?.id === booking.user?.id && <TableActions actions={pendingActions} />}

              {isRejected && <div className="text-subtle text-sm">{t("rejected")}</div>}
            </>
          ) : null}
          <PaymentActions />
          <EditActions />
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
  const {
    t,
    i18n: { language },
  } = useLocale();
  const now = new Date();
  const recurringCount = recurringDates.filter((recurringDate) => {
    return (
      recurringDate >= now &&
      !booking.recurringInfo?.bookings[BookingStatus.CANCELLED]
        .map((date) => date.toDateString())
        .includes(recurringDate.toDateString())
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
                    {dayjs(aDate).locale(language).format("D MMMM YYYY")}
                  </p>
                );
              })}>
              <div className="text-default">
                <RefreshCcw
                  strokeWidth="3"
                  className="text-muted float-left mr-1 mt-1.5 inline-block h-3 w-3"
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
      href={`mailto:${user.email}`}
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
    <a className="hover:text-blue-500" href={`mailto:${email}`} onClick={(e) => e.stopPropagation()}>
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
    <div className="text-emphasis text-sm">
      {user && <FirstAttendee user={user} currentEmail={currentEmail} />}
      {attendees.length > 1 ? <span>,&nbsp;</span> : <span>&nbsp;{t("and")}&nbsp;</span>}
      <Attendee {...attendees[0]} />
      {attendees.length > 1 && (
        <>
          <div className="text-emphasis inline-block text-sm">&nbsp;{t("and")}&nbsp;</div>
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
