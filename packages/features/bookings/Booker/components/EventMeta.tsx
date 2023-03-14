import { m } from "framer-motion";

import { EventDetails, EventMembers, EventMetaSkeleton, EventTitle } from "@calcom/features/bookings";
import { EventMetaBlock } from "@calcom/features/bookings/components/event-meta/Details";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TimezoneSelect } from "@calcom/ui";
import { FiCalendar, FiChevronDown, FiGlobe } from "@calcom/ui/components/icon";

import { fadeInUp } from "../config";
import { useBookerStore } from "../store";
import { formatEventFromToTime } from "../utils/dates";
import { useEvent } from "../utils/event";

export const EventMeta = () => {
  const { timezone, setTimezone, timeFormat } = useTimePreferences();
  const selectedDuration = useBookerStore((state) => state.selectedDuration);
  const selectedTimeslot = useBookerStore((state) => state.selectedTimeslot);
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
                {formatEventFromToTime(selectedTimeslot, selectedDuration, timeFormat, i18n.language)}
              </EventMetaBlock>
            )}
            <EventDetails event={event} />
            <EventMetaBlock
              className="[&_.current-timezone:before]:focus-within:opacity-100 [&_.current-timezone:before]:hover:opacity-100"
              contentClassName="relative"
              icon={FiGlobe}>
              <span className="current-timezone flex items-center justify-center before:absolute before:inset-0 before:left-[-30px] before:top-[-5px] before:bottom-[-5px] before:h-[calc(100%_+_10px)] before:w-[calc(100%_+_30px)] before:rounded-md before:bg-gray-100 before:py-3 before:opacity-0 before:transition-opacity dark:before:bg-gray-100">
                <TimezoneSelect
                  menuPosition="fixed"
                  className="relative isolate z-40 h-auto [&_.cal-react-select\_\_control]:h-[20px] [&_.cal-react-select\_\_control]:!min-h-0 [&_.cal-react-select\_\_control]:cursor-pointer [&_.cal-react-select\_\_control]:border-0 [&_.cal-react-select\_\_control]:bg-transparent [&_.cal-react-select\_\_control]:ring-0 [&_.cal-react-select\_\_indicators]:hidden [&_.cal-react-select\_\_menu]:w-[300px] [&_.cal-react-select\_\_value-container]:p-0"
                  value={timezone}
                  onChange={(tz) => setTimezone(tz.value)}
                />
                <FiChevronDown className="min-h-4 min-w-4 relative z-10 mx-2 mt-1 inline-block" />
              </span>
            </EventMetaBlock>
          </div>
        </m.div>
      )}
    </div>
  );
};
