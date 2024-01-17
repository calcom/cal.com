import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Fragment } from "react";

import { Badge, showToast } from "@calcom/ui";
import { Globe } from "@calcom/ui/components/icon";

import { useApiKey } from "../hooks/useApiKeys";
import { AvailabilityDropdown } from "./components/availability-dropdown/index";
import useClientSchedule from "./hooks/useClientSchedule";
import useDeleteSchedule from "./hooks/useDeleteSchedule";
import { useProfileInfo } from "./hooks/useProfileInfo";
import { availabilityAsString } from "./lib/availabilityAsString";

type AvailabilityProps = {
  id?: string;
  isDeletable?: boolean;
};

const queryClient = new QueryClient();

export function Availability({ id, isDeletable = true }: AvailabilityProps) {
  const { key, error } = useApiKey();
  const { isLoading, data: schedule } = useClientSchedule(key, id);
  const user = useProfileInfo(key);
  const displayOptions = {
    hour12: user.data?.timeFormat ? user.data.timeFormat === 12 : undefined,
    timeZone: user.data?.timeZone,
  };

  const { mutateAsync } = useDeleteSchedule({
    onSuccess: () => {
      showToast("Scheduled deleted successfully", "success");
    },
  });

  const handleDelete = async (id: string | undefined) => {
    if (!isDeletable || schedule.id === user.defaultScheduleId) {
      showToast("You are required to have at least one schedule", "error");
    } else if (isDeletable && schedule.id !== user.defaultScheduleId) {
      await mutateAsync({ id, key });
    }
  };

  const handleDuplicate = async () => {
    // duplication function goes here
  };

  if (error === "no_key") return <>You havent entered a key</>;

  if (error === "invalid_key") return <>This is not a valid key, please enter a valid key</>;

  if (isLoading) return <>Loading...</>;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="hover:bg-muted flex items-center justify-between py-5 transition ltr:pl-4 rtl:pr-4 sm:ltr:pl-0 sm:rtl:pr-0">
        <div className="group flex w-full items-center justify-between sm:px-6">
          <div className="space-x-2 rtl:space-x-reverse">
            <span className="text-emphasis truncate font-medium">{schedule.name}</span>
            {schedule.id === user.defaultScheduleId && (
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
                    locale: "en",
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
        <AvailabilityDropdown
          schedule={schedule}
          isLoading={isLoading}
          onDelete={() => {
            handleDelete(schedule.id);
          }}
          onDuplicate={handleDuplicate}
        />
      </div>
    </QueryClientProvider>
  );
}
