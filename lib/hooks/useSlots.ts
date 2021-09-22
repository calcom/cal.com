import { useState, useEffect } from "react";
import getSlots from "@lib/slots";
import { User, SchedulingType } from "@prisma/client";
import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import utc from "dayjs/plugin/utc";
dayjs.extend(isBetween);
dayjs.extend(utc);

type Slot = {
  time: Dayjs;
  users?: string[];
};

type UseSlotsProps = {
  eventLength: number;
  minimumBookingNotice?: number;
  date: Dayjs;
  workingHours: [];
  users: User[];
  schedulingType: SchedulingType;
};

export const useSlots = (props: UseSlotsProps) => {
  const { eventLength, minimumBookingNotice = 0, date, users } = props;
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setSlots([]);
    setLoading(true);
    setError(null);

    const dateFrom = encodeURIComponent(date.startOf("day").format());
    const dateTo = encodeURIComponent(date.endOf("day").format());

    Promise.all(
      users.map((user: User) =>
        fetch(`/api/availability/${user.username}?dateFrom=${dateFrom}&dateTo=${dateTo}`)
          .then(handleAvailableSlots)
          .catch((e) => {
            console.error(e);
            setError(e);
          })
      )
    ).then((results) => {
      let loadedSlots: Slot[] = results[0];
      if (results.length === 1) {
        setSlots(loadedSlots);
        setLoading(false);
        return;
      }

      let poolingMethod;
      switch (props.schedulingType) {
        // intersect by time, does not take into account eventLength (yet)
        case SchedulingType.COLLECTIVE:
          poolingMethod = (slots, compareWith) =>
            slots.filter((slot) => compareWith.some((compare) => compare.time.isSame(slot.time)));
          break;
        case SchedulingType.ROUND_ROBIN:
          // TODO: Create a Reservation (lock this slot for X minutes)
          //       this will make the following code redundant
          poolingMethod = (slots, compareWith) => {
            compareWith.forEach((compare) => {
              const match = slots.findIndex((slot) => slot.time.isSame(compare.time));
              if (match !== -1) {
                slots[match].users.push(compare.users[0]);
              } else {
                slots.push(compare);
              }
            });
            return slots;
          };
          break;
      }

      for (let i = 1; i < results.length; i++) {
        loadedSlots = poolingMethod(loadedSlots, results[i]);
      }
      setSlots(loadedSlots);
      setLoading(false);
    });
  }, [date]);

  const handleAvailableSlots = async (res) => {
    const responseBody = await res.json();

    responseBody.workingHours.days = responseBody.workingHours.daysOfWeek;

    const times = getSlots({
      frequency: eventLength,
      inviteeDate: date,
      workingHours: [responseBody.workingHours],
      minimumBookingNotice,
      organizerTimeZone: responseBody.workingHours.timeZone,
    });

    // Check for conflicts
    for (let i = times.length - 1; i >= 0; i -= 1) {
      responseBody.busy.every((busyTime): boolean => {
        const startTime = dayjs(busyTime.start);
        const endTime = dayjs(busyTime.end);
        // Check if start times are the same
        if (times[i].isBetween(startTime, endTime, null, "[)")) {
          times.splice(i, 1);
        }
        // Check if slot end time is between start and end time
        else if (times[i].add(eventLength, "minutes").isBetween(startTime, endTime)) {
          times.splice(i, 1);
        }
        // Check if startTime is between slot
        else if (startTime.isBetween(times[i], times[i].add(eventLength, "minutes"))) {
          times.splice(i, 1);
        } else {
          return true;
        }
        return false;
      });
    }

    // temporary
    const user = res.url.substring(res.url.lastIndexOf("/") + 1, res.url.indexOf("?"));
    return times.map((time) => ({
      time,
      users: [user],
    }));
  };

  return {
    slots,
    loading,
    error,
  };
};

export default useSlots;
