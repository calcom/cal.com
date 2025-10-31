"use client";

import { z } from "zod";

import { getSuccessPageLocationMessage, guessEventLocationType } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import { SystemField } from "@calcom/lib/bookings/SystemField";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { getEveryFreqFor } from "@calcom/lib/recurringStrings";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
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
  SheetClose,
  SheetTitle,
} from "@calcom/ui/components/sheet";

import type { BookingOutput } from "../types";

type BookingMetaData = z.infer<typeof bookingMetadataSchema>;

interface BookingDetailsSheetProps {
  booking: BookingOutput | null;
  isOpen: boolean;
  onClose: () => void;
  userTimeZone?: string;
  userTimeFormat?: number;
  onPrevious?: () => void;
  hasPrevious?: boolean;
  onNext?: () => void;
  hasNext?: boolean;
}

export function BookingDetailsSheet({
  booking,
  isOpen,
  onClose,
  userTimeZone,
  onPrevious,
  hasPrevious = false,
  onNext,
  hasNext = false,
}: BookingDetailsSheetProps) {
  const { t } = useLocale();

  if (!booking) return null;

  const startTime = dayjs(booking.startTime).tz(userTimeZone);
  const endTime = dayjs(booking.endTime).tz(userTimeZone);

  const getStatusBadge = () => {
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
  };

  const statusBadge = getStatusBadge();

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
    ? Object.entries(booking.responses as Record<string, unknown>).map(([question, answer]) => {
        let translatedQuestion = question;
        if (SystemField.safeParse(question).success) {
          const translationKey = question.toLowerCase();
          const translated = t(translationKey);
          translatedQuestion = translated && translated !== translationKey ? translated : question;
        }
        return [translatedQuestion, answer] as [string, unknown];
      })
    : [];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="max-w-[484px] overflow-y-auto">
        <SheetHeader
          showCloseButton={false}
          rightContent={
            <div className="flex gap-2">
              <Button
                variant="icon"
                color="minimal"
                StartIcon="chevron-up"
                disabled={!hasPrevious}
                onClick={(e) => {
                  e.preventDefault();
                  onPrevious?.();
                }}
              />
              <Button
                variant="icon"
                color="minimal"
                StartIcon="chevron-down"
                disabled={!hasNext}
                onClick={(e) => {
                  e.preventDefault();
                  onNext?.();
                }}
              />
            </div>
          }>
          <div className="flex items-center gap-2">
            <Badge variant={statusBadge.variant} className="capitalize">
              {statusBadge.label}
            </Badge>
            {booking.eventType.team && <Badge variant="gray">{booking.eventType.team.name}</Badge>}
            {recurringInfo && (
              <Badge variant="gray">
                <Icon name="repeat" className="mr-1 h-3 w-3" />
                {recurringInfo.count}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <SheetBody className="space-y-6">
          <div className="space-y-6">
            <div className="space-y-1">
              <SheetTitle className="text-2xl font-semibold">{booking.title}</SheetTitle>
              <p className="text-subtle text-sm">
                {startTime.format("dddd, MMMM D, YYYY h:mma")} - {endTime.format("h:mma")} (
                {userTimeZone || startTime.format("Z")})
              </p>
            </div>

            <WhoSection booking={booking} />

            <WhereSection booking={booking} meta={bookingMetadata} />

            <RecurringInfoSection recurringInfo={recurringInfo} />

            <PaymentSection booking={booking} />

            <SlotsSection booking={booking} />

            <CustomQuestionsSection customResponses={customResponses} />

            <DescriptionSection booking={booking} />
          </div>
        </SheetBody>

        <SheetFooter className="bg-muted border-subtle -mx-4 -mb-4 border-t pt-0 sm:-mx-6 sm:-mb-6">
          <div className="flex flex-col-reverse gap-2 px-4 pb-4 pt-4 sm:flex-row sm:justify-end sm:px-6 sm:pb-6">
            <SheetClose asChild>
              <Button color="secondary">{t("cancel")}</Button>
            </SheetClose>
            <Button
              onClick={() => {
                window.location.href = `/booking/${booking.uid}?reschedule=true`;
              }}>
              {t("edit")}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function WhoSection({ booking }: { booking: BookingOutput }) {
  const { t } = useLocale();
  return (
    <Section title={t("who")}>
      <div className="space-y-4">
        {booking.user && (
          <div className="flex items-center gap-4">
            <Avatar
              size="md"
              imageSrc={getPlaceholderAvatar(null, booking.user.name)}
              alt={booking.user.name || ""}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-emphasis truncate text-sm font-medium">{booking.user.name}</p>
                <Badge variant="blue" size="sm">
                  {t("host")}
                </Badge>
              </div>
              <p className="text-default truncate text-sm">{booking.user.email}</p>
            </div>
          </div>
        )}

        {booking.attendees.map((attendee, idx) => (
          <div key={idx} className="flex items-center gap-4">
            <Avatar size="md" imageSrc={getPlaceholderAvatar(null, attendee.name)} alt={attendee.name} />
            <div className="min-w-0 flex-1">
              <p className="text-emphasis truncate text-sm font-medium">{attendee.name}</p>
              <p className="text-default truncate text-sm">{attendee.email}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function WhereSection({ booking, meta }: { booking: BookingOutput; meta: BookingMetaData | null }) {
  const { t } = useLocale();
  const locationVideoCallUrl = meta?.videoCallUrl;
  const locationToDisplay = booking.location
    ? getSuccessPageLocationMessage(
        locationVideoCallUrl ? locationVideoCallUrl : booking.location,
        t,
        booking.status
      )
    : null;

  if (!locationToDisplay) {
    return null;
  }

  const provider = guessEventLocationType(booking.location);
  const isLocationURL = typeof locationToDisplay === "string" && locationToDisplay.startsWith("http");

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
            className="h-4 w-4 flex-shrink-0 rounded-sm"
            alt={`${provider?.label} logo`}
          />
        )}
        <div className="flex min-w-0 items-baseline gap-1">
          <span className="text-default flex-shrink-0">{provider?.label}:</span>
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
      <p className="text-default text-sm">
        {getEveryFreqFor({
          t,
          recurringEvent: recurringInfo.recurringEvent,
          recurringCount: recurringInfo.count,
        })}
      </p>
    </Section>
  );
}

function PaymentSection({ booking }: { booking: BookingOutput }) {
  const { t } = useLocale();

  if (!booking.paid || !Array.isArray(booking.payment) || booking.payment.length === 0) {
    return null;
  }

  return (
    <Section title={t("payment")}>
      <p className="text-default text-sm">
        {booking.payment[0].currency} {(booking.payment[0].amount / 100).toFixed(2)}
      </p>
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
  const takenSeats = booking.seatsReferences.length;

  return (
    <Section title={t("slots")}>
      <p className="text-default text-sm">{t("slots_taken", { takenSeats, totalSeats })}</p>
    </Section>
  );
}

function CustomQuestionsSection({ customResponses }: { customResponses: [string, unknown][] }) {
  if (customResponses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {customResponses.map(([question, answer], idx) => (
        <div key={idx} className="space-y-1">
          <h3 className="text-subtle text-xs font-semibold capitalize">{question}</h3>
          <p className="text-default text-sm">{String(answer)}</p>
        </div>
      ))}
    </div>
  );
}

function DescriptionSection({ booking }: { booking: BookingOutput }) {
  const { t } = useLocale();

  if (!booking.description) {
    return null;
  }

  return (
    <Section title={t("description")}>
      <p className="text-default whitespace-pre-wrap text-sm">{booking.description}</p>
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
    <div className={classNames("space-y-1", className)}>
      <h3 className="text-subtle text-xs font-semibold">{title}</h3>
      {children}
    </div>
  );
}
