import { m } from "framer-motion";

import { EventDetails, EventMembers, EventMetaSkeleton, EventTitle } from "@calcom/features/bookings";
import { EventMetaBlock } from "@calcom/features/bookings/components/event-meta/Details";
import { PublicEvent } from "@calcom/features/bookings/components/types";
import { TimezoneSelect } from "@calcom/ui";
import { FiChevronDown, FiGlobe } from "@calcom/ui/components/icon";

import { fadeInUp } from "../config";
import { useTimePrerences } from "../utils/time";

type EventMetaProps = {
  event?: PublicEvent | null;
  isLoading?: boolean;
};
export const EventMeta = ({ isLoading, event }: EventMetaProps) => {
  const { timezone, setTimezone } = useTimePrerences();

  return (
    <div className="relative z-10 p-6">
      {isLoading && (
        <m.div {...fadeInUp} initial="visible" layout>
          <EventMetaSkeleton />
        </m.div>
      )}
      {!isLoading && !!event && (
        <m.div {...fadeInUp} layout transition={{ ...fadeInUp.transition, delay: 0.3 }}>
          {/* @TODO: Fix meeting type */}
          <EventMembers meetingType={null} users={event.users} />
          <EventTitle className="mt-2 mb-8">{event?.title}</EventTitle>
          <div className="space-y-5">
            <EventDetails event={event} />
            <EventMetaBlock contentClassName="relative" icon={FiGlobe}>
              <span className="dark:bg-darkgray-100 pointer-events-none absolute left-0 -top-1 z-10 flex h-full w-full items-center bg-white">
                {timezone} <FiChevronDown className="ml-2 inline-block" />
              </span>
              {/* @TODO: When old booking page is gone, hopefully we can improve the select component itself :)  */}
              <TimezoneSelect
                className="[&_.cal-react-select\_\_control]:h-auto [&_.cal-react-select\_\_control]:min-h-0 [&_.cal-react-select\_\_control]:border-0 [&_.cal-react-select\_\_control]:ring-0 [&_.cal-react-select\_\_indicators]:hidden [&_.cal-react-select\_\_menu]:w-[300px]"
                value={timezone}
                onChange={(tz) => setTimezone(tz.value)}
              />
            </EventMetaBlock>
          </div>
        </m.div>
      )}
    </div>
  );
};
