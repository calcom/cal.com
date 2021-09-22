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
const availableBoundaries = (props: {
  workingHours: WorkingHours[]; // organizer working hours in UTC
  date: Dayjs; // invitee date including UTC offset
}) => {
  const date = props.date.utc(true);

  const workingHours = props.workingHours
    .filter(
      (workingHour) => workingHour.days.includes(date.day()) || workingHour.days.includes(props.date.day())
    )
    .map((workingHour) => {
      // If the days do not match in UTC and local, we need to translate the start and endTime in order to get the
      // correct Dayjs instance.
      if (!workingHour.days.includes(date.day()) && workingHour.days.includes(props.date.day())) {
        return {
          days: workingHour.days,
          startTime: workingHour.startTime + (date.day < props.date.day() ? -1440 : 1440),
          endTime: workingHour.endTime + (date.day < props.date.day() ? -1440 : 1440),
        };
      }

      return workingHour;
    });

  return workingHours.reduce((acc, workingHour) => {
    const startTime = Math.max(props.date.hour() * 60 + props.date.minute(), workingHour.startTime);

    return acc.concat([
      [
        // TODO: This bit can be simplified further when the time type is used. (a bit)
        date.startOf("day").add(workingHour.startTime, "minute"),
        // 1440 means midnight next day, but is 0 in hour-minute, so if startTime > endTime, and endTime === 0 - handle
        date
          .startOf("day")
          .add(workingHour.endTime || (startTime > workingHour.endTime ? 1440 : 0), "minute"),
      ],
    ]);
  }, [] as Boundary[]);
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

type GetSlots = {
  frequency: number;
  date?: Dayjs;
  workingHours?: WorkingHours[];
  minimumBookingNotice?: number;
};

const getSlots = ({
  frequency,
  date,
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
    startTime = dayjs.utc().hour() * 60 + dayjs.utc().minute();
  }

  if (mustBePastDate.isAfter(date)) {
    startTime = mustBePastDate.hour() * 60 + mustBePastDate.minute();
  }

  startTime = freqApply(Math.ceil, startTime, frequency); // Fancy math.round(), basically.

  // get all the boundaries in the matched UTC dates
  const boundaries = availableBoundaries({
    workingHours: workingHours,
    // for some reason after .add() it forgets it is Dayjs - assuming a Typescript error in Dayjs.
    date: (date.startOf("day").utc().add(startTime, "minutes") as Dayjs).utcOffset(date.utcOffset()),
  });

  // the many boundary results are concatenated..
  const times = boundaries.reduce(
    (acc, bounds) => acc.concat(...getSlotsBetweenBoundary(frequency, bounds)),
    []
  );

  return times.map((time) => time.utcOffset(date.utcOffset())).filter((time) => time.date() === date.date());
};

export default getSlots;
