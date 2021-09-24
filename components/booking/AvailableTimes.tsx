import Link from "next/link";
import { useRouter } from "next/router";
import { useSlots } from "@lib/hooks/useSlots";
import { ExclamationIcon } from "@heroicons/react/solid";
import React from "react";
import Loader from "@components/Loader";
import { SchedulingType } from "@prisma/client";

const AvailableTimes = ({
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
  });

  return (
    <div className="mt-8 overflow-y-auto text-center sm:pl-4 sm:mt-0 sm:w-1/3 md:max-h-97">
      <div className="mb-4 text-lg font-light text-left text-gray-600">
        <span className="w-1/2 text-gray-600">
          <strong>{date.format("dddd")}</strong>
          <span className="text-gray-500">{date.format(", DD MMMM")}</span>
        </span>
      </div>
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
                <a className="block py-4 mb-4 font-medium bg-white border rounded-sm text-primary-500 border-primary-500 hover:text-white hover:bg-primary-500 :border-black :bg-black">
                  {slot.time.format(timeFormat)}
                </a>
              </Link>
            </div>
          );
        })}
      {!loading && !error && !(slots || []).length && (
        <div className="flex flex-col items-center content-center justify-center w-full h-full -mt-4">
          <h1 className="text-xl text-black ">All booked today.</h1>
        </div>
      )}

      {loading && <Loader />}

      {error && (
        <div className="p-4 border-l-4 border-yellow-400 bg-yellow-50">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationIcon className="w-5 h-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">Could not load the available time slots.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailableTimes;
