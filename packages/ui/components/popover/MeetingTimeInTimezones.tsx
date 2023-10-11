import * as Popover from "@radix-ui/react-popover";

import {
  formatTime,
  isNextDayInTimezone,
  isPreviousDayInTimezone,
  sortByTimezone,
  isSupportedTimeZone,
} from "@calcom/lib/date-fns";

import { Globe } from "../icon";

type Attendee = {
  id: number;
  email: string;
  name: string;
  timeZone: string;
  locale: string | null;
  bookingId: number | null;
};

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

  // If attendeeTimezone is unsupported, we fallback to host timezone. Unsupported Attendee timezone can be used due to bad API booking request in the past | backward-compatibility
  const attendeeTimezones = attendees.map((attendee) => {
    return isSupportedTimeZone(attendee.timeZone) ? attendee.timeZone : userTimezone;
  });
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
        className="popover-button text-emphasis hover:bg-emphasis focus:bg-emphasis invisible ml-2 inline-flex h-5 w-5 items-center justify-center rounded-sm transition-colors group-hover:visible">
        <Globe className="h-3.5 w-3.5" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          onClick={preventBubbling}
          side="top"
          className="popover-content slideInBottom border-5 bg-inverted text-inverted border-subtle rounded-md p-3 text-sm shadow-sm">
          {times.map((time) => (
            <span className="mt-2 block first:mt-0" key={time.timezone}>
              <span className="inline-flex align-baseline">
                {time.startTime} - {time.endTime}
                {(time.isNextDay || time.isPreviousDay) && (
                  <span className="text-medium bg-muted text-emphasis ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]">
                    {time.isNextDay ? "+1" : "-1"}
                  </span>
                )}
              </span>
              <br />
              <span className="text-muted">{time.timezone}</span>
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
  event.nativeEvent.preventDefault();
};

export default MeetingTimeInTimezones;
