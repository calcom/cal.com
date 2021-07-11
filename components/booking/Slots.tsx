import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import getSlots from "../../lib/slots";
import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import utc from "dayjs/plugin/utc";
dayjs.extend(isBetween);
dayjs.extend(utc);

type Props = {
  eventLength: number;
  minimumBookingNotice?: number;
  date: Dayjs;
  workingHours: [];
  organizerTimeZone: string;
};

const Slots = ({ eventLength, minimumBookingNotice, date, workingHours, organizerTimeZone }: Props) => {
  minimumBookingNotice = minimumBookingNotice || 0;

  const router = useRouter();
  const { user } = router.query;
  const [slots, setSlots] = useState([]);
  const [isFullyBooked, setIsFullyBooked] = useState(false);
  const [hasErrors, setHasErrors] = useState(false);

  useEffect(() => {
    setSlots([]);
    setIsFullyBooked(false);
    setHasErrors(false);
    fetch(
      `/api/availability/${user}?dateFrom=${date.startOf("day").utc().startOf("day").format()}&dateTo=${date
        .endOf("day")
        .utc()
        .endOf("day")
        .format()}`
    )
      .then((res) => res.json())
      .then(handleAvailableSlots)
      .catch((e) => {
        console.error(e);
        setHasErrors(true);
      });
  }, [date]);

  const handleAvailableSlots = (busyTimes: []) => {
    const times = getSlots({
      frequency: eventLength,
      inviteeDate: date,
      workingHours,
      minimumBookingNotice,
      organizerTimeZone,
    });

    const timesLengthBeforeConflicts: number = times.length;

    // Check for conflicts
    for (let i = times.length - 1; i >= 0; i -= 1) {
      busyTimes.every((busyTime): boolean => {
        const startTime = dayjs(busyTime.start).utc();
        const endTime = dayjs(busyTime.end).utc();
        // Check if start times are the same
        if (times[i].utc().isSame(startTime)) {
          times.splice(i, 1);
        }
        // Check if time is between start and end times
        else if (times[i].utc().isBetween(startTime, endTime)) {
          times.splice(i, 1);
        }
        // Check if slot end time is between start and end time
        else if (times[i].utc().add(eventLength, "minutes").isBetween(startTime, endTime)) {
          times.splice(i, 1);
        }
        // Check if startTime is between slot
        else if (startTime.isBetween(times[i].utc(), times[i].utc().add(eventLength, "minutes"))) {
          times.splice(i, 1);
        } else {
          return true;
        }
        return false;
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
    hasErrors,
  };
};

export default Slots;
