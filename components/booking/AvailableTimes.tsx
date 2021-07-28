import Link from "next/link";
import { useRouter } from "next/router";
import Slots from "./Slots";
import { ExclamationIcon } from "@heroicons/react/solid";

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
    <div className="sm:pl-4 mt-8 sm:mt-0 text-center sm:w-1/3  md:max-h-97 overflow-y-auto">
      <div className="text-gray-600 font-light text-xl mb-4 text-left">
        <span className="w-1/2 dark:text-white text-gray-600">{date.format("dddd DD MMMM YYYY")}</span>
      </div>
      {slots.length > 0 &&
        slots.map((slot) => (
          <div key={slot.format()}>
            <Link
              href={
                `/${user.username}/book?date=${slot.utc().format()}&type=${eventTypeId}` +
                (rescheduleUid ? "&rescheduleUid=" + rescheduleUid : "")
              }>
              <a className="block font-medium mb-4 text-blue-600 border border-blue-600 rounded hover:text-white hover:bg-blue-600 py-4">
                {slot.format(timeFormat)}
              </a>
            </Link>
          </div>
        ))}
      {isFullyBooked && (
        <div className="w-full h-full flex flex-col justify-center content-center items-center -mt-4">
          <h1 className="text-xl text-black dark:text-white">{user.name} is all booked today.</h1>
        </div>
      )}

      {!isFullyBooked && slots.length === 0 && !hasErrors && <div className="loader" />}

      {hasErrors && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Could not load the available time slots.{" "}
                <a
                  href={"mailto:" + user.email}
                  className="font-medium underline text-yellow-700 hover:text-yellow-600">
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
