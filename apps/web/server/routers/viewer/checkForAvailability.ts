const checkForAvailability = ({
  time,
  busy,
  eventLength,
  beforeBufferTime,
  afterBufferTime,
  currentSeats,
}) => {
  time = dayjs(time);
  if (currentSeats?.some((booking) => booking.startTime.toISOString() === time.toISOString())) {
    return true;
  }

  const slotEndTime = time.add(eventLength, "minutes").utc();
  const slotStartTimeWithBeforeBuffer = time.subtract(beforeBufferTime, "minutes").utc();
  const slotEndTimeWithAfterBuffer = time.add(eventLength + afterBufferTime, "minutes").utc();
  // logger.silly(`Checking Availability for time- ${time.format()}`);
  return busy.every((busyTime) => {
    const startTime = dayjs.utc(busyTime.start);
    const endTime = dayjs.utc(busyTime.end);
    // logger.silly(`Verifying what slots lie in busyTimeRange ${startTime} to ${endTime}`);
    // Check if start times are the same
    if (time.utc().isBetween(startTime, endTime, null, "[)")) {
      return false;
    }

    // Check if slot end time is between start and end time
    else if (slotEndTime.isBetween(startTime, endTime)) {
      return false;
    }

    // Check if startTime is between slot
    else if (startTime.isBetween(time, slotEndTime)) {
      return false;
    }

    // Check if timeslot has before buffer time space free
    else if (
      slotStartTimeWithBeforeBuffer.isBetween(
        startTime.subtract(beforeBufferTime, "minutes"),
        endTime.add(afterBufferTime, "minutes")
      )
    ) {
      return false;
    }

    // Check if timeslot has after buffer time space free
    else if (
      slotEndTimeWithAfterBuffer.isBetween(
        startTime.subtract(beforeBufferTime, "minutes"),
        endTime.add(afterBufferTime, "minutes")
      )
    ) {
      return false;
    }

    return true;
  });
};

export const checkForAvailabilityCode = `const {expose} = require("threads/worker");
          const dayjs = require("dayjs");
          const isBetween = require("dayjs/plugin/isBetween");
          const utc = require("dayjs/plugin/utc");
          // const add = require("dayjs/plugin/add");
          // const subtract = require("dayjs/plugin/subtract");
          dayjs.extend(isBetween);
          dayjs.extend(utc);
          // dayjs.extend(add);
          // dayjs.extend(subtract);

          expose(${checkForAvailability.toString()})`;

console.log(checkForAvailabilityCode);
