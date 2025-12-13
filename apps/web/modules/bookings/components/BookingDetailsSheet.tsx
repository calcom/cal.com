"use client";

import Link from "next/link";
import { useMemo } from "react";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { useBookingLocation } from "@calcom/features/bookings/hooks";
import { shouldShowFieldInCustomResponses } from "@calcom/lib/bookings/SystemField";
import { formatPrice } from "@calcom/lib/currencyConversions";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { getEveryFreqFor } from "@calcom/lib/recurringStrings";
import { BookingStatus } from "@calcom/prisma/enums";
import {
  bookingMetadataSchema,
  eventTypeBookingFields,
  EventTypeMetaDataSchema,
} from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import type { RecurringEvent } from "@calcom/types/Calendar";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";
import {
  Sheet,
  SheetContent,
  SheetBody,
  SheetHeader,
  SheetFooter,
  SheetTitle,
} from "@calcom/ui/components/sheet";

import assignmentReasonBadgeTitleMap from "@lib/booking/assignmentReasonBadgeTitleMap";

import { AcceptBookingButton } from "../../../components/booking/AcceptBookingButton";
import { RejectBookingButton } from "../../../components/booking/RejectBookingButton";
import { BookingActionsDropdown } from "../../../components/booking/actions/BookingActionsDropdown";
import { BookingActionsStoreProvider } from "../../../components/booking/actions/BookingActionsStoreProvider";
import type { BookingListingStatus } from "../../../components/booking/types";
import { usePaymentStatus } from "../hooks/usePaymentStatus";
import { useBookingDetailsSheetStore } from "../store/bookingDetailsSheetStore";
import type { BookingOutput } from "../types";
import { JoinMeetingButton } from "./JoinMeetingButton";

type BookingMetaData = z.infer<typeof bookingMetadataSchema>;

interface BookingDetailsSheetProps {
  userTimeZone?: string;
  userTimeFormat?: number;
  userId?: number;
  userEmail?: string;
}

export function BookingDetailsSheet({
  userTimeZone,
  userTimeFormat,
  userId,
  userEmail,
}: BookingDetailsSheetProps) {
  const booking = useBookingDetailsSheetStore((state) => state.getSelectedBooking());

  // Return null if no booking is selected (sheet is closed)
  if (!booking) return null;

  return (
    <BookingActionsStoreProvider>
      <BookingDetailsSheetInner
        booking={booking}
        userTimeZone={userTimeZone}
        userTimeFormat={userTimeFormat}
        userId={userId}
        userEmail={userEmail}
      />
    </BookingActionsStoreProvider>
  );
}

interface BookingDetailsSheetInnerProps {
  booking: BookingOutput;
  userTimeZone?: string;
  userTimeFormat?: number;
  userId?: number;
  userEmail?: string;
}

