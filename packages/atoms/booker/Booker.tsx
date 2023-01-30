import { BookerProps } from "booker/types";
import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { EventTitle, EventMetaSkeleton, EventDetails, EventMembers } from "@calcom/features/bookings";
import { classNames } from "@calcom/lib";
import { trpc } from "@calcom/trpc/react";
import { DatePicker } from "@calcom/ui";

import { useGetBrowsingMonthStart } from "./utils/dates";

export const Booker = ({ username, eventSlug, month }: BookerProps) => {
  const browsingMonthStart = useGetBrowsingMonthStart(month, "Europe/Amsterdam");
  const schedule = trpc.viewer.public.slots.getSchedule.useQuery({
    usernameList: [username],
    eventTypeSlug: eventSlug,
    startTime: browsingMonthStart.toISOString(),
    endTime: dayjs(browsingMonthStart).endOf("month").toISOString(),
  });
  const event = trpc.viewer.public.event.useQuery({ username, eventSlug });

  const nonEmptyScheduleDays = useMemo(() => {
    if (!schedule.data?.slots) return [];
    return Object.keys(schedule.data.slots).filter((k) => schedule.data.slots[k].length > 0);
  }, [schedule.data]);

  return (
    <div className="flex items-center justify-center">
      <div className="dark:bg-darkgray-100 dark:border-darkgray-300 flex flex-row rounded-md border border-gray-200 bg-white">
        <div className="dark:border-darkgray-300 w-[280px] border-r border-gray-200 p-6">
          <div
            className={classNames(
              "absolute transition-opacity duration-300",
              event.isFetching ? "opacity-100" : "opacity-0"
            )}>
            <EventMetaSkeleton />
          </div>
          {!event.isFetching && !!event.data && (
            <div className="animate-fade-in-up opacity-0 [--animation-delay:300ms]">
              <>
                <EventMembers meetingType={event.data.meetingType} users={event.data.users} />
                <EventTitle>{event.data?.title}</EventTitle>
                <EventDetails className="mt-10" event={event.data} />
              </>
            </div>
          )}
        </div>

        <div className="w-[425px] p-6">
          <DatePicker
            onChange={(date) => console.log("date change", date)}
            includedDates={nonEmptyScheduleDays}
            // @TODO: Dynamic locale
            locale="en"
            browsingDate={browsingMonthStart}
          />
        </div>
      </div>
    </div>
  );
};
