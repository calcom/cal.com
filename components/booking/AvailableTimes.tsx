import Link from "next/link";
import { useRouter } from "next/router";
import { useSlots } from "./useSlots";
import { ExclamationIcon } from "@heroicons/react/solid";
import React from "react";
import Loader from "@components/Loader";

const AvailableTimes = ({
  date,
  eventLength,
  eventTypeId,
  minimumBookingNotice,
  workingHours,
  timeFormat,
  user,
  organizerTimeZone,
}) => {
  const router = useRouter();
  const { rescheduleUid } = router.query;

  const { slots, isFullyBooked, hasErrors } = useSlots({
    date,
    eventLength,
    workingHours,
    organizerTimeZone,
    minimumBookingNotice,
  });

  return (
    <div className="mt-8 overflow-y-auto text-center sm:pl-4 sm:mt-0 sm:w-1/3 md:max-h-97">
      <div className="mb-4 text-lg font-light text-left text-gray-600">
        <span className="w-1/2 text-gray-600 dark:text-white">
          <strong>{date.format("dddd")}</strong>
          <span className="text-gray-500">{date.format(", DD MMMM")}</span>
        </span>
      </div>
      {slots.length > 0 &&
        slots.map((slot) => (
          <div key={slot.format()}>
            <Link
              href={
                `/${user.username}/book?date=${slot.utc().format()}&type=${eventTypeId}` +
                (rescheduleUid ? "&rescheduleUid=" + rescheduleUid : "")
              }>
              <a className="block py-4 mb-4 font-medium bg-white border rounded-sm dark:bg-gray-600 text-primary-500 dark:text-neutral-200 border-primary-500 dark:border-transparent hover:text-white hover:bg-primary-500 dark:hover:border-black dark:hover:bg-black">
                {slot.format(timeFormat)}
              </a>
            </Link>
          </div>
        ))}
      {isFullyBooked && (
        <div className="flex flex-col items-center content-center justify-center w-full h-full -mt-4">
          <h1 className="text-xl text-black dark:text-white">{user.name} is all booked today.</h1>
        </div>
      )}

      {!isFullyBooked && slots.length === 0 && !hasErrors && <Loader />}

      {hasErrors && (
        <div className="p-4 border-l-4 border-yellow-400 bg-yellow-50">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationIcon className="w-5 h-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Could not load the available time slots.{" "}
                <a
                  href={"mailto:" + user.email}
                  className="font-medium text-yellow-700 underline hover:text-yellow-600">
                  Contact {user.name} via e-mail
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailableTimes;
