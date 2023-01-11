import dayjs, { Dayjs } from "@calcom/dayjs";
import { WorkingHours, TimeRange as DateOverride } from "@calcom/types/schedule";

import { getWorkingHours } from "./availability";

export type GetSlots = {
  inviteeDate: Dayjs;
  frequency: number;
  workingHours: WorkingHours[];
  dateOverrides?: DateOverride[];
  minimumBookingNotice: number;
  eventLength: number;
};
export type TimeFrame = { userIds?: number[]; startTime: number; endTime: number };

const minimumOfOne = (input: number) => (input < 1 ? 1 : input);

function buildSlots({
  startOfInviteeDay,
  computedLocalAvailability,
  frequency,
  eventLength,
  startDate,
}: {
  computedLocalAvailability: TimeFrame[];
  startOfInviteeDay: Dayjs;
  startDate: Dayjs;
  frequency: number;
  eventLength: number;
}) {
  // no slots today
  if (startOfInviteeDay.isBefore(startDate, "day")) {
    return [];
  }
  // keep the old safeguards in; may be needed.
  frequency = minimumOfOne(frequency);
  eventLength = minimumOfOne(eventLength);
  // A day starts at 00:00 unless the startDate is the same as the current day
  const dayStart = startOfInviteeDay.isSame(startDate, "day")
    ? Math.ceil((startDate.hour() * 60 + startDate.minute()) / frequency) * frequency
    : 0;

  // Record type so we can use slotStart as key
  const slotsTimeFrameAvailable: Record<
    string,
    {
      userIds: number[];
      startTime: number;
      endTime: number;
    }
  > = {};
  // get boundaries sorted by start time.
  const boundaries = computedLocalAvailability
    .map((item) => [item.startTime < dayStart ? dayStart : item.startTime, item.endTime])
    .sort((a, b) => a[0] - b[0]);

  const ranges: number[][] = [];
  let currentRange: number[] = [];
  for (const [start, end] of boundaries) {
    // bypass invalid value
    if (start >= end) continue;
    // fill first elem
    if (!currentRange.length) {
      currentRange = [start, end];
      continue;
    }
    if (currentRange[1] < start) {
      ranges.push(currentRange);
      currentRange = [start, end];
    } else if (currentRange[1] < end) {
      currentRange[1] = end;
    }
  }
  if (currentRange) {
    ranges.push(currentRange);
  }

  for (const [boundaryStart, boundaryEnd] of ranges) {
    // loop through the day, based on frequency.
    for (let slotStart = boundaryStart; slotStart < boundaryEnd; slotStart += frequency) {
      computedLocalAvailability.forEach((item) => {
        // TODO: This logic does not allow for past-midnight bookings.
        if (slotStart < item.startTime || slotStart > item.endTime + 15 - eventLength) {
          return;
        }
        slotsTimeFrameAvailable[slotStart.toString()] = {
          userIds: (slotsTimeFrameAvailable[slotStart]?.userIds || []).concat(item.userIds || []),
          startTime: slotStart,
          endTime: slotStart + eventLength,
        };
      });
    }
  }
  // XXX: Hack alert, as dayjs is supposedly not aware of timezone the current slot may have invalid UTC offset.
  const timeZone =
    (startOfInviteeDay as unknown as { $x: { $timezone: string } })["$x"]["$timezone"] || "UTC";

  const slots: { time: Dayjs; userIds?: number[] }[] = [];
  for (const item of Object.values(slotsTimeFrameAvailable)) {
    /*
     * @calcom/web:dev: 2022-11-06T00:00:00-04:00
     * @calcom/web:dev: 2022-11-06T01:00:00-04:00
     * @calcom/web:dev: 2022-11-06T01:00:00-04:00 <-- note there is no offset change, but we did lose an hour.
     * @calcom/web:dev: 2022-11-06T02:00:00-04:00
     * @calcom/web:dev: 2022-11-06T03:00:00-04:00
     * ...
     */
    const slot = {
      userIds: item.userIds,
      time: dayjs.tz(startOfInviteeDay.add(item.startTime, "minute").format("YYYY-MM-DDTHH:mm:ss"), timeZone),
    };
    // If the startOfInviteeDay has a different UTC offset than the slot, a DST change has occurred.
    // As the time has now fallen backwards, or forwards; this difference -
    // needs to be manually added as this is not done for us. Usually 0.
    slot.time = slot.time.add(startOfInviteeDay.utcOffset() - slot.time.utcOffset(), "minutes");
    slots.push(slot);
  }
  return slots;
}

