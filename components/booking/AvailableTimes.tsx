import { ExclamationIcon } from "@heroicons/react/solid";
import { SchedulingType } from "@prisma/client";
import { Dayjs } from "dayjs";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { FC } from "react";

import { useSlots } from "@lib/hooks/useSlots";

import Loader from "@components/Loader";

type AvailableTimesProps = {
  workingHours: {
    days: number[];
    startTime: number;
    endTime: number;
  }[];
  timeFormat: string;
  minimumBookingNotice: number;
  eventTypeId: number;
  eventLength: number;
  date: Dayjs;
  users: {
    username: string | null;
  }[];
  schedulingType: SchedulingType | null;
};

const AvailableTimes: FC<AvailableTimesProps> = ({
  date,
  eventLength,
  eventTypeId,
  minimumBookingNotice,
  workingHours,
  timeFormat,
  users,
  schedulingType,
}) => {
  const router = useRouter();
  const { rescheduleUid } = router.query;

  const { slots, loading, error } = useSlots({
    date,
    eventLength,
    schedulingType,
    workingHours,
    users,
    minimumBookingNotice,
    eventTypeId,
  });

  return (
    <div className="sm:pl-4 mt-8 sm:mt-0 text-center sm:w-1/3 md:-mb-5">
      <div className="text-gray-600 font-light text-lg mb-4 text-left">
        <span className="w-1/2 dark:text-white text-gray-600">
          <strong>{date.format("dddd")}</strong>
          <span className="text-gray-500">{date.format(", DD MMMM")}</span>
        </span>
      </div>
      <div className="md:max-h-[364px] overflow-y-auto">
        {!loading &&
          slots?.length > 0 &&
          slots.map((slot) => {
            const bookingUrl = {
              pathname: "book",
              query: {
                ...router.query,
                date: slot.time.format(),
                type: eventTypeId,
              },
            };

            if (rescheduleUid) {
              bookingUrl.query.rescheduleUid = rescheduleUid;
            }

            if (schedulingType === SchedulingType.ROUND_ROBIN) {
              bookingUrl.query.user = slot.users;
            }

            return (
              <div key={slot.time.format()}>
                <Link href={bookingUrl}>
                  <a className="block font-medium mb-2 bg-white dark:bg-gray-600 text-primary-500 dark:text-neutral-200 border border-primary-500 dark:border-transparent rounded-sm hover:text-white hover:bg-primary-500 dark:hover:border-black py-4 dark:hover:bg-black">
                    {slot.time.format(timeFormat)}
                  </a>
                </Link>
              </div>
            );
          })}
        {!loading && !error && !slots.length && (
          <div className="w-full h-full flex flex-col justify-center content-center items-center -mt-4">
            <h1 className="my-6 text-xl text-black dark:text-white">All booked today.</h1>
          </div>
        )}

        {loading && <Loader />}

        {error && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">Could not load the available time slots.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailableTimes;
