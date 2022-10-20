import Link from "next/link";
import { useRouter } from "next/router";
import { FC, useEffect, useState } from "react";

import dayjs, { Dayjs } from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { nameOfDay } from "@calcom/lib/weekday";
import type { Slot } from "@calcom/trpc/server/routers/viewer/slots";
import { SkeletonContainer, SkeletonText } from "@calcom/ui";

import classNames from "@lib/classNames";
import { timeZone } from "@lib/clock";

type AvailableTimesProps = {
  timeFormat: string;
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
      <div className="mb-4 text-left text-base">
        <span className="text-bookingdarker dark:text-darkgray-800 mb-8 w-1/2 break-words font-semibold text-gray-900">
          {nameOfDay(i18n.language, Number(date.format("d")))}
        </span>
        <span className="text-bookinglight font-medium">
          {date.format(", D ")}
          {date.toDate().toLocaleString(i18n.language, { month: "long" })}
        </span>
      </div>
      <div className="-mb-5 grid flex-grow grid-cols-1 gap-x-2 overflow-y-auto sm:block md:h-[364px]">
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
                date: dayjs(slot.time).format(),
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
              <div key={dayjs(slot.time).format()}>
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
                  <Link href={bookingUrl} prefetch={false}>
                    <a
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
                    </a>
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
              <SkeletonText width="full" height="20" />
            </SkeletonContainer>
            <SkeletonContainer className="mb-2">
              <SkeletonText width="full" height="20" />
            </SkeletonContainer>
            <SkeletonContainer className="mb-2">
              <SkeletonText width="full" height="20" />
            </SkeletonContainer>
          </>
        )}
      </div>
    </div>
  );
};

AvailableTimes.displayName = "AvailableTimes";

export default AvailableTimes;
