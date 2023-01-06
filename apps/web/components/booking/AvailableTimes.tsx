import Link from "next/link";
import { useRouter } from "next/router";
import { FC, useEffect, useState } from "react";

import dayjs, { Dayjs } from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { nameOfDay } from "@calcom/lib/weekday";
import type { Slot } from "@calcom/trpc/server/routers/viewer/slots";
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
  slots?: Slot[];
  isLoading: boolean;
  ethSignature?: string;
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
  ethSignature,
}) => {
  const { t, i18n } = useLocale();
  const router = useRouter();
  const { rescheduleUid } = router.query;

  const [brand, setBrand] = useState("#292929");

  useEffect(() => {
    setBrand(getComputedStyle(document.documentElement).getPropertyValue("--brand-color").trim());
  }, []);

  if (!date) return null;

  return (
    <div className="dark:bg-darkgray-100 mt-8 flex h-full w-full flex-col px-4 text-center sm:mt-0 sm:p-5 md:-mb-5 md:min-w-[200px] lg:min-w-[300px]">
      <div className="mb-6 flex items-center text-left text-base">
        <div className="mr-4">
          <span className="text-bookingdarker dark:text-darkgray-800 font-semibold text-gray-900">
            {nameOfDay(i18n.language, Number(date.format("d")), "short")}
          </span>
          <span className="text-bookinglight font-medium">
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
      <div className="flex-grow overflow-y-auto sm:block md:h-[364px]">
        {slots.length > 0 &&
          slots.map((slot) => {
            type BookingURL = {
              pathname: string;
              query: Record<string, string | number | string[] | undefined>;
            };
            const bookingUrl: BookingURL = {
              pathname: router.pathname.endsWith("/embed") ? "../book" : "book",
              query: {
                ...router.query,
                date: dayjs.utc(slot.time).tz(timeZone()).format(),
                type: eventTypeId,
                slug: eventTypeSlug,
                /** Treat as recurring only when a count exist and it's not a rescheduling workflow */
                count: recurringCount && !rescheduleUid ? recurringCount : undefined,
                ethSignature,
              },
            };

            if (rescheduleUid) {
              bookingUrl.query.rescheduleUid = rescheduleUid as string;
            }

            // If event already has an attendee add booking id
            if (slot.bookingUid) {
              bookingUrl.query.bookingUid = slot.bookingUid;
            }

            return (
              <div data-slot-owner={(slot.userIds || []).join(",")} key={`${dayjs(slot.time).format()}`}>
                {/* ^ data-slot-owner is helpful in debugging and used to identify the owners of the slot. Owners are the users which have the timeslot in their schedule. It doesn't consider if a user has that timeslot booked */}
                {/* Current there is no way to disable Next.js Links */}
                {seatsPerTimeSlot && slot.attendees && slot.attendees >= seatsPerTimeSlot ? (
                  <div
                    className={classNames(
                      "text-primary-500 dark:bg-darkgray-200 dark:text-darkgray-900 mb-2 block rounded-sm border bg-white py-2  font-medium opacity-25 dark:border-transparent ",
                      brand === "#fff" || brand === "#ffffff" ? "" : ""
                    )}>
                    {dayjs(slot.time).tz(timeZone()).format(timeFormat)}
                    {!!seatsPerTimeSlot && <p className="text-sm">{t("booking_full")}</p>}
                  </div>
                ) : (
                  <Link
                    href={bookingUrl}
                    prefetch={false}
                    className={classNames(
                      "text-primary-500 hover:border-gray-900 hover:bg-gray-50",
                      "dark:bg-darkgray-200 dark:hover:bg-darkgray-300 dark:hover:border-darkmodebrand mb-2 block rounded-md border bg-white py-2 text-sm font-medium dark:border-transparent dark:text-neutral-200",
                      brand === "#fff" || brand === "#ffffff" ? "" : ""
                    )}
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
            <h1 className="my-6 text-xl text-black dark:text-white">{t("all_booked_today")}</h1>
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
  );
};

AvailableTimes.displayName = "AvailableTimes";

export default AvailableTimes;
