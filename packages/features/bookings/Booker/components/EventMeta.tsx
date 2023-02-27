import { m } from "framer-motion";

import { EventDetails, EventMembers, EventMetaSkeleton, EventTitle } from "@calcom/features/bookings";
import { EventMetaBlock } from "@calcom/features/bookings/components/event-meta/Details";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import type { PublicEvent } from "@calcom/features/bookings/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { parseDate } from "@calcom/lib/parse-dates";
import { TimezoneSelect } from "@calcom/ui";
import { FiCalendar, FiChevronDown, FiGlobe } from "@calcom/ui/components/icon";

import { fadeInUp } from "../config";

type EventMetaProps = {
  event?: PublicEvent | null;
  isLoading?: boolean;
  selectedTime?: string | null;
};
export const EventMeta = ({ isLoading, event, selectedTime }: EventMetaProps) => {
  const { timezone, setTimezone } = useTimePreferences();
  const { i18n } = useLocale();

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
          <div className="space-y-5">
            <EventDetails event={event} />
            <EventMetaBlock contentClassName="relative" icon={FiGlobe}>
              <span className="dark:bg-darkgray-100 pointer-events-none absolute left-0 -top-1 z-10 flex h-full w-full items-center bg-white">
                {timezone} <FiChevronDown className="ml-2 inline-block" />
              </span>
              <TimezoneSelect
                menuPosition="fixed"
                className="[&_.cal-react-select\_\_control]:h-auto [&_.cal-react-select\_\_control]:min-h-0 [&_.cal-react-select\_\_control]:cursor-pointer [&_.cal-react-select\_\_control]:border-0 [&_.cal-react-select\_\_control]:ring-0 [&_.cal-react-select\_\_indicators]:hidden [&_.cal-react-select\_\_menu]:w-[300px] [&_.cal-react-select\_\_menu-portal]:z-30"
                value={timezone}
                onChange={(tz) => setTimezone(tz.value)}
              />
            </EventMetaBlock>
            {selectedTime && (
              <EventMetaBlock className="text-bookinghighlight dark:text-bookinghighlight" icon={FiCalendar}>
                {parseDate(selectedTime, i18n.language)}
              </EventMetaBlock>
            )}
          </div>
        </m.div>
      )}
    </div>
  );
};
