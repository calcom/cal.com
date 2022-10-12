import * as Popover from "@radix-ui/react-popover";

import { formatTimeInTimezone } from "@calcom/lib/date-fns";

import { Icon } from "../../Icon";
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

  // Convert times to time in timezone, and then sort from earliest to latest time.
  const times = uniqueTimezones
    .map((timezone) => {
      return {
        startTime: formatTimeInTimezone(startTime, timezone, timeFormat),
        endTime: formatTimeInTimezone(endTime, timezone, timeFormat),
        timezone,
      };
    })
    .sort((timeA, timeB) => {
      return timeA.startTime.localeCompare(timeB.startTime);
    });

  // We don't show the popover if there's only one timezone.
  if (times.length === 1) return null;

  return (
    <Popover.Root>
      <Popover.Trigger className="popover-button ml-2 inline-flex h-5 w-5 items-center justify-center rounded-sm text-gray-900 transition-colors hover:bg-gray-200 focus:bg-gray-200">
        <Icon.FiGlobe />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          className="slideInBottom shadow-dropdown border-5 rounded-md border-gray-200 bg-black p-3 text-sm text-white shadow-sm">
          {times.map((time) => (
            <span className="mt-2 block first:mt-0" key={time.timezone}>
              {time.startTime} - {time.endTime}
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

export default MeetingTimeInTimezones;