function BookingDetailsSheetInner({
  booking,
  userTimeZone,
  userTimeFormat,
  userId,
  userEmail,
}: BookingDetailsSheetInnerProps) {
  const { t } = useLocale();

  // Fetch additional booking details for reschedule information
  const { data: bookingDetails } = trpc.viewer.bookings.getBookingDetails.useQuery(
    { uid: booking.uid },
    {
      // Keep data fresh but don't refetch too aggressively
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Get navigation state from the store in a single selector
  const navigation = useBookingDetailsSheetStore((state) => {
    const hasNextInArray = state.hasNextInArray();
    const hasPreviousInArray = state.hasPreviousInArray();
    const isLastInArray = state.isLastInArray();
    const isFirstInArray = state.isFirstInArray();

    return {
      navigateNext: state.navigateNext,
      navigatePrevious: state.navigatePrevious,
      isTransitioning: state.isTransitioning,
      setSelectedBookingUid: state.setSelectedBookingUid,
      canGoNext: hasNextInArray || (isLastInArray && state.capabilities?.canNavigateToNextPeriod()),
      canGoPrev: hasPreviousInArray || (isFirstInArray && state.capabilities?.canNavigateToPreviousPeriod()),
    };
  });

  const handleClose = () => {
    navigation.setSelectedBookingUid(null);
  };

  const handleNext = () => {
    navigation.navigateNext();
  };

  const handlePrevious = () => {
    navigation.navigatePrevious();
  };

  const startTime = dayjs(booking.startTime).tz(userTimeZone);
  const endTime = dayjs(booking.endTime).tz(userTimeZone);

  const statusBadge = useMemo(() => {
    if (booking.rescheduled) {
      return {
        variant: "red" as const,
        label: t("rescheduled"),
      };
    }

    switch (booking.status) {
      case "ACCEPTED":
        return { variant: "green" as const, label: t("confirmed") };
      case "PENDING":
        return { variant: "orange" as const, label: t("pending") };
      case "CANCELLED":
        return { variant: "red" as const, label: t("cancelled") };
      case "REJECTED":
        return { variant: "red" as const, label: t("rejected") };
      default:
        return { variant: "gray" as const, label: booking.status };
    }
  }, [booking.status, booking.rescheduled, t]);

  const isPending = booking.status === BookingStatus.PENDING;

  const parsedMetadata = bookingMetadataSchema.safeParse(booking.metadata ?? null);
  const bookingMetadata = parsedMetadata.success ? parsedMetadata.data : null;

  const recurringInfo =
    booking.recurringEventId && booking.eventType?.recurringEvent
      ? {
          count: booking.eventType.recurringEvent.count,
          recurringEvent: booking.eventType.recurringEvent,
        }
      : null;

  const customResponses = booking.responses
    ? Object.entries(booking.responses as Record<string, unknown>)
        .filter(([fieldName]) => shouldShowFieldInCustomResponses(fieldName))
        .map(([question, answer]) => [question, answer] as [string, unknown])
    : [];

  const reason = booking.assignmentReason?.[0];
  const reasonTitle = reason && assignmentReasonBadgeTitleMap(reason.reasonEnum);

  return (
    <Sheet open={true} onOpenChange={handleClose} modal={false}>
      <SheetContent
        className="overflow-y-auto"
        hideOverlay
        onInteractOutside={(e) => {
          // Check if the click is on a booking list item
          const target = e.target as HTMLElement;
          const isBookingListItem = target.closest("[data-booking-list-item]");

          if (isBookingListItem) {
            // Prevent closing when clicking a booking list item
            // The item's onClick will handle opening the sheet with the new booking
            e.preventDefault();
          }
          // If clicking elsewhere, allow the default behavior (close the sheet)
        }}>
        <SheetHeader showCloseButton={false} className="mt-0 w-full">
          <div className="flex items-center justify-between gap-x-4">
            <div className="flex min-w-0 flex-col gap-y-1">
              <BookingHeaderBadges
                statusBadge={statusBadge}
                reasonTitle={reasonTitle}
                booking={booking}
                recurringInfo={recurringInfo}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="icon"
                size="sm"
                color="secondary"
                StartIcon="chevron-up"
                disabled={!navigation.canGoPrev || navigation.isTransitioning}
                onClick={(e) => {
                  e.preventDefault();
                  handlePrevious();
                }}
              />
              <Button
                variant="icon"
                size="sm"
                color="secondary"
                StartIcon="chevron-down"
                disabled={!navigation.canGoNext || navigation.isTransitioning}
                onClick={(e) => {
                  e.preventDefault();
                  handleNext();
                }}
              />
              <Button
                variant="icon"
                size="sm"
                color="secondary"
                StartIcon="x"
                onClick={(e) => {
                  e.preventDefault();
                  handleClose();
                }}
              />
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="-mt-3">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <SheetTitle className="text-emphasis flex items-center gap-3 text-xl font-semibold">
                <div className="bg-emphasis w-0.5 shrink-0 self-stretch rounded-lg"></div>
                <span>{booking.title}</span>
              </SheetTitle>
            </div>

            <WhenSection
              rescheduled={booking.rescheduled || false}
              startTime={startTime}
              endTime={endTime}
              timeZone={userTimeZone}
              previousBooking={bookingDetails?.previousBooking}
            />

            <OldRescheduledBookingInfo
              booking={booking}
              rescheduledToBooking={bookingDetails?.rescheduledToBooking}
            />

            <NewRescheduledBookingInfo booking={booking} />

            <CancelledBookingInfo booking={booking} />

            <WhoSection booking={booking} />

            <WhereSection booking={booking} meta={bookingMetadata} />

            <RecurringInfoSection recurringInfo={recurringInfo} />

            <AssignmentReasonSection booking={booking} />

            {booking.payment?.[0] && <PaymentSection booking={booking} payment={booking.payment[0]} />}

            <SlotsSection booking={booking} />

            <AdditionalNotesSection booking={booking} />

            <CustomQuestionsSection
              customResponses={customResponses}
              bookingFields={booking.eventType?.bookingFields}
            />

            <TrackingSection tracking={bookingDetails?.tracking} />
          </div>
        </SheetBody>

        <SheetFooter className="bg-muted border-subtle -mx-4 -mb-4 border-t pt-0 sm:-mx-6 sm:-my-6">
          <div className="flex w-full min-w-0 flex-row flex-wrap items-center justify-end gap-2 px-4 pb-4 pt-4">
            {isPending ? (
              <>
                <RejectBookingButton
                  bookingId={booking.id}
                  bookingUid={booking.uid}
                  recurringEventId={booking.recurringEventId}
                  isRecurring={!!booking.recurringEventId}
                />
                <AcceptBookingButton
                  bookingId={booking.id}
                  bookingUid={booking.uid}
                  recurringEventId={booking.recurringEventId}
                  isRecurring={!!booking.recurringEventId}
                />
              </>
            ) : (
              !booking.rescheduled && (
                <JoinMeetingButton
                  location={booking.location}
                  metadata={booking.metadata}
                  bookingStatus={booking.status}
                />
              )
            )}

            <BookingActionsDropdown
              booking={{
                ...booking,
                listingStatus: booking.status.toLowerCase() as BookingListingStatus,
                recurringInfo: undefined,
                loggedInUser: {
                  userId,
                  userTimeZone,
                  userTimeFormat: userTimeFormat ?? null,
                  userEmail,
                },
                isToday: false,
              }}
              usePortal={false}
              context="details"
            />
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function WhenSection({
  rescheduled,
  startTime,
  endTime,
  timeZone,
  previousBooking,
}: {
  rescheduled: boolean;
  startTime: dayjs.Dayjs;
  endTime: dayjs.Dayjs;
  timeZone?: string;
  previousBooking?: { uid: string; startTime: Date; endTime: Date } | null;
}) {
  const { t } = useLocale();

  return (
    <Section title={t("when")}>
      {previousBooking?.startTime && previousBooking?.endTime && (
        <div className="text-default flex flex-col text-sm line-through opacity-60">
          <DisplayTimestamp
            startTime={previousBooking.startTime}
            endTime={previousBooking.endTime}
            timeZone={timeZone}
          />
        </div>
      )}
      <div
        className={classNames(
          "text-emphasis flex flex-col text-sm font-medium",
          rescheduled && "line-through"
        )}>
        <DisplayTimestamp startTime={startTime} endTime={endTime} timeZone={timeZone} />
      </div>
    </Section>
  );
}

function DisplayTimestamp({
  startTime,
  endTime,
  timeZone,
}: {
  startTime: Date | dayjs.Dayjs;
  endTime: Date | dayjs.Dayjs;
  timeZone?: string;
}) {
  const start = startTime instanceof Date ? dayjs(startTime).tz(timeZone) : startTime;
  const end = endTime instanceof Date ? dayjs(endTime).tz(timeZone) : endTime;

  return (
    <>
      <span>{start.format("dddd, MMMM D, YYYY")}</span>
      <span>
        {start.format("h:mma")} - {end.format("h:mma")} ({timeZone || start.format("Z")})
      </span>
    </>
  );
}

function WhoSection({ booking }: { booking: BookingOutput }) {
  const { t } = useLocale();
  return (
    <Section title={t("who")}>
      <div className="mt-2 flex flex-col gap-3">
        {booking.user && (
          <div className="flex items-center gap-4">
            <Avatar
              size="md"
              imageSrc={
                booking.user.avatarUrl
                  ? getUserAvatarUrl(booking.user)
                  : getPlaceholderAvatar(null, booking.user.name || booking.user.email)
              }
              alt={booking.user.name || booking.user.email || ""}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-emphasis truncate text-sm leading-[1.2]">
                  {booking.user.name || booking.user.email}
                </p>
                <Badge variant="purple" size="sm" className="capitalize">
                  {t("host")}
                </Badge>
              </div>
              <p className="text-default truncate text-sm leading-[1.2]">{booking.user.email}</p>
            </div>
          </div>
        )}

        {booking.attendees.map((attendee, idx) => {
          const name = attendee.user?.name || attendee.name || attendee.user?.email || attendee.email;
          return (
            <div key={idx} className="flex items-center gap-4">
              <Avatar
                size="md"
                imageSrc={
                  attendee.user?.avatarUrl
                    ? getUserAvatarUrl(attendee.user)
                    : getPlaceholderAvatar(null, name)
                }
                alt={name}
              />
              <div className="min-w-0 flex-1">
                <p className="text-emphasis truncate text-sm leading-[1.2]">{name}</p>
                <p className="text-default truncate text-sm leading-[1.2]">{attendee.email}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function WhereSection({ booking, meta }: { booking: BookingOutput; meta: BookingMetaData | null }) {
  const { t } = useLocale();

  const { locationToDisplay, provider, isLocationURL } = useBookingLocation({
    location: booking.location,
    videoCallUrl: meta?.videoCallUrl,
    t,
    bookingStatus: booking.status,
  });

  if (booking.rescheduled) {
    return null;
  }

  if (!locationToDisplay) {
    return null;
  }

  if (!isLocationURL) {
    return (
      <Section title={t("where")}>
        <p className="text-default text-sm">{locationToDisplay}</p>
      </Section>
    );
  }

  return (
    <Section title={t("where")}>
      <div className="flex items-center gap-2 text-sm">
        {provider?.iconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={provider.iconUrl}
            className="h-4 w-4 shrink-0 rounded-sm"
            alt={`${provider?.label} logo`}
          />
        )}
        <div className="flex min-w-0 items-baseline gap-1">
          <span className="text-emphasis shrink-0 font-medium">{provider?.label}:</span>
          <a
            href={locationToDisplay}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-blue-600 hover:underline">
            {locationToDisplay}
          </a>
        </div>
      </div>
    </Section>
  );
}

function RecurringInfoSection({
  recurringInfo,
}: {
  recurringInfo: { count: number; recurringEvent: RecurringEvent } | null;
}) {
  const { t } = useLocale();

  if (!recurringInfo || recurringInfo.count <= 0) {
    return null;
  }

  return (
    <Section title={t("recurring_event")}>
      <p className="text-emphasis text-sm font-medium">
        {getEveryFreqFor({
          t,
          recurringEvent: recurringInfo.recurringEvent,
          recurringCount: recurringInfo.count,
        })}
      </p>
    </Section>
  );
}

function AssignmentReasonSection({ booking }: { booking: BookingOutput }) {
  const { t } = useLocale();

  if (!booking.assignmentReason || booking.assignmentReason.length === 0) {
    return null;
  }

  // we fetch only one assignment reason.
  const reason = booking.assignmentReason[0];
  if (!reason.reasonString) {
    return null;
  }

  return (
    <Section title={t("assignment_reason")}>
      <div className="text-emphasis text-sm font-medium">{reason.reasonString}</div>
    </Section>
  );
}

function PaymentSection({
  booking,
  payment,
}: {
  booking: BookingOutput;
  payment: NonNullable<BookingOutput["payment"]>[number];
}) {
  const { t } = useLocale();

  // Get refund policy from event type metadata
  const parsedEventTypeMetadata = booking.eventType?.metadata
    ? EventTypeMetaDataSchema.safeParse(booking.eventType.metadata)
    : null;
  const eventTypeMetadata = parsedEventTypeMetadata?.success ? parsedEventTypeMetadata.data : null;

  const refundPolicy = eventTypeMetadata?.apps?.stripe?.refundPolicy;
  const refundDaysCount = eventTypeMetadata?.apps?.stripe?.refundDaysCount;

  const paymentStatusMessage = usePaymentStatus({
    bookingStatus: booking.status,
    startTime: booking.startTime,
    eventTypeTeamId: booking.eventType?.teamId,
    userId: booking.user?.id,
    payment,
    refundPolicy,
    refundDaysCount,
  });

  const formattedPrice = formatPrice(payment.amount, payment.currency);

  return (
    <Section title={t("payment")}>
      <p className="text-emphasis text-sm font-medium">{formattedPrice}</p>
      {paymentStatusMessage && <p className="text-subtle text-xs">{paymentStatusMessage}</p>}
    </Section>
  );
}

function SlotsSection({ booking }: { booking: BookingOutput }) {
  const { t } = useLocale();

  if (
    !booking.eventType?.seatsShowAvailabilityCount ||
    !booking.eventType?.seatsPerTimeSlot ||
    booking.eventType.seatsPerTimeSlot <= 0
  ) {
    return null;
  }

  const totalSeats = booking.eventType.seatsPerTimeSlot;
  const takenSeats = booking.attendees.length;

  return (
    <Section title={t("slots")}>
      <p className="text-emphasis text-sm font-medium">{t("slots_taken", { takenSeats, totalSeats })}</p>
    </Section>
  );
}

function CustomQuestionsSection({
  customResponses,
  bookingFields: rawBookingFields,
}: {
  customResponses: [string, unknown][];
  bookingFields?: unknown;
}) {
  const { t } = useLocale();

  // Parse and memoize booking fields
  const bookingFields = useMemo(() => {
    if (!rawBookingFields) return undefined;
    const parsed = eventTypeBookingFields.safeParse(rawBookingFields);
    return parsed.success ? parsed.data : undefined;
  }, [rawBookingFields]);

  // Filter out responses with falsy answers or empty arrays
  const validResponses = useMemo(
    (): [string, unknown][] =>
      customResponses.filter(([, answer]) => {
        if (!answer) return false;
        if (Array.isArray(answer) && answer.length === 0) return false;
        return true;
      }),
    [customResponses]
  );

  // Memoize field label lookups
  const fieldLabels = useMemo(() => {
    if (!bookingFields) return new Map<string, string>();

    return new Map<string, string>(
      bookingFields.map(
        (field) => [field.name, field.label || t(field.defaultLabel || field.name)] as [string, string]
      )
    );
  }, [bookingFields, t]);

  if (validResponses.length === 0) {
    return null;
  }

  return (
    <>
      {validResponses.map(([fieldName, answer], idx) => {
        const fieldNameStr = String(fieldName);
        const title: string = fieldLabels.get(fieldNameStr) ?? fieldNameStr;
        return (
          <Section key={idx} title={title}>
            <p className="text-emphasis text-sm font-medium">{String(answer)}</p>
          </Section>
        );
      })}
    </>
  );
}

// Old booking that was rescheduled away
function OldRescheduledBookingInfo({
  booking,
  rescheduledToBooking,
}: {
  booking: BookingOutput;
  rescheduledToBooking?: { uid: string } | null;
}) {
  const { t } = useLocale();

  // Only show for old rescheduled bookings
  if (!booking.rescheduled) {
    return null;
  }

  const cancellationReason = booking.cancellationReason || booking.rejectionReason;
  const rescheduledBy = booking.rescheduledBy;
  const cancelledBy = booking.cancelledBy;

  return (
    <>
      {rescheduledToBooking?.uid && (
        <Section title={t("rescheduled")}>
          <Link href={`/booking/${rescheduledToBooking.uid}`}>
            <div className="text-default flex items-center gap-1 text-sm underline">
              {t("view_booking")}
              <Icon name="external-link" className="h-4 w-4" />
            </div>
          </Link>
        </Section>
      )}
      {rescheduledBy && (
        <Section title={t("rescheduled_by")}>
          <p className="text-emphasis text-sm font-medium">{rescheduledBy}</p>
        </Section>
      )}
      {cancellationReason && (
        <Section title={t("reason")}>
          <p className="text-emphasis whitespace-pre-wrap text-sm font-medium">{cancellationReason}</p>
        </Section>
      )}
      {cancelledBy && (
        <Section title={t("cancelled_by")}>
          <p className="text-emphasis text-sm font-medium">{cancelledBy}</p>
        </Section>
      )}
    </>
  );
}

// New booking that replaced an old one
function NewRescheduledBookingInfo({ booking }: { booking: BookingOutput }) {
  const { t } = useLocale();

  // Only show for new bookings that replaced an old one
  if (!booking.fromReschedule) {
    return null;
  }

  const cancellationReason = booking.cancellationReason || booking.rejectionReason;
  const rescheduledBy = booking.rescheduler;

  return (
    <>
      <Section title={t("rescheduled_by")}>
        {rescheduledBy && <p className="text-emphasis text-sm font-medium">{rescheduledBy}</p>}
        <Link href={`/booking/${booking.fromReschedule}`}>
          <div className="text-default flex items-center gap-1 text-sm underline">
            {t("original_booking")}
            <Icon name="external-link" className="h-4 w-4" />
          </div>
        </Link>
      </Section>
      {cancellationReason && (
        <Section title={t("reschedule_reason")}>
          <p className="text-emphasis whitespace-pre-wrap text-sm font-medium">{cancellationReason}</p>
        </Section>
      )}
    </>
  );
}

// Purely cancelled or rejected (not rescheduled)
function CancelledBookingInfo({ booking }: { booking: BookingOutput }) {
  const { t } = useLocale();

  // Only show for cancelled/rejected bookings that were NOT rescheduled
  const isCancelled = booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REJECTED;
  const wasRescheduled = booking.rescheduled === true;

  if (!isCancelled || wasRescheduled) {
    return null;
  }

  const cancellationReason = booking.cancellationReason || booking.rejectionReason;
  const cancelledBy = booking.cancelledBy;

  if (!cancellationReason && !cancelledBy) {
    return null;
  }

  return (
    <>
      {cancelledBy && (
        <Section title={t("cancelled_by")}>
          <p className="text-emphasis text-sm font-medium">{cancelledBy}</p>
        </Section>
      )}
      {cancellationReason && (
        <Section title={t("reason")}>
          <p className="text-emphasis whitespace-pre-wrap text-sm font-medium">{cancellationReason}</p>
        </Section>
      )}
    </>
  );
}

function AdditionalNotesSection({ booking }: { booking: BookingOutput }) {
  const { t } = useLocale();

  if (!booking.description) {
    return null;
  }

  return (
    <Section title={t("additional_notes")}>
      <p className="text-emphasis whitespace-pre-wrap text-sm font-medium">{booking.description}</p>
    </Section>
  );
}

function BookingHeaderBadges({
  statusBadge,
  reasonTitle,
  booking,
  recurringInfo,
}: {
  statusBadge: { variant: "red" | "green" | "orange" | "gray"; label: string };
  reasonTitle: string | undefined;
  booking: BookingOutput;
  recurringInfo: { count: number; recurringEvent: RecurringEvent } | null;
}) {
  const { t } = useLocale();
  const payment = booking.payment?.[0];

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <Badge variant={statusBadge.variant} className="capitalize">
        {statusBadge.label}
      </Badge>
      {reasonTitle && (
        <Badge variant="gray" className="capitalize">
          {reasonTitle}
        </Badge>
      )}
      {booking.eventType.team && <Badge variant="gray">{booking.eventType.team.name}</Badge>}
      {booking.paid && !payment ? (
        <Badge variant="orange">{t("error_collecting_card")}</Badge>
      ) : booking.paid ? (
        <Badge variant="green" data-testid="paid_badge">
          {payment?.paymentOption === "HOLD" ? t("card_held") : t("paid")}
        </Badge>
      ) : null}
      {recurringInfo && (
        <Badge variant="gray">
          <Icon name="repeat" className="mr-1 h-3 w-3" />
          {recurringInfo.count}
        </Badge>
      )}
    </div>
  );
}

function TrackingSection({
  tracking,
}: {
  tracking?: {
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    utm_term: string | null;
    utm_content: string | null;
  } | null;
}) {
  const { t } = useLocale();

  if (!tracking) {
    return null;
  }

  const utmEntries = Object.entries(tracking).filter(([_, value]) => Boolean(value));

  if (utmEntries.length === 0) {
    return null;
  }

  return (
    <Section title={t("utm_params")}>
      <div className="text-default text-sm">
        {utmEntries.map(([key, value]) => (
          <div key={key} className="mb-1 last:mb-0">
            <span className="font-medium">{key}</span>:{" "}
            <code className="bg-subtle text-default rounded px-1 py-0.5 font-mono text-xs">{value}</code>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Section({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={classNames("flex flex-col gap-1", className)}>
      <h3 className="text-subtle text-xs font-medium">{title}</h3>
      {children}
    </div>
  );
}
