import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import getSlots from "../../lib/slots";
import dayjs, {Dayjs} from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);

type Props = {
  eventLength: number;
  minimumBookingNotice?: number;
  date: Dayjs;
}

const Slots = ({ eventLength, minimumBookingNotice, date, workingHours }: Props) => {

  minimumBookingNotice = minimumBookingNotice || 0;

  const router = useRouter();
  const { user } = router.query;
  const [slots, setSlots] = useState([]);
  const [isFullyBooked, setIsFullyBooked ] = useState(false);

  useEffect(() => {
    setSlots([]);
    setIsFullyBooked(false);
    fetch(
      `/api/availability/${user}?dateFrom=${date.startOf("day").utc().format()}&dateTo=${date
        .endOf("day")
        .utc()
        .format()}`
    )
      .then((res) => res.json())
      .then(handleAvailableSlots);
  }, [date]);

  const handleAvailableSlots = (busyTimes: []) => {

    const times = getSlots({
      frequency: eventLength,
      inviteeDate: date,
      workingHours,
      minimumBookingNotice,
    });

    const timesLengthBeforeConflicts: number = times.length;

    // Check for conflicts
    for (let i = times.length - 1; i >= 0; i -= 1) {
      busyTimes.forEach((busyTime) => {
        const startTime = dayjs(busyTime.start);
        const endTime = dayjs(busyTime.end);

        // Check if start times are the same
        if (dayjs(times[i]).format("HH:mm") == startTime.format("HH:mm")) {
          times.splice(i, 1);
        }

        // Check if time is between start and end times
        if (dayjs(times[i]).isBetween(startTime, endTime)) {
          times.splice(i, 1);
        }

        // Check if slot end time is between start and end time
        if (dayjs(times[i]).add(eventLength, "minutes").isBetween(startTime, endTime)) {
          times.splice(i, 1);
        }

        // Check if startTime is between slot
        if (startTime.isBetween(dayjs(times[i]), dayjs(times[i]).add(eventLength, "minutes"))) {
          times.splice(i, 1);
        }
      });
    }

    if (times.length === 0 && timesLengthBeforeConflicts !== 0) {
      setIsFullyBooked(true);
    }
    // Display available times
    setSlots(times);
  };

  return {
    slots,
    isFullyBooked,
  };
};

export default Slots;
