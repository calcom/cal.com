import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Timezone } from "availability/components/timezone";
import { LargeScreenCTA } from "availability/cta/large-screen";
import { SmallScreenCTA } from "availability/cta/small-screen";
import { DateOverride } from "availability/date-overrides";
import useClientSchedule from "availability/hooks/useClientSchedule";
import useDeleteSchedule from "availability/hooks/useDeleteSchedule";
import { useProfileInfo } from "availability/hooks/useProfileInfo";
import { Troubleshooter } from "availability/troubleshooter";
import type { AvailabilityFormValues } from "availability/types";
import { useApiKey } from "cal-provider";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";

import Schedule from "@calcom/features/schedules/components/Schedule";
import Shell from "@calcom/features/shell/Shell";
import { availabilityAsString } from "@calcom/lib/availability";
import { SkeletonText, VerticalDivider, Button, Form, showToast } from "@calcom/ui";
import { MoreVertical } from "@calcom/ui/components/icon";
import EditableHeading from "@calcom/web/components/ui/EditableHeading";

type AvailabilitySettingsProps = {
  id?: string;
};

const queryClient = new QueryClient();

export function AvailabilitySettings({ id }: AvailabilitySettingsProps) {
  const { key, error } = useApiKey();
  // if user doesnt provide a scheduleId we use the default schedule id
  // since we know there will always be one default schedule so schedule cant be empty
  const { isLoading, data: schedule } = useClientSchedule(id, key);
  const user = useProfileInfo(key);

  const { timeFormat } = user.data || { timeFormat: null };
  const [openSidebar, setOpenSidebar] = useState(false);

  const { mutateAsync } = useDeleteSchedule({
    onSuccess: () => {
      showToast("Scheduled deleted successfully", "success");
    },
  });

  const handleDelete = async (id: string) => {
    await mutateAsync({ id: id ? id : "1", key });
  };

  const form = useForm<AvailabilityFormValues>({
    values: schedule && {
      ...schedule,
      schedule: schedule?.availability || [],
    },
  });

  if (error === "no_key") return <>You havent entered a key</>;

  if (error === "invalid_key") return <>This is not a valid key, please enter a valid key</>;

  if (isLoading) return <>Loading...</>;

  return (
    <QueryClientProvider client={queryClient}>
      <Shell
        title={schedule?.name ? `${schedule.name} | Availability` : "Availability"}
        heading={
          <Controller
            control={form.control}
            name="name"
            render={({ field }) => (
              <EditableHeading isReady={!isLoading} {...field} data-testid="availablity-title" />
            )}
          />
        }
        subtitle={
          schedule ? (
            schedule.schedule
              .filter((availability: any) => !!availability.days.length)
              .map((availability: any) => (
                <span key={availability.id}>
                  {availabilityAsString(availability, { hour12: timeFormat === 12 })}
                  <br />
                </span>
              ))
          ) : (
            <SkeletonText className="h-4 w-48" />
          )
        }
        CTA={
          <div className="flex items-center justify-end">
            <LargeScreenCTA
              isSwitchDisabled={isLoading || schedule?.isDefault}
              isSwitchChecked={form.watch("isDefault")}
              onSwitchCheckedChange={(e) => {
                form.setValue("isDefault", e);
              }}
              onDeleteConfirmation={() => {
                id && handleDelete(id);
              }}
            />
            <VerticalDivider className="hidden sm:inline" />
            <SmallScreenCTA
              isSidebarOpen={openSidebar}
              toggleSidebar={() => setOpenSidebar(false)}
              onDeleteConfirmation={() => {
                id && handleDelete(id);
              }}
            />
            <div className="border-default border-l-2" />
            <Button className="ml-4 lg:ml-0" type="submit" form="availability-form">
              Save
            </Button>
            <Button
              className="ml-3 sm:hidden"
              StartIcon={MoreVertical}
              variant="icon"
              color="secondary"
              onClick={() => setOpenSidebar(true)}
            />
          </div>
        }>
        <div className="mt-4 w-full md:mt-0">
          <Form form={form} id="availability-form" className="flex flex-col sm:mx-0 xl:flex-row xl:space-x-6">
            <div className="flex-1 flex-row xl:mr-0">
              <div className="border-subtle mb-6 rounded-md border">
                <div>
                  {typeof user.data?.weekStart === "string" && (
                    <Schedule
                      control={form.control}
                      name="schedule"
                      weekStart={
                        [
                          "Sunday",
                          "Monday",
                          "Tuesday",
                          "Wednesday",
                          "Thursday",
                          "Friday",
                          "Saturday",
                        ].indexOf(user.data?.weekStart) as 0 | 1 | 2 | 3 | 4 | 5 | 6
                      }
                    />
                  )}
                </div>
              </div>
              <div className="border-subtle my-6 rounded-md border">
                {schedule?.workingHours && <DateOverride workingHours={schedule.workingHours} />}
              </div>
            </div>
            <div className="min-w-40 col-span-3 hidden space-y-2 md:block lg:col-span-1">
              <div className="xl:max-w-80 w-full pr-4 sm:ml-0 sm:mr-36 sm:p-0">
                <Timezone />
                <hr className="border-subtle my-6 mr-8" />
                <Troubleshooter isDisplayBlock={false} />
              </div>
            </div>
          </Form>
        </div>
      </Shell>
    </QueryClientProvider>
  );
}
