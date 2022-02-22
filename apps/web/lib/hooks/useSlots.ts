import { SchedulingType } from "@prisma/client";
import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import utc from "dayjs/plugin/utc";
import { stringify } from "querystring";
import { useEffect, useState } from "react";

import getSlots from "@lib/slots";
import { TimeRange, WorkingHours } from "@lib/types/schedule";

dayjs.extend(isBetween);
dayjs.extend(utc);

type AvailabilityUserResponse = {
  busy: TimeRange[];
  timeZone: string;
  workingHours: WorkingHours[];
};

type Slot = {
  time: Dayjs;
  users?: string[];
};

type UseSlotsProps = {
  slotInterval: number | null;
  eventLength: number;
  eventTypeId: number;
  minimumBookingNotice?: number;
  date: Dayjs;
  users: { username: string | null }[];
  schedulingType: SchedulingType | null;
};

export const useSlots = (props: UseSlotsProps) => {
  const { slotInterval, eventLength, minimumBookingNotice = 0, date, users, eventTypeId } = props;
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setSlots([]);
    setLoading(true);
    setError(null);

    const dateFrom = date.startOf("day").format();
    const dateTo = date.endOf("day").format();
    const query = stringify({ dateFrom, dateTo, eventTypeId });

    Promise.all<Slot[]>(
      users.map((user) => fetch(`/api/availability/${user.username}?${query}`).then(handleAvailableSlots))
    )
      .then((results) => {
        let loadedSlots: Slot[] = results[0] || [];
        if (results.length === 1) {
          loadedSlots = loadedSlots?.sort((a, b) => (a.time.isAfter(b.time) ? 1 : -1));
          setSlots(loadedSlots);
          setLoading(false);
          return;
        }

        let poolingMethod;
        switch (props.schedulingType) {
          // intersect by time, does not take into account eventLength (yet)
          case SchedulingType.COLLECTIVE:
            poolingMethod = (slots: Slot[], compareWith: Slot[]) =>
              slots.filter((slot) => compareWith.some((compare) => compare.time.isSame(slot.time)));
            break;
          case SchedulingType.ROUND_ROBIN:
            // TODO: Create a Reservation (lock this slot for X minutes)
            //       this will make the following code redundant
            poolingMethod = (slots: Slot[], compareWith: Slot[]) => {
              compareWith.forEach((compare) => {
                const match = slots.findIndex((slot) => slot.time.isSame(compare.time));
                if (match !== -1) {
                  slots[match].users?.push(compare.users![0]);
                } else {
                  slots.push(compare);
                }
              });
              return slots;
            };
            break;
        }

        if (!poolingMethod) {
          throw Error(`No poolingMethod found for schedulingType: "${props.schedulingType}""`);
        }

        for (let i = 1; i < results.length; i++) {
          loadedSlots = poolingMethod(loadedSlots, results[i]);
        }
        loadedSlots = loadedSlots.sort((a, b) => (a.time.isAfter(b.time) ? 1 : -1));
        setSlots(loadedSlots);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setError(e);
      });
  }, [date]);

  const handleAvailableSlots = async (res: Response) => {
    const responseBody: AvailabilityUserResponse = await res.json();
    const times = getSlots({
      frequency: slotInterval || eventLength,
      inviteeDate: date,
      workingHours: responseBody.workingHours,
      minimumBookingNotice,
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
