import { m } from "framer-motion";
import dynamic from "next/dynamic";

import { EventDetails, EventMembers, EventMetaSkeleton, EventTitle } from "@calcom/features/bookings";
import { EventMetaBlock } from "@calcom/features/bookings/components/event-meta/Details";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Calendar, Globe } from "@calcom/ui/components/icon";

import { fadeInUp } from "../config";
import { useBookerStore } from "../store";
import { formatEventFromToTime } from "../utils/dates";
import { useEvent } from "../utils/event";

const TimezoneSelect = dynamic(() => import("@calcom/ui").then((mod) => mod.TimezoneSelect), {
  ssr: false,
});

export const EventMeta = () => {
  const { timezone, setTimezone, timeFormat } = useTimePreferences();
  const selectedDuration = useBookerStore((state) => state.selectedDuration);
  const selectedTimeslot = useBookerStore((state) => state.selectedTimeslot);
  const bookerState = useBookerStore((state) => state.state);
  const rescheduleBooking = useBookerStore((state) => state.rescheduleBooking);
  const { i18n, t } = useLocale();
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
            {rescheduleBooking && (
              <EventMetaBlock icon={Calendar}>
                {t("former_time")}
                <br />
                <span className="line-through" data-testid="former_time_p">
                  {formatEventFromToTime(
                    rescheduleBooking.startTime.toString(),
                    null,
                    timeFormat,
                    timezone,
                    i18n.language
                  )}
                </span>
              </EventMetaBlock>
            )}
            {selectedTimeslot && (
              <EventMetaBlock icon={Calendar}>
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
              className="cursor-pointer [&_.current-timezone:before]:focus-within:opacity-100 [&_.current-timezone:before]:hover:opacity-100 [&_>svg]:mt-[4px]"
              contentClassName="relative"
              icon={Globe}>
              {bookerState === "booking" ? (
                <>{timezone}</>
              ) : (
                <span className="current-timezone before:bg-subtle flex items-center justify-center before:absolute before:inset-0 before:left-[-30px] before:top-[-3px] before:bottom-[-3px] before:w-[calc(100%_+_35px)] before:rounded-md before:py-3 before:opacity-0 before:transition-opacity">
                  <TimezoneSelect
                    menuPosition="fixed"
                    classNames={{
                      control: () => "!min-h-0 p-0 border-0 bg-transparent focus-within:ring-0",
                      menu: () => "!w-64 max-w-[90vw]",
                      singleValue: () => "text-text py-1",
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
