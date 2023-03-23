import * as Popover from "@radix-ui/react-popover";

import {
  formatTime,
  isNextDayInTimezone,
  isPreviousDayInTimezone,
  sortByTimezone,
} from "@calcom/lib/date-fns";
import { FiGlobe } from "@calcom/ui/components/icon";

import { Attendee } from ".prisma/client";

interface MeetingTimeInTimezonesProps {
  attendees: Attendee[];
  userTimezone?: string;
  timeFormat?: number | null;
  startTime: string;
  endTime: string;
}

const MeetingTimeInTimezones = ({
  attendees,
  userTimezone,
  timeFormat,
  startTime,
  endTime,
}: MeetingTimeInTimezonesProps) => {
  if (!userTimezone || !attendees.length) return null;

  const attendeeTimezones = attendees.map((attendee) => attendee.timeZone);
  const uniqueTimezones = [userTimezone, ...attendeeTimezones].filter(
    (value, index, self) => self.indexOf(value) === index
  );

  // Convert times to time in timezone, and then sort from earliest to latest time in timezone.
  const times = uniqueTimezones
    .map((timezone) => {
      const isPreviousDay = isPreviousDayInTimezone(startTime, userTimezone, timezone);
      const isNextDay = isNextDayInTimezone(startTime, userTimezone, timezone);
      return {
        startTime: formatTime(startTime, timeFormat, timezone),
        endTime: formatTime(endTime, timeFormat, timezone),
        timezone,
        isPreviousDay,
        isNextDay,
      };
    })
    .sort((timeA, timeB) => sortByTimezone(timeA.timezone, timeB.timezone));

  // We don't show the popover if there's only one timezone.
  if (times.length === 1) return null;

  return (
    <Popover.Root>
      <Popover.Trigger
        onClick={preventBubbling}
        className="popover-button invisible ml-2 inline-flex h-5 w-5 items-center justify-center rounded-sm text-gray-900 transition-colors hover:bg-gray-200 focus:bg-gray-200 group-hover:visible">
        <FiGlobe />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          onClick={preventBubbling}
          side="top"
          className="popover-content slideInBottom border-5 bg-brand-500 rounded-md border-gray-200 p-3 text-sm text-white shadow-sm">
          {times.map((time) => (
            <span className="mt-2 block first:mt-0" key={time.timezone}>
              <span className="inline-flex align-baseline">
                {time.startTime} - {time.endTime}
                {(time.isNextDay || time.isPreviousDay) && (
                  <span className="text-medium ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 text-[10px]">
                    {time.isNextDay ? "+1" : "-1"}
                  </span>
                )}
              </span>
              <br />
              <span className="text-gray-400">{time.timezone}</span>
            </span>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

MeetingTimeInTimezones.displayName = "MeetingTimeInTimezones";

// Prevents propagation so the click on eg booking overview won't
// bubble to the row of the table, causing a navigation to the
// detaill page.
const preventBubbling = (event: React.MouseEvent) => {
  event.stopPropagation();
};

export default MeetingTimeInTimezones;
