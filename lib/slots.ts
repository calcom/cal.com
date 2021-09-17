import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isBetween from "dayjs/plugin/isBetween";
import { DEFAULT_WORKING_HOURS, WorkingHours } from "@lib/availability";

dayjs.extend(isBetween);
dayjs.extend(utc);
dayjs.extend(timezone);

type Boundary = [Dayjs, Dayjs];

const freqApply = (cb, value: number, frequency: number): number =>
  value !== 0 ? cb(value / frequency) * frequency : 0;

/*
 * Boundaries simply returns the start and end times for a given day according to the working hours of the user.
 */
const availableBoundaries = (args: {
  workingHours: WorkingHours[]; // organizer working hours in UTC
  date: Dayjs;
  startTime: number;
  utcDays: number[];
}) => {
  const { workingHours, date, utcDays, startTime } = args;
  const boundaries: Boundary[] = [];

  workingHours.forEach((workingHour) => {
    utcDays.forEach((day) => {
      if (workingHour.days.includes(day)) {
        let dayjsObj = date.utc();
        if (day !== utcDays[0]) {
          dayjsObj =
            day > utcDays[0] || (utcDays[0] === 6 && day === 0)
              ? dayjsObj.add(1, "day")
              : dayjsObj.subtract(1, "day");
        }
        // following if prevents the dates to turn in on themselves.
        if (startTime < workingHour.endTime) {
          boundaries.push([
            dayjsObj.startOf("day").add(Math.max(workingHour.startTime, startTime), "minutes"),
            dayjsObj.startOf("day").add(workingHour.endTime, "minutes"),
          ] as Boundary);
        }
      }
    });
  });

  return boundaries;
};

/*
 * Determines the slots by taking the frequency as a stepper and checking if it is contained within the boundary
 * (TODO: Frequency should not be the eventLength for much longer)
 */
const getSlotsBetweenBoundary = (frequency: number, boundary: Boundary) => {
  const slots: Dayjs[] = [];
  for (
    let minutes = 0;
    dayjs(boundary[0].add(minutes, "minutes")).isBetween(boundary[0], boundary[1], null, "[)");
    minutes += frequency
  ) {
    slots.push(boundary[0].add(minutes, "minutes"));
  }
  return slots;
};

/*
 * Organizer Availability is stored in UTC - but that means that if an invitee has a different tz than GMT
 * we need to involve the other relevant day - as there are now two days involved in the organizer schedule.
 */
function getUTCDaysForDate(date: Dayjs) {
  const applicableDays: number[] = [date.utc().day()];
  if (date.utcOffset() < 0) {
    applicableDays.push(date.utc().day() - 1 < 0 ? 6 : date.utc().day() - 1);
  } else if (date.utcOffset() > 0) {
    applicableDays.push(date.utc().day() + 1 > 6 ? 0 : date.utc().day() + 1);
  }
  return applicableDays;
}

type GetSlots = {
  frequency: number;
  date?: Dayjs;
  workingHours?: WorkingHours[];
  minimumBookingNotice?: number;
};

const getSlots = ({
  frequency,
  date = dayjs(),
  minimumBookingNotice = 0,
  workingHours = [DEFAULT_WORKING_HOURS],
}: GetSlots): Dayjs[] => {
  // we need to get the invitee lower bounds, taking minimum booking notice
  const mustBePastDate = dayjs.utc().add(minimumBookingNotice, "minutes");

  // no slots, startDate is after today, this happens when booking notice spans multiple days.
  if (mustBePastDate.isAfter(date.endOf("day"))) {
    return [];
  }

  /*
   * The following uses either the current day offset (how much time since midnight) or the mustBePastDate that
   * comes from the minimum booking notice.
   */
  let startTime = 0;
  if (dayjs().isSame(date, "day")) {
    startTime = date.hour() * 60 + date.minute();
  }

  if (mustBePastDate.isAfter(date)) {
    startTime = mustBePastDate.hour() * 60 + mustBePastDate.minute();
  }

  startTime = freqApply(Math.ceil, startTime - date.utcOffset(), frequency); // Fancy math.round(), basically.

  // get all the boundaries in the matched UTC dates
  const boundaries = availableBoundaries({
    workingHours: workingHours,
    date: date,
    startTime,
    utcDays: getUTCDaysForDate(date),
  });

  // the many boundary results are concatenated..
  const times = boundaries.reduce(
    (acc, bounds) => acc.concat(...getSlotsBetweenBoundary(frequency, bounds)),
    []
  );

  return times
    .map((time) => time.utcOffset(date.utcOffset()))
    .filter(
      (time) =>
        time.date() === date.date() &&
        (!date.isSame(time, "day") || time.hour() * 60 + time.minute() >= startTime)
    );
};

export default getSlots;
