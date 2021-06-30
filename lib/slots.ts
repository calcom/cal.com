import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

type WorkingHour = {
  days: number[];
  startTime: number;
  endTime: number;
};

type GetSlots = {
  inviteeDate: Dayjs;
  frequency: number;
  workingHours: WorkingHour[];
  minimumBookingNotice?: number;
  organizerTimeZone: string;
};

type Boundary = {
  lowerBound: number;
  upperBound: number;
};

const freqApply = (cb, value: number, frequency: number): number => cb(value / frequency) * frequency;

const intersectBoundary = (a: Boundary, b: Boundary) => {
  if (a.upperBound < b.lowerBound || a.lowerBound > b.upperBound) {
    return;
  }
  return {
    lowerBound: Math.max(b.lowerBound, a.lowerBound),
    upperBound: Math.min(b.upperBound, a.upperBound),
  };
};

// say invitee is -60,1380, and boundary is -120,240 - the overlap is -60,240
const getOverlaps = (inviteeBoundary: Boundary, boundaries: Boundary[]) =>
  boundaries.map((boundary) => intersectBoundary(inviteeBoundary, boundary)).filter(Boolean);

const organizerBoundaries = (
  workingHours: [],
  inviteeDate: Dayjs,
  inviteeBounds: Boundary,
  organizerTimeZone
): Boundary[] => {
  const boundaries: Boundary[] = [];

  const startDay: number = +inviteeDate
    .utc()
    .startOf("day")
    .add(inviteeBounds.lowerBound, "minutes")
    .format("d");
  const endDay: number = +inviteeDate
    .utc()
    .startOf("day")
    .add(inviteeBounds.upperBound, "minutes")
    .format("d");

  workingHours.forEach((item) => {
    const lowerBound: number = item.startTime - dayjs().tz(organizerTimeZone).utcOffset();
    const upperBound: number = item.endTime - dayjs().tz(organizerTimeZone).utcOffset();
    if (startDay !== endDay) {
      if (inviteeBounds.lowerBound < 0) {
        // lowerBound edges into the previous day
        if (item.days.includes(startDay)) {
          boundaries.push({ lowerBound: lowerBound - 1440, upperBound: upperBound - 1440 });
        }
        if (item.days.includes(endDay)) {
          boundaries.push({ lowerBound, upperBound });
        }
      } else {
        // upperBound edges into the next day
        if (item.days.includes(endDay)) {
          boundaries.push({ lowerBound: lowerBound + 1440, upperBound: upperBound + 1440 });
        }
        if (item.days.includes(startDay)) {
          boundaries.push({ lowerBound, upperBound });
        }
      }
    } else {
      boundaries.push({ lowerBound, upperBound });
    }
  });
  return boundaries;
};

const inviteeBoundary = (startTime: number, utcOffset: number, frequency: number): Boundary => {
  const upperBound: number = freqApply(Math.floor, 1440 - utcOffset, frequency);
  const lowerBound: number = freqApply(Math.ceil, startTime - utcOffset, frequency);
  return {
    lowerBound,
    upperBound,
  };
};

const getSlotsBetweenBoundary = (frequency: number, { lowerBound, upperBound }: Boundary) => {
  const slots: Dayjs[] = [];
  for (let minutes = 0; lowerBound + minutes <= upperBound - frequency; minutes += frequency) {
    slots.push(
      <Dayjs>dayjs
        .utc()
        .startOf("day")
        .add(lowerBound + minutes, "minutes")
    );
  }
  return slots;
};

const getSlots = ({
  inviteeDate,
  frequency,
  minimumBookingNotice,
  workingHours,
  organizerTimeZone,
}: GetSlots): Dayjs[] => {
  const startTime = dayjs.utc().isSame(dayjs(inviteeDate), "day")
    ? inviteeDate.hour() * 60 + inviteeDate.minute() + (minimumBookingNotice || 0)
    : 0;

  const inviteeBounds = inviteeBoundary(startTime, inviteeDate.utcOffset(), frequency);

  return getOverlaps(
    inviteeBounds,
    organizerBoundaries(workingHours, inviteeDate, inviteeBounds, organizerTimeZone)
  )
    .reduce((slots, boundary: Boundary) => [...slots, ...getSlotsBetweenBoundary(frequency, boundary)], [])
    .map((slot) =>
      slot.month(inviteeDate.month()).date(inviteeDate.date()).utcOffset(inviteeDate.utcOffset())
    );
};

export default getSlots;
