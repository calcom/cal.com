"use client";

import dayjs from "@calcom/dayjs";
import { SystemField } from "@calcom/lib/bookings/SystemField";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
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

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

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
        return { variant: "green" as const, label: capitalize(t("confirmed")) };
      case "PENDING":
        return { variant: "orange" as const, label: capitalize(t("pending")) };
      case "CANCELLED":
        return { variant: "red" as const, label: capitalize(t("cancelled")) };
      case "REJECTED":
        return { variant: "red" as const, label: capitalize(t("rejected")) };
      default:
        return { variant: "gray" as const, label: booking.status };
    }
  };

  const statusBadge = getStatusBadge();

  const getMeetingLocation = () => {
    if (!booking.location) return null;

    const videoRef = booking.references?.find((ref) => ref.type.includes("_video"));

    if (videoRef?.meetingUrl) {
      let platform = "Meeting";
      if (videoRef.type.includes("zoom")) platform = "Zoom";
      else if (videoRef.type.includes("google_meet")) platform = "Google Meet";
      else if (videoRef.type.includes("teams")) platform = "Teams";

      return {
        type: "video",
        platform,
        url: videoRef.meetingUrl,
      };
    }

    if (booking.location.startsWith("http")) {
      return {
        type: "link",
        platform: "Link",
        url: booking.location,
      };
    }

    return {
      type: "text",
      platform: null,
      text: booking.location,
    };
  };

  const location = getMeetingLocation();

  const recurringInfo = booking.recurringEventId
    ? {
        count: 0, // TODO: Get actual count from recurring data
        frequency: "weekly", // TODO: Get actual frequency
      }
    : null;

  const customResponses = booking.responses
    ? Object.entries(booking.responses as Record<string, unknown>).map(([question, answer]) => {
        let translatedQuestion = question;
        if (SystemField.safeParse(question).success) {
          const translationKey = question.toLowerCase();
          const translated = t(translationKey);
          translatedQuestion =
            translated && translated !== translationKey ? translated : capitalize(question);
        } else {
          translatedQuestion = capitalize(question);
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
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
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
            <div className="space-y-3">
              <h3 className="text-subtle text-xs font-semibold">{t("who")}</h3>
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
                    <Avatar
                      size="md"
                      imageSrc={getPlaceholderAvatar(null, attendee.name)}
                      alt={attendee.name}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-emphasis truncate text-sm font-medium">{attendee.name}</p>
                      <p className="text-default truncate text-sm">{attendee.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {location && (
              <div className="space-y-1">
                <h3 className="text-subtle text-xs font-semibold">{t("where")}</h3>
                {location.type === "video" || location.type === "link" ? (
                  <div className="flex items-baseline gap-1 text-sm">
                    <span className="text-default">{location.platform}:</span>
                    <a
                      href={location.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-blue-600 hover:underline">
                      {location.url}
                    </a>
                  </div>
                ) : (
                  <p className="text-default text-sm">{location.text}</p>
                )}
              </div>
            )}

            {recurringInfo && recurringInfo.count > 0 && (
              <div className="space-y-1">
                <h3 className="text-subtle text-xs font-semibold">{t("recurring_event")}</h3>
                <p className="text-default text-sm">
                  {/* TODO: Get actual recurring pattern text */}
                  {t("recurring_booking_description", {
                    frequency: recurringInfo.frequency,
                    count: recurringInfo.count,
                  })}
                </p>
              </div>
            )}

            {/* Payment */}
            {booking.paid && Array.isArray(booking.payment) && booking.payment.length > 0 && (
              <div className="space-y-1">
                <h3 className="text-subtle text-xs font-semibold">{t("payment")}</h3>
                <p className="text-default text-sm">
                  {booking.payment[0].currency} {(booking.payment[0].amount / 100).toFixed(2)}
                </p>
              </div>
            )}

            {/* Slots - TODO: Get actual slot data from booking.metadata */}

            {/* Custom Questions */}
            {customResponses.length > 0 && (
              <div className="space-y-4">
                {customResponses.map(([question, answer], idx) => (
                  <div key={idx} className="space-y-1">
                    <h3 className="text-subtle text-xs font-semibold">{question}</h3>
                    <p className="text-default text-sm">{String(answer)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            {booking.description && (
              <div className="space-y-1">
                <h3 className="text-subtle text-xs font-semibold">{t("description")}</h3>
                <p className="text-default whitespace-pre-wrap text-sm">{booking.description}</p>
              </div>
            )}
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
