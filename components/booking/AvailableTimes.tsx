import Link from "next/link";
import { useRouter } from "next/router";
import Slots from "./Slots";

const AvailableTimes = ({ date, eventLength, eventTypeId, workingHours, timeFormat }) => {
  const router = useRouter();
  const { user, rescheduleUid } = router.query;
  const { slots, isFullyBooked } = Slots({ date, eventLength, workingHours });
  return (
    <div className="sm:pl-4 mt-8 sm:mt-0 text-center sm:w-1/3  md:max-h-97 overflow-y-auto">
      <div className="text-gray-600 font-light text-xl mb-4 text-left">
        <span className="w-1/2">{date.format("dddd DD MMMM YYYY")}</span>
      </div>
      {slots.length > 0 ? (
        slots.map((slot) => (
          <div key={slot.format()}>
            <Link
              href={
                `/${user}/book?date=${slot.utc().format()}&type=${eventTypeId}` +
                (rescheduleUid ? "&rescheduleUid=" + rescheduleUid : "")
              }>
              <a className="block font-medium mb-4 text-blue-600 border border-blue-600 rounded hover:text-white hover:bg-blue-600 py-4">
                {slot.format(timeFormat)}
              </a>
            </Link>
          </div>
        ))
      ) : isFullyBooked ?
          <div className="w-full h-full flex flex-col justify-center content-center items-center -mt-4">
            <h1 className="text-xl font">{user} is all booked today.</h1>
          </div>
          : <div className="loader" />
      }
    </div>
  );
};

export default AvailableTimes;
