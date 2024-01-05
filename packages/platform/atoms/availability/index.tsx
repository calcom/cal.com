import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Fragment } from "react";

import { availabilityAsString } from "@calcom/lib/availability";
import type { Schedule as ScheduleType, TimeRange } from "@calcom/types/schedule";
import {
  Badge,
  Button,
  Dropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownItem,
  DropdownMenuTrigger,
  showToast,
} from "@calcom/ui";
import { Globe, MoreHorizontal, Star, Copy, Trash } from "@calcom/ui/components/icon";

import { useApiKey } from "../cal-provider";
import { useClientSchedule } from "./hooks/useClientSchedule.ts";
import { useDeleteSchedule } from "./hooks/useDeleteSchedule";
import { useProfileInfo } from "./hooks/useProfileInfo";

export type AvailabilityFormValues = {
  name: string;
  schedule: ScheduleType;
  dateOverrides: { ranges: TimeRange[] }[];
  timeZone: string;
  isDefault: boolean;
};

type AvailabilityProps = {
  id?: string;
  isDeletable?: boolean;
};

const queryClient = new QueryClient();

export function Availability({ id, isDeletable = true }: AvailabilityProps) {
  const { key, error } = useApiKey();
  // if user doesnt provide a scheduleId we use the default schedule id
  // since we know there will always be one default schedule so schedule cant be empty
  const { isLoading, data: schedule } = useClientSchedule(id ? id : "1", key);
  const user = useProfileInfo(key);

  const { mutateAsync } = useDeleteSchedule({
    onSuccess: () => {
      showToast("Scheduled deleted successfully", "success");
    },
  });

  const handleDelete = async (id: string | undefined) => {
    await mutateAsync({ id: id ? id : "1", key });
  };

  const displayOptions = {
    hour12: user.data?.timeFormat ? user.data.timeFormat === 12 : undefined,
    timeZone: user.data?.timeZone,
  };

  if (error === "no_key") return <>You havent entered a key</>;

  if (error === "invalid_key") return <>This is not a valid key, please enter a valid key</>;

  if (isLoading) return <>Loading...</>;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="hover:bg-muted flex items-center justify-between py-5 transition ltr:pl-4 sm:ltr:pl-0 rtl:pr-4 sm:rtl:pr-0">
        <div className="group flex w-full items-center justify-between sm:px-6">
          <div className="space-x-2 rtl:space-x-reverse">
            <span className="text-emphasis truncate font-medium">{schedule.name}</span>
            {schedule.isDefault && (
              <Badge variant="success" className="text-xs">
                Default
              </Badge>
            )}
          </div>
          <p className="text-subtle mt-1">
            {schedule.availability
              .filter((availability: any) => !!availability.days.length)
              .map((availability: any) => (
                <Fragment key={availability.id}>
                  {availabilityAsString(availability, {
                    hour12: displayOptions?.hour12,
                  })}
                  <br />
                </Fragment>
              ))}
            {(schedule.timeZone || displayOptions?.timeZone) && (
              <p className="my-1 flex items-center first-letter:text-xs">
                <Globe className="h-3.5 w-3.5" />
                &nbsp;{schedule.timeZone ?? displayOptions?.timeZone}
              </p>
            )}
          </p>
        </div>
        <Dropdown>
          <DropdownMenuTrigger asChild>
            <Button
              data-testid="schedule-more"
              className="mx-5"
              type="button"
              variant="icon"
              color="secondary"
              StartIcon={MoreHorizontal}
            />
          </DropdownMenuTrigger>
          {!isLoading && schedule && (
            <DropdownMenuContent>
              <DropdownMenuItem className="focus:ring-muted min-w-40">
                {!schedule.isDefault && (
                  <DropdownItem
                    type="button"
                    StartIcon={Star}
                    onClick={() => {
                      // set to default function goes here
                    }}>
                    Set as default
                  </DropdownItem>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem className="outline-none">
                <DropdownItem
                  type="button"
                  data-testid={`schedule-duplicate${schedule.id}`}
                  StartIcon={Copy}
                  onClick={() => {
                    // duplication function goes here
                  }}>
                  Duplicate
                </DropdownItem>
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:ring-muted min-w-40">
                <DropdownItem
                  type="button"
                  color="destructive"
                  StartIcon={Trash}
                  data-testid="delete-schedule"
                  onClick={() => {
                    if (!isDeletable) {
                      showToast("You are required to have at least one schedule", "error");
                    } else {
                      // deletion function goes here
                      handleDelete(id);
                    }
                  }}>
                  Delete
                </DropdownItem>
              </DropdownMenuItem>
            </DropdownMenuContent>
          )}
        </Dropdown>
      </div>
    </QueryClientProvider>
  );
}
