import dayjs, {Dayjs} from "dayjs";
import isBetween from 'dayjs/plugin/isBetween';
dayjs.extend(isBetween);
import {useEffect, useMemo, useState} from "react";
import getSlots from "../../lib/slots";
import Link from "next/link";
import {timeZone} from "../../lib/clock";
import {useRouter} from "next/router";

const AvailableTimes = (props) => {

  const router = useRouter();
  const { user, rescheduleUid } = router.query;
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState([]);

  let availableTimes = [];

  // Handle date change and timezone change
  useEffect(() => {
    setLoading(true);
    fetch(`/api/availability/${user}?dateFrom=${props.date.startOf('day').utc().format()}&dateTo=${props.date.endOf('day').utc().format()}`)
      .then( res => res.json())
      .then(setBusy);
  }, [props.date]);

  const times = useMemo(() =>
      getSlots({
        calendarTimeZone: props.user.timeZone,
        selectedTimeZone: timeZone(),
        eventLength: props.eventType.length,
        selectedDate: props.date,
        dayStartTime: props.user.startTime,
        dayEndTime: props.user.endTime,
      })
    , [])

  useEffect(() => {

    // Check for conflicts
    for (let i = times.length - 1; i >= 0; i -= 1) {
      busy.forEach(busyTime => {
        let startTime = dayjs(busyTime.start);
        let endTime = dayjs(busyTime.end);

        // Check if start times are the same
        if (dayjs(times[i]).format('HH:mm') == startTime.format('HH:mm')) {
          times.splice(i, 1);
        }

        // Check if time is between start and end times
        if (dayjs(times[i]).isBetween(startTime, endTime)) {
          times.splice(i, 1);
        }

        // Check if slot end time is between start and end time
        if (dayjs(times[i]).add(props.eventType.length, 'minutes').isBetween(startTime, endTime)) {
          times.splice(i, 1);
        }

        // Check if startTime is between slot
        if (startTime.isBetween(dayjs(times[i]), dayjs(times[i]).add(props.eventType.length, 'minutes'))) {
          times.splice(i, 1);
        }
      });
    }

    // Display available times
    availableTimes = times.map((time) =>
      <div key={dayjs(time).utc().format()}>
        <Link
          href={`/${props.user.username}/book?date=${dayjs(time).utc().format()}&type=${props.eventType.id}` + (rescheduleUid ? "&rescheduleUid=" + rescheduleUid : "")}>
          <a key={dayjs(time).format("hh:mma")}
             className="block font-medium mb-4 text-blue-600 border border-blue-600 rounded hover:text-white hover:bg-blue-600 py-4">{dayjs(time).tz(timeZone()).format(props.timeFormat)}</a>
        </Link>
      </div>
    );

    console.log(availableTimes);

    setLoading(false);

  }, [busy]);

  return (
    <div className="sm:pl-4 mt-8 sm:mt-0 text-center sm:w-1/3  md:max-h-97 overflow-y-auto">
      <div className="text-gray-600 font-light text-xl mb-4 text-left">
        <span className="w-1/2">
          {props.date.format("dddd DD MMMM YYYY")}
        </span>
      </div>
      {!loading ? availableTimes : <div className="loader"></div>}
    </div>
  );
}

export default AvailableTimes;