import { useAutoAnimate } from "@formkit/auto-animate/react";
import Link from "next/link";
import { useRouter } from "next/router";
import type { FC } from "react";
import { useEffect, useState, useCallback } from "react";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { nameOfDay } from "@calcom/lib/weekday";
import { trpc } from "@calcom/trpc/react";
import type { Slot } from "@calcom/trpc/server/routers/viewer/slots/types";
import { SkeletonContainer, SkeletonText, ToggleGroup } from "@calcom/ui";

import classNames from "@lib/classNames";
import { timeZone } from "@lib/clock";

type AvailableTimesProps = {
  timeFormat: TimeFormat;
  onTimeFormatChange: (is24Hour: boolean) => void;
  eventTypeId: number;
  recurringCount: number | undefined;
  eventTypeSlug: string;
  date?: Dayjs;
  seatsPerTimeSlot?: number | null;
  bookingAttendees?: number | null;
  slots?: Slot[];
  isLoading: boolean;
  ethSignature?: string;
  duration: number;
};

const AvailableTimes: FC<AvailableTimesProps> = ({
  slots = [],
  isLoading,
  date,
  eventTypeId,
  eventTypeSlug,
  recurringCount,
  timeFormat,
  onTimeFormatChange,
  seatsPerTimeSlot,
  bookingAttendees,
  ethSignature,
  duration,
}) => {
  const reserveSlotMutation = trpc.viewer.public.slots.reserveSlot.useMutation();
  const [slotPickerRef] = useAutoAnimate<HTMLDivElement>();
  const { t, i18n } = useLocale();
  const router = useRouter();
  const { rescheduleUid } = router.query;

  const [brand, setBrand] = useState("#292929");

  useEffect(() => {
    setBrand(getComputedStyle(document.documentElement).getPropertyValue("--brand-color").trim());
  }, []);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const ref = useCallback(
    (node: HTMLDivElement) => {
      if (isMobile) {
        node?.scrollIntoView({ behavior: "smooth" });
      }
    },
    [isMobile]
  );

  const reserveSlot = (slot: Slot) => {
    reserveSlotMutation.mutate({
      slotUtcStartDate: slot.time,
      eventTypeId,
      slotUtcEndDate: dayjs(slot.time).utc().add(duration, "minutes").format(),
    });
  };

  return (
    <div ref={slotPickerRef}>
      {!!date ? (
        <div className="mt-8 flex h-full w-full flex-col rounded-md px-4 text-center sm:mt-0 sm:p-4 md:-mb-5 md:min-w-[200px] md:p-4 lg:min-w-[300px]">
          <div className="mb-4 flex items-center text-left text-base">
            <div className="mr-4">
              <span className="text-emphasis font-semibold">
                {nameOfDay(i18n.language, Number(date.format("d")), "short")}
              </span>
              <span className="text-subtle">
                , {date.toDate().toLocaleString(i18n.language, { month: "short" })} {date.format(" D ")}
              </span>
            </div>
            <div className="ml-auto">
              <ToggleGroup
                onValueChange={(timeFormat) => onTimeFormatChange(timeFormat === "24")}
                defaultValue={timeFormat === TimeFormat.TWELVE_HOUR ? "12" : "24"}
                options={[
                  { value: "12", label: t("12_hour_short") },
                  { value: "24", label: t("24_hour_short") },
                ]}
              />
            </div>
          </div>
          <div
            ref={ref}
            className="scroll-bar scrollbar-track-w-20 relative -mb-4 flex-grow overflow-y-auto sm:block md:h-[364px]">
            {slots.length > 0 &&
              slots.map((slot) => {
                type BookingURL = {
                  pathname: string;
                  query: Record<string, string | number | string[] | undefined | TimeFormat>;
                };
                const bookingUrl: BookingURL = {
                  pathname: router.pathname.endsWith("/embed") ? "../book" : "book",
                  query: {
                    ...router.query,
                    date: dayjs.utc(slot.time).tz(timeZone()).format(),
                    type: eventTypeId,
                    slug: eventTypeSlug,
                    timeFormat,
                    /** Treat as recurring only when a count exist and it's not a rescheduling workflow */
                    count: recurringCount && !rescheduleUid ? recurringCount : undefined,
                    ...(ethSignature ? { ethSignature } : {}),
                  },
                };

                if (rescheduleUid) {
                  bookingUrl.query.rescheduleUid = rescheduleUid as string;
                }

                // If event already has an attendee add booking id
                if (slot.bookingUid) {
                  bookingUrl.query.bookingUid = slot.bookingUid;
                }

                let slotFull, notEnoughSeats;

                if (slot.attendees && seatsPerTimeSlot) slotFull = slot.attendees >= seatsPerTimeSlot;
                if (slot.attendees && bookingAttendees && seatsPerTimeSlot)
                  notEnoughSeats = slot.attendees + bookingAttendees > seatsPerTimeSlot;

                return (
                  <div data-slot-owner={(slot.userIds || []).join(",")} key={`${dayjs(slot.time).format()}`}>
                    {/* ^ data-slot-owner is helpful in debugging and used to identify the owners of the slot. Owners are the users which have the timeslot in their schedule. It doesn't consider if a user has that timeslot booked */}
                    {/* Current there is no way to disable Next.js Links */}
                    {seatsPerTimeSlot && slot.attendees && (slotFull || notEnoughSeats) ? (
                      <div
                        className={classNames(
                          "text-default bg-default border-subtle mb-2 block rounded-sm border py-2 font-medium opacity-25",
                          brand === "#fff" || brand === "#ffffff" ? "" : ""
                        )}>
                        {dayjs(slot.time).tz(timeZone()).format(timeFormat)}
                        {notEnoughSeats ? (
                          <p className="text-sm">{t("not_enough_seats")}</p>
                        ) : slots ? (
                          <p className="text-sm">{t("booking_full")}</p>
                        ) : null}
                      </div>
                    ) : (
                      <Link
                        href={bookingUrl}
                        prefetch={false}
                        className={classNames(
                          " bg-default dark:bg-muted border-default hover:bg-subtle hover:border-brand-default text-emphasis mb-2 block rounded-md border py-2 text-sm font-medium",
                          brand === "#fff" || brand === "#ffffff" ? "" : ""
                        )}
                        onClick={() => reserveSlot(slot)}
                        data-testid="time">
                        {dayjs(slot.time).tz(timeZone()).format(timeFormat)}
                        {!!seatsPerTimeSlot && (
                          <p
                            className={`${
                              slot.attendees && slot.attendees / seatsPerTimeSlot >= 0.8
                                ? "text-rose-600"
                                : slot.attendees && slot.attendees / seatsPerTimeSlot >= 0.33
                                ? "text-yellow-500"
                                : "text-emerald-400"
                            } text-sm`}>
                            {slot.attendees ? seatsPerTimeSlot - slot.attendees : seatsPerTimeSlot} /{" "}
                            {seatsPerTimeSlot} {t("seats_available")}
                          </p>
                        )}
                      </Link>
                    )}
                  </div>
                );
              })}

            {!isLoading && !slots.length && (
              <div className="-mt-4 flex h-full w-full flex-col content-center items-center justify-center">
                <h1 className="text-emphasis my-6 text-xl">{t("all_booked_today")}</h1>
              </div>
            )}

            {isLoading && !slots.length && (
              <>
                <SkeletonContainer className="mb-2">
                  <SkeletonText className="h-5 w-full" />
                </SkeletonContainer>
                <SkeletonContainer className="mb-2">
                  <SkeletonText className="h-5 w-full" />
                </SkeletonContainer>
                <SkeletonContainer className="mb-2">
                  <SkeletonText className="h-5 w-full" />
                </SkeletonContainer>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

AvailableTimes.displayName = "AvailableTimes";

export default AvailableTimes;
