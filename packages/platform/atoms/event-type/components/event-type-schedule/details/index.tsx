import format from "event-type/lib/format";
import type { AvailabilityOption } from "event-type/types";
import type { FormValues } from "event-type/types";
import { memo } from "react";
import { useFormContext } from "react-hook-form";

import classNames from "@calcom/lib/classNames";
import { weekdayNames } from "@calcom/lib/weekday";
import { SkeletonText, Button } from "@calcom/ui";
import { Globe, ExternalLink } from "@calcom/ui/components/icon";

type EventTypeScheduleDetailsProps = {
  isManagedEventType: boolean;
  selectedScheduleValue: AvailabilityOption | undefined;
};

const EventTypeScheduleDetails = memo(
  ({ isManagedEventType, selectedScheduleValue }: EventTypeScheduleDetailsProps) => {
    const { watch } = useFormContext<FormValues>();
    const scheduleId = watch("schedule");

    // isLoading and schedule values will come from a custom hook using react query
    // we dont have those endpoints ready yet tho

    const filterDays = (dayNum: number) =>
      schedule?.schedule.filter((item) => item.days.includes((dayNum + 1) % 7)) || [];

    return (
      <div>
        <div className="border-subtle space-y-4 border-x p-6">
          <ol className="table border-collapse text-sm">
            {weekdayNames("en", 1, "long").map((day, index) => {
              const isAvailable = !!filterDays(index).length;

              return (
                <li key={day} className="my-6 flex border-transparent last:mb-2">
                  <span
                    className={classNames(
                      "w-20 font-medium sm:w-32 ",
                      !isAvailable ? "text-subtle line-through" : "text-default"
                    )}>
                    {day}
                  </span>
                  {isLoading ? (
                    <SkeletonText className="block h-5 w-60" />
                  ) : isAvailable ? (
                    <div className="space-y-3 text-right">
                      {filterDays(index).map((dayRange, i) => (
                        <div key={i} className="text-default flex items-center leading-4">
                          <span className="w-16 sm:w-28 sm:text-left">
                            {/* the below variable for time format comes from the /me endpoint */}
                            {format(dayRange.startTime, timeFormat === 12)}
                          </span>
                          <span className="ms-4">-</span>
                          <div className="ml-6 sm:w-28">{format(dayRange.endTime, timeFormat === 12)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-subtle ml-6 sm:ml-0">Unavailable</span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
        <div className="bg-muted border-subtle flex flex-col justify-center gap-2 rounded-b-md border p-6 sm:flex-row sm:justify-between">
          <span>
            <Globe className="h-3.5 w-3.5 ltr:mr-2 rtl:ml-2" />
            {schedule?.timeZone || <SkeletonText className="block h-5 w-32" />}
          </span>
          {!!schedule?.id && !schedule.isManaged && !schedule.readOnly && (
            <Button
              href={`/availability/${schedule.id}`}
              disabled={isLoading}
              color="minimal"
              EndIcon={ExternalLink}
              target="_blank"
              rel="noopener noreferrer">
              Edit availability
            </Button>
          )}
        </div>
      </div>
    );
  }
);

EventTypeScheduleDetails.displayName = "EventTypeScheduleDetails";

export default EventTypeScheduleDetails;
