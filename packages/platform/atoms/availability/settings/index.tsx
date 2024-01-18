import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FieldValues, Control, UseFormReturn, SubmitHandler } from "react-hook-form";
import { useForm, Controller } from "react-hook-form";

import Schedule from "@calcom/features/schedules/components/Schedule";
import Shell from "@calcom/features/shell/Shell";
import type { WorkingHours } from "@calcom/types/schedule";
import type { TimeRange } from "@calcom/types/schedule";
import { VerticalDivider, Button, Form, SkeletonText } from "@calcom/ui";
import { MoreVertical } from "@calcom/ui/components/icon";
import EditableHeading from "@calcom/web/components/ui/EditableHeading";

import { SmallScreenCTA } from "..//components/cta/small-screen/index";
import { LargeScreenCTA } from "../components/cta/large-screen/index";
import { DateOverride } from "../components/date-overrides/index";
import { Timezone } from "../components/timezone/index";
import { Troubleshooter } from "../components/troubleshooter/index";
import { availabilityAsString } from "../lib/availabilityAsString";
import type { AvailabilityFormValues } from "../types";

type AvailabilitySettingsProps = {
  id?: string;
  schedule: {
    name: string;
    id: number;
    availability: TimeRange[][];
    isLastSchedule: boolean;
    isDefault: boolean;
    workingHours: WorkingHours[];
    dateOverrides: { ranges: TimeRange[] }[];
    timeZone: string;
  };
  handleDelete: (id: string) => void;
  isDeleting: boolean;
  isLoading: boolean;
  timeFormat: number;
  weekStart?: number;
  handleSubmit: (data: SubmitHandler<AvailabilityFormValues>) => Promise<void>;
};

const queryClient = new QueryClient();

export function AvailabilitySettings({
  id,
  schedule,
  handleDelete,
  isDeleting,
  isLoading,
  timeFormat,
  weekStart,
  handleSubmit,
}: AvailabilitySettingsProps) {
  const [openSidebar, setOpenSidebar] = useState(false);

  const form = useForm<AvailabilityFormValues>({
    values: schedule && {
      ...schedule,
      schedule: schedule?.availability || [],
    },
  });

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
        SidebarContainer={<></>}
        // TODO: resolve subtitle logic which is causing some errors at the moment
        subtitle={
          schedule ? (
            schedule.availability
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
              // isSwitchDisabled={isLoading || schedule?.isDefault}
              // isSwitchChecked={form.watch("isDefault")}
              // onSwitchCheckedChange={(e) => {
              //   form.setValue("isDefault", e);
              // }}
              isButtonDisabled={schedule?.isLastSchedule}
              isConfirmationDialogLoading={isDeleting}
              onDeleteConfirmation={() => {
                id && handleDelete(id);
              }}
            />
            <VerticalDivider className="hidden sm:inline" />
            <SmallScreenCTA
              formControl={form.control}
              isSidebarOpen={openSidebar}
              toggleSidebar={() => setOpenSidebar(false)}
              isDeleteButtonDisabled={schedule?.isLastSchedule}
              isDeleteDialogLoading={isDeleting}
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
          <Form
            form={form as unknown as UseFormReturn<FieldValues, any>}
            id="availability-form"
            handleSubmit={handleSubmit}
            className="flex flex-col sm:mx-0 xl:flex-row xl:space-x-6">
            <div className="flex-1 flex-row xl:mr-0">
              <div className="border-subtle mb-6 rounded-md border">
                <div>
                  {weekStart && (
                    <Schedule
                      control={form.control as unknown as Control<FieldValues, any>}
                      name="schedule"
                      weekStart={weekStart}
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
