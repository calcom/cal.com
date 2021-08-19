import Link from "next/link";
import { useRouter } from "next/router";
import Slots from "./Slots";
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

  const { slots, isFullyBooked, hasErrors } = Slots({
    date,
    eventLength,
    workingHours,
    organizerTimeZone,
    minimumBookingNotice,
  });

  return (
    <div className="mt-8 text-center overflow-y-auto sm:mt-0 sm:pl-4 sm:w-1/3 md:max-h-97">
      <div className="mb-4 text-left text-gray-600 text-lg font-light">
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
              <a className="dark:hover:border-black dark:hover:bg-black block mb-4 py-4 dark:text-neutral-200 text-primary-500 hover:text-white font-medium dark:bg-gray-600 hover:bg-primary-500 bg-white border border-primary-500 dark:border-transparent rounded-sm">
                {slot.format(timeFormat)}
              </a>
            </Link>
          </div>
        ))}
      {isFullyBooked && (
        <div className="flex flex-col content-center items-center justify-center -mt-4 w-full h-full">
          <h1 className="text-black dark:text-white text-xl">{user.name} is all booked today.</h1>
        </div>
      )}

      {!isFullyBooked && slots.length === 0 && !hasErrors && <Loader />}

      {hasErrors && (
        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationIcon className="w-5 h-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-yellow-700 text-sm">
                Could not load the available time slots.{" "}
                <a
                  href={"mailto:" + user.email}
                  className="hover:text-yellow-600 text-yellow-700 underline font-medium">
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
