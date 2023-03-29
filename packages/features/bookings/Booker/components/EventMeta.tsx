import { m } from "framer-motion";

import { EventDetails, EventMembers, EventMetaSkeleton, EventTitle } from "@calcom/features/bookings";
import { EventMetaBlock } from "@calcom/features/bookings/components/event-meta/Details";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TimezoneSelect } from "@calcom/ui";
import { FiCalendar, FiGlobe } from "@calcom/ui/components/icon";

import { fadeInUp } from "../config";
import { useBookerStore } from "../store";
import { formatEventFromToTime } from "../utils/dates";
import { useEvent } from "../utils/event";

export const EventMeta = () => {
  const { timezone, setTimezone, timeFormat } = useTimePreferences();
  const selectedDuration = useBookerStore((state) => state.selectedDuration);
  const selectedTimeslot = useBookerStore((state) => state.selectedTimeslot);
  const bookerState = useBookerStore((state) => state.state);
  const { i18n } = useLocale();
  const { data: event, isLoading } = useEvent();

  return (
    <div className="relative z-10 p-6">
      {isLoading && (
        <m.div {...fadeInUp} initial="visible" layout>
          <EventMetaSkeleton />
        </m.div>
      )}
      {!isLoading && !!event && (
        <m.div {...fadeInUp} layout transition={{ ...fadeInUp.transition, delay: 0.3 }}>
          <EventMembers schedulingType={event.schedulingType} users={event.users} profile={event.profile} />
          <EventTitle className="mt-2 mb-8">{event?.title}</EventTitle>
          <div className="space-y-4">
            {selectedTimeslot && (
              <EventMetaBlock icon={FiCalendar}>
                {formatEventFromToTime(
                  selectedTimeslot,
                  selectedDuration,
                  timeFormat,
                  timezone,
                  i18n.language
                )}
              </EventMetaBlock>
            )}
            <EventDetails event={event} />
            <EventMetaBlock
              className="cursor-pointer [&_.current-timezone:before]:focus-within:opacity-100 [&_.current-timezone:before]:hover:opacity-100"
              contentClassName="relative"
              icon={FiGlobe}>
              {bookerState === "booking" ? (
                <>{timezone}</>
              ) : (
                <span className="current-timezone dark:before:bg-darkgray-200 flex items-center justify-center before:absolute before:inset-0 before:left-[-30px] before:top-[-5px] before:bottom-[-5px] before:h-[calc(100%_+_10px)] before:w-[calc(100%_+_35px)] before:rounded-md before:bg-gray-100 before:py-3 before:opacity-0 before:transition-opacity">
                  <TimezoneSelect
                    menuPosition="fixed"
                    classNames={{
                      control: () => "!min-h-0 p-0 border-0 bg-transparent focus-within:ring-0",
                      singleValue: () => "dark:text-darkgray-600",
                      menu: () => "!w-64 max-w-[90vw] left-[-30px] mt-3",
                    }}
                    value={timezone}
                    onChange={(tz) => setTimezone(tz.value)}
                  />
                </span>
              )}
            </EventMetaBlock>
          </div>
        </m.div>
      )}
    </div>
  );
};
