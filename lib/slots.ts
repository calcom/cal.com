const dayjs = require("dayjs");

const isToday = require("dayjs/plugin/isToday");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(isToday);
dayjs.extend(utc);
dayjs.extend(timezone);

const getMinutesFromMidnight = (date) => {
  return date.hour() * 60 + date.minute();
};

interface SlotAvailability {
  available: boolean,
  offset: number,
}

const isSlotAvailable = ({
  slotStartTime,
  slotEndTime,
  busyTimes
}): SlotAvailability => {
  let slotAvailability: SlotAvailability = {
    available: true,
    offset: 0,
  }

  for (let i = 0; i < busyTimes.length; i += 1) {
    const busyTimeStart = dayjs(busyTimes[i].start);
    const busyTimeEnd = dayjs(busyTimes[i].end);

    // Check if start times are the same
    if (slotStartTime.format('HH:mm') == busyTimeStart.format('HH:mm')) {
      slotAvailability.available = false;
      slotAvailability.offset = busyTimeEnd.diff(slotStartTime, 'minute');
    }

    // Check if time is between start and end times
    else if (slotStartTime.isBetween(busyTimeStart, busyTimeEnd)) {
      slotAvailability.available = false;
      slotAvailability.offset = busyTimeEnd.diff(slotStartTime, 'minute');
    }

    // Check if slot end time is between start and end time
    else if (slotEndTime.isBetween(busyTimeStart, busyTimeEnd)) {
      slotAvailability.available = false;
      slotAvailability.offset = busyTimeEnd.diff(slotStartTime, 'minute');
    }

    // Check if startTime is between slot 
    else if (busyTimeStart.isBetween(slotStartTime, slotEndTime)) {
      slotAvailability.available = false;
      slotAvailability.offset = busyTimeEnd.diff(slotStartTime, 'minute');
    }

    if (!slotAvailability.available) {
      if(slotAvailability.offset === 0) slotAvailability.offset = 5;
      return slotAvailability
    };
  }
  return slotAvailability;
}

const getSlots = ({
  calendarTimeZone,
  eventLength,
  selectedTimeZone,
  selectedDate,
  dayStartTime,
  dayEndTime,
  busyTimes,
}) => {

  if (!selectedDate) return []

  const lowerBound = selectedDate.tz(selectedTimeZone).startOf("day");

  // Simple case, same timezone
  if (calendarTimeZone === selectedTimeZone) {
    const slots = [];
    const now = dayjs();
    for (
      let minutes = dayStartTime;
      minutes <= dayEndTime - eventLength;
    ) {
      const slot = lowerBound.add(minutes, "minutes");

      if (slot > now) {
        const slotAvailablilty = isSlotAvailable({ slotStartTime: slot, slotEndTime: slot.add(eventLength, 'minutes'), busyTimes });
        if (slotAvailablilty.available) {
          slots.push(slot);
        } else {
          minutes += slotAvailablilty.offset;
          continue;
        }
      }
      minutes += parseInt(eventLength, 10);
    }
    return slots;
  }

  const upperBound = selectedDate.tz(selectedTimeZone).endOf("day");

  // We need to start generating slots from the start of the calendarTimeZone day
  const startDateTime = lowerBound
    .tz(calendarTimeZone)
    .startOf("day")
    .add(dayStartTime, "minutes");

  let phase = 0;
  if (startDateTime < lowerBound) {
    // Getting minutes of the first event in the day of the chooser
    const diff = lowerBound.diff(startDateTime, "minutes");

    // finding first event
    phase = diff + eventLength - (diff % eventLength);
  }

  // We can stop as soon as the selectedTimeZone day ends
  const endDateTime = upperBound
    .tz(calendarTimeZone)
    .subtract(eventLength, "minutes");

  const maxMinutes = endDateTime.diff(startDateTime, "minutes");

  const slots = [];
  const now = dayjs();
  for (
    let minutes = phase;
    minutes <= maxMinutes;
  ) {
    const slot = startDateTime.add(minutes, "minutes");

    const minutesFromMidnight = getMinutesFromMidnight(slot);

    if (
      minutesFromMidnight < dayStartTime ||
      minutesFromMidnight > dayEndTime - eventLength ||
      slot < now
    ) {
      minutes += parseInt(eventLength, 10);
      continue;
    }

    const slotAvailablilty = isSlotAvailable({ slotStartTime: slot, slotEndTime: slot.add(eventLength, 'minutes'), busyTimes });
    if (slotAvailablilty.available) {
      slots.push(slot.tz(selectedTimeZone));
      minutes += parseInt(eventLength, 10);
      continue;
    }
    minutes += slotAvailablilty.offset;
  }

  return slots;
};

export default getSlots