const getSlots = ({
  inviteeDate,
  frequency,
  minimumBookingNotice,
  workingHours,
  dateOverrides = [],
  eventLength,
}: GetSlots) => {
  // current date in invitee tz
  const startDate = dayjs().add(minimumBookingNotice, "minute");
  // This code is ran client side, startOf() does some conversions based on the
  // local tz of the client. Sometimes this shifts the day incorrectly.
  const startOfDayUTC = dayjs.utc().set("hour", 0).set("minute", 0).set("second", 0);
  const startOfInviteeDay = inviteeDate.startOf("day");
  // checks if the start date is in the past

  /**
   *  TODO: change "day" for "hour" to stop displaying 1 day before today
   * This is displaying a day as available as sometimes difference between two dates is < 24 hrs.
   * But when doing timezones an available day for an owner can be 2 days available in other users tz.
   *
   * */
  if (inviteeDate.isBefore(startDate, "day")) {
    return [];
  }

  // Dayjs does not expose the timeZone value publicly through .get("timeZone")
  // instead, we as devs are required to somewhat hack our way to get the ...
  // tz value as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timeZone: string = (inviteeDate as any)["$x"]["$timezone"];

  const workingHoursUTC = workingHours.map((schedule) => ({
    userId: schedule.userId,
    days: schedule.days,
    startTime: /* Why? */ startOfDayUTC.add(schedule.startTime, "minute"),
    endTime: /* Why? */ startOfDayUTC.add(schedule.endTime, "minute"),
  }));

  const localWorkingHours = getWorkingHours(
    {
      // initialize current day with timeZone without conversion, just parse.
      utcOffset: -dayjs.tz(dayjs(), timeZone).utcOffset(),
    },
    workingHoursUTC
  ).filter((hours) => hours.days.includes(inviteeDate.day()));

  // Here we split working hour in chunks for every frequency available that can fit in whole working hours
  const computedLocalAvailability: TimeFrame[] = [];
  let tempComputeTimeFrame: TimeFrame | undefined;
  const computeLength = localWorkingHours.length - 1;
  const makeTimeFrame = (item: typeof localWorkingHours[0]): TimeFrame => ({
    userIds: item.userId ? [item.userId] : [],
    startTime: item.startTime,
    endTime: item.endTime,
  });

  localWorkingHours.forEach((item, index) => {
    if (!tempComputeTimeFrame) {
      tempComputeTimeFrame = makeTimeFrame(item);
    } else {
      // please check the comment in splitAvailableTime func for the added 1 minute
      if (tempComputeTimeFrame.endTime + 1 === item.startTime) {
        // to deal with time that across the day, e.g. from 11:59 to to 12:01
        tempComputeTimeFrame.endTime = item.endTime;
      } else {
        computedLocalAvailability.push(tempComputeTimeFrame);
        tempComputeTimeFrame = makeTimeFrame(item);
      }
    }
    if (index == computeLength) {
      computedLocalAvailability.push(tempComputeTimeFrame);
    }
  });
  // an override precedes all the local working hour availability logic.
  const activeOverrides = dateOverrides.filter((override) => {
    return dayjs.utc(override.start).isBetween(startOfInviteeDay, startOfInviteeDay.endOf("day"), null, "[)");
  });

  if (!!activeOverrides.length) {
    const overrides = activeOverrides.flatMap((override) => ({
      userIds: override.userId ? [override.userId] : [],
      startTime: override.start.getUTCHours() * 60 + override.start.getUTCMinutes(),
      endTime: override.end.getUTCHours() * 60 + override.end.getUTCMinutes(),
    }));
    overrides.forEach((override) => {
      const index = computedLocalAvailability.findIndex(
        (a) => !a.userIds?.length || (override.userIds[0] && a.userIds?.includes(override.userIds[0]))
      );
      if (index >= 0) {
        computedLocalAvailability[index] = override;
      }
    });
  }

  return buildSlots({
    computedLocalAvailability,
    startOfInviteeDay,
    startDate,
    frequency,
    eventLength,
  });
};

export default getSlots;
