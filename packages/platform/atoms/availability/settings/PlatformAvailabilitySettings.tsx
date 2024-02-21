import { TooltipProvider } from "@radix-ui/react-tooltip";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { FieldValues, Control } from "react-hook-form";

import { ScheduleComponent } from "@calcom/features/schedules/components/Schedule";
import type { ScheduleLabelsType } from "@calcom/features/schedules/components/Schedule";
import type { WorkingHours } from "@calcom/types/schedule";
import type { TimeRange } from "@calcom/types/schedule";
import { Form } from "@calcom/ui";

import { PlatformAvailabilitySettingsCTA } from "../components/platform-availability-settings-cta/index";
import { PlatformAvailabilitySettingsHeader } from "../components/platform-availability-settings-header/index";
import { Timezone } from "../components/timezone/index";
import { daysInAWeek } from "../lib/daysInAWeek";
import type { daysInNumbers } from "../lib/daysInAWeek";
import type { Schedule as UserSchedule } from "../settings/AvailabilitySettings";
import type { AvailabilityFormValues } from "../types";

type PlatformAvailabilitySettingsProps = {
  isHeadingReady: boolean;
  timeFormat: number | null;
  weekStart: string;
  labels: ScheduleLabelsType;
  schedule?: {
    name: string;
    id: number;
    availability: TimeRange[][];
    isLastSchedule: boolean;
    isDefault: boolean;
    workingHours: WorkingHours[];
    dateOverrides: { ranges: TimeRange[] }[];
    timeZone: string;
    schedule: UserSchedule[] | [];
  };
  onScheduleDeletion: () => void;
  onScheduleUpdation: (id: number, schedule: AvailabilityFormValues) => void;
};

export function PlatformAvailabilitySettings({
  schedule,
  isHeadingReady,
  timeFormat,
  weekStart,
  labels,
  onScheduleDeletion,
  onScheduleUpdation,
}: PlatformAvailabilitySettingsProps) {
  const userWeekStart = daysInAWeek.indexOf(weekStart) as typeof daysInNumbers;
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const form = useForm<AvailabilityFormValues>({
    values: schedule && {
      ...schedule,
      schedule: schedule?.availability || [],
    },
  });

  return (
    <div className="flex flex-col px-10 py-4">
      <div className="mb-6 flex items-center justify-between md:mb-6 md:mt-0 lg:mb-8">
        <PlatformAvailabilitySettingsHeader
          form={form}
          isHeadingReady={isHeadingReady}
          timeFormat={timeFormat}
          schedule={schedule?.schedule || []}
        />
        <PlatformAvailabilitySettingsCTA
          largeScreenCTA={{
            isButtonDisabled: schedule?.isDefault || false,
            isSwitchDisabled: schedule?.isDefault || false,
            onDeleteConfirmation: onScheduleDeletion,
          }}
        />
      </div>
      <div>
        <Form
          form={form}
          id="availability-form"
          className="flex flex-col sm:mx-0 xl:flex-row xl:space-x-6"
          handleSubmit={(values: AvailabilityFormValues) => {
            schedule?.id && onScheduleUpdation(schedule.id, values);
          }}>
          <div className="flex-1 flex-row xl:mr-0">
            <div className="border-subtle mb-6 rounded-md border">
              <div>
                {weekStart && (
                  <TooltipProvider>
                    <ScheduleComponent
                      className={{
                        labelAndSwitchContainer: "w-32",
                        timeRanges: "gap-3",
                      }}
                      userTimeFormat={timeFormat}
                      labels={labels}
                      control={form.control as unknown as Control<FieldValues, any>}
                      name="schedule"
                      weekStart={userWeekStart}
                    />
                  </TooltipProvider>
                )}
              </div>
            </div>
          </div>
          <Timezone />
          <div />
        </Form>
      </div>
    </div>
  );
}
