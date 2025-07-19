import type { DateFnsDate } from "@calcom/lib/dateFns";
import { utc } from "@calcom/lib/dateFns";
import type { CurrentSeats } from "@calcom/lib/getUserAvailability";
import type { BufferedBusyTime } from "@calcom/types/BufferedBusyTime";

type BufferedBusyTimes = BufferedBusyTime[];

// if true, there are conflicts.
export function checkForConflicts({
  busy,
  time,
  eventLength,
  currentSeats,
}: {
  busy: BufferedBusyTimes;
  time: DateFnsDate;
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
      start: utc(busyTime.start).valueOf(),
      end: utc(busyTime.end).valueOf(),
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
