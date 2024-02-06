import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Fragment } from "react";

import { Badge } from "@calcom/ui";
import { Globe } from "@calcom/ui/components/icon";

import { AvailabilityDropdown } from "./components/availability-dropdown/index";
import { availabilityAsString } from "./lib/availabilityAsString";
import type { Schedule } from "./settings/AvailabilitySettings";

type AvailabilityProps = {
  id?: string;
  link?: string;
  userInfo: {
    defaultScheduleId: number;
    timeFormat: number;
    timeZone: string;
  };
  schedule: {
    name: string;
    id: number;
    timeZone: string;
    schedule: Schedule[] | [];
  };
  displayOptions: {
    hour12?: boolean;
    timeZone: string;
  };
  isLoading: boolean;
  isDeletable?: boolean;
  handleDelete: (id: number) => void;
  handleDuplicate: (id: number) => void;
};

const queryClient = new QueryClient();

export function Availability({
  link,
  userInfo,
  schedule,
  displayOptions,
  handleDelete,
  isLoading,
  handleDuplicate,
}: AvailabilityProps) {
  const subtitle = schedule.schedule
    .filter((availability) => !!availability.days.length)
    .map((availability) => (
      <Fragment key={availability.id}>
        {availabilityAsString(availability, { locale: "en", hour12: displayOptions.hour12 })}
        <br />
      </Fragment>
    ));

  return (
    <QueryClientProvider client={queryClient}>
      <a
        href={!!link ? link : "javascript:void(0);"}
        className={`${!!link ? "cursor-pointer" : "cursor-auto"}`}>
        <div className="hover:bg-muted border-subtle bg-default flex items-center justify-between overflow-hidden rounded-md border py-5 transition ltr:pl-4 rtl:pr-4 sm:ltr:pl-0 sm:rtl:pr-0">
          <div className="group flex w-full flex-grow flex-col items-start justify-between truncate text-sm sm:px-6">
            <div className="space-x-2 rtl:space-x-reverse">
              <span className="text-emphasis truncate font-medium">{schedule.name}</span>
              {schedule.id === userInfo.defaultScheduleId && (
                <Badge variant="success" className="text-xs">
                  Default
                </Badge>
              )}
            </div>
            <p className="text-subtle mt-1">
              {subtitle}
              {(schedule.timeZone || displayOptions?.timeZone) && (
                <p className="my-1 flex items-center first-letter:text-xs">
                  <Globe className="h-3.5 w-3.5" />
                  &nbsp;{schedule.timeZone ?? displayOptions?.timeZone}
                </p>
              )}
            </p>
          </div>
          <AvailabilityDropdown
            schedule={schedule}
            isLoading={isLoading}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
        </div>
      </a>
    </QueryClientProvider>
  );
}
