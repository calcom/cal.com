import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import getSlots from "../../lib/slots";

const Slots = (props) => {
  const router = useRouter();
  const { user } = router.query;
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    setSlots([]);
    fetch(
      `/api/availability/${user}?dateFrom=${props.date.startOf("day").utc().format()}&dateTo=${props.date
        .endOf("day")
        .utc()
        .format()}`
    )
      .then((res) => res.json())
      .then(handleAvailableSlots);
  }, [props.date]);

  const handleAvailableSlots = (busyTimes: []) => {
    const times = getSlots({
      frequency: props.eventLength,
      inviteeDate: props.date,
      workingHours: props.workingHours,
      minimumBookingNotice: 0,
    });

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
        if (dayjs(times[i]).add(props.eventType.length, "minutes").isBetween(startTime, endTime)) {
          times.splice(i, 1);
        }

        // Check if startTime is between slot
        if (startTime.isBetween(dayjs(times[i]), dayjs(times[i]).add(props.eventType.length, "minutes"))) {
          times.splice(i, 1);
        }
      });
    }
    // Display available times
    setSlots(times);
  };

  return {
    slots,
  };
};

export default Slots;
