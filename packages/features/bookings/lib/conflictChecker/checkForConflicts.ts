import dayjs from "@calcom/dayjs";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { BufferedBusyTime } from "@calcom/types/BufferedBusyTime";

type BufferedBusyTimes = BufferedBusyTime[];
const log = logger.getSubLogger({ prefix: ["[api] book:user"] });

// if true, there are conflicts.
export function checkForConflicts(busyTimes: BufferedBusyTimes, time: dayjs.ConfigType, length: number) {
  // Early return
  if (!Array.isArray(busyTimes) || busyTimes.length < 1) {
    return false; // guaranteed no conflicts when there is no busy times.
  }

  for (const busyTime of busyTimes) {
    const startTime = dayjs(busyTime.start);
    const endTime = dayjs(busyTime.end);
    // Check if time is between start and end times
    if (dayjs(time).isBetween(startTime, endTime, null, "[)")) {
      log.error(
        `NAUF: start between a busy time slot ${safeStringify({
          ...busyTime,
          time: dayjs(time).format(),
        })}`
      );
      return true;
    }
    // Check if slot end time is between start and end time
    if (dayjs(time).add(length, "minutes").isBetween(startTime, endTime)) {
      log.error(
        `NAUF: Ends between a busy time slot ${safeStringify({
          ...busyTime,
          time: dayjs(time).add(length, "minutes").format(),
        })}`
      );
      return true;
    }
    // Check if startTime is between slot
    if (startTime.isBetween(dayjs(time), dayjs(time).add(length, "minutes"))) {
      return true;
    }
  }
  return false;
}
