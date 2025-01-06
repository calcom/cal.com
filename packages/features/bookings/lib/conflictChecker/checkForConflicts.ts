import type { Dayjs } from "dayjs";

import type { CurrentSeats } from "@calcom/core/getUserAvailability";
import dayjs from "@calcom/dayjs";
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
  const slotStartDate = time.utc().toDate();
  const slotEndDate = time.add(eventLength, "minutes").utc().toDate();
  // handle busy times.
  return busy.some((busyTime) => {
    const busyStartDate = dayjs.utc(busyTime.start).toDate();
    const busyEndDate = dayjs.utc(busyTime.end).toDate();
    // First check if there's any overlap at all
    // If busy period ends before slot starts or starts after slot ends, there's no overlap
    if (busyEndDate <= slotStartDate || busyStartDate >= slotEndDate) {
      return false;
    }
    // Now check all possible overlap scenarios:
    // 1. Slot start falls within busy period (inclusive start, exclusive end)
    if (slotStartDate >= busyStartDate && slotStartDate < busyEndDate) {
      return true;
    }
    // 2. Slot end falls within busy period (exclusive start, inclusive end)
    if (slotEndDate > busyStartDate && slotEndDate <= busyEndDate) {
      return true;
    }
    // 3. Busy period completely contained within slot
    if (busyStartDate >= slotStartDate && busyEndDate <= slotEndDate) {
      return true;
    }
    // 4. Slot completely contained within busy period
    if (busyStartDate <= slotStartDate && busyEndDate >= slotEndDate) {
      return true;
    }
    return false;
  });
}
