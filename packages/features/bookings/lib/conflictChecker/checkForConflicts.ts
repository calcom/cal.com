import dayjs from "@calcom/dayjs";
import type { CurrentSeats } from "@calcom/features/availability/lib/getUserAvailability";
import type { BufferedBusyTime } from "@calcom/types/BufferedBusyTime";
import type { Dayjs } from "dayjs";

type BufferedBusyTimes = BufferedBusyTime[];

// if true, there are conflicts.
export function checkForConflicts({
  busy,
  time,
  eventLength,
  currentSeats,
}: {
  busy: BufferedBusyTimes;
  time: Dayjs;
  eventLength: number;
  currentSeats?: CurrentSeats;
}) {
  // Early return
  if (!Array.isArray(busy) || busy.length < 1) {
    return false; // guaranteed no conflicts when there is no busy times.
  }
  // no conflicts if some seats are found for the current time slot
  if (currentSeats?.some((booking) => booking.startTime.toISOString() === time.toISOString())) {
    return false;
  }
  const slotStart = time.valueOf();
  const slotEnd = slotStart + eventLength * 60 * 1000;

  const sortedBusyTimes = busy
    .map((busyTime) => ({
      start: dayjs.utc(busyTime.start).valueOf(),
      end: dayjs.utc(busyTime.end).valueOf(),
    }))
    .sort((a, b) => a.start - b.start);

  for (const busyTime of sortedBusyTimes) {
    if (busyTime.start >= slotEnd) {
      break;
    }
    if (busyTime.end <= slotStart) {
      continue;
    }
    return true;
  }

  return false;
}
