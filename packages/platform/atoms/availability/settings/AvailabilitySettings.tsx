import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FieldValues, Control } from "react-hook-form";
import { useForm, Controller } from "react-hook-form";

import Schedule from "@calcom/features/schedules/components/Schedule";
import Shell from "@calcom/features/shell/Shell";
import type { WorkingHours } from "@calcom/types/schedule";
import type { TimeRange } from "@calcom/types/schedule";
import { VerticalDivider, Button, Form, SkeletonText } from "@calcom/ui";
import { MoreVertical } from "@calcom/ui/components/icon";
import EditableHeading from "@calcom/web/components/ui/EditableHeading";

import { LargeScreenCTA } from "../components/cta/large-screen/index";
import { SmallScreenCTA } from "../components/cta/small-screen/index";
import { DateOverride } from "../components/date-overrides/index";
import { Timezone } from "../components/timezone/index";
import { Troubleshooter } from "../components/troubleshooter/index";
import { availabilityAsString } from "../lib/availabilityAsString";
import type { daysInNumbers } from "../lib/daysInAWeek";
import { daysInAWeek } from "../lib/daysInAWeek";
import type { AvailabilityFormValues } from "../types";

export type Schedule = {
  id: number;
  startTime: Date;
  endTime: Date;
  userId: number | null;
  eventTypeId: number | null;
  date: Date | null;
  scheduleId: number | null;
  days: number[];
};

type LabelsType = { saveButtonLabel?: string };

type AvailabilitySettingsProps = {
  id?: number;
  ctaTranslations?: {
    saveButtonLabel?: string;
    setToDefaultLabel?: string;
    availabilitySettingsTitle?: string;
    deleteAriaLabel?: string;
    deleteTooltipDescription?: string;
    confirmationDialogTitle?: string;
    confirmationDialogButtonText?: string;
    confirmationDialogDescription?: string;
  };
  dateOverrideTranslations?: {
    title?: string;
    subtitle?: string;
    tooltipContent?: string;
    buttonText?: string;
  };
  timezoneTranslations?: {
    title: string;
  };
  troubleshooterTranslations?: {
    title: string;
    cta: string;
  };
  skeletonLabel?: string;
  schedule?: {
    name: string;
    id: number;
    availability: TimeRange[][];
    isLastSchedule: boolean;
    isDefault: boolean;
    workingHours: WorkingHours[];
    dateOverrides: { ranges: TimeRange[] }[];
    timeZone: string;
    schedule: Schedule[] | [];
  };
  handleDelete: (id: number) => void;
  isDeleting: boolean;
  isSaving: boolean;
  isLoading: boolean;
  timeFormat: number | null;
  weekStart: string;
  backPath: string | boolean;
  handleSubmit: (data: AvailabilityFormValues) => Promise<void>;
  labels: LabelsType;
};

const queryClient = new QueryClient();

export function AvailabilitySettings({
  id,
  schedule,
  handleDelete,
  isDeleting,
  isLoading,
  isSaving,
  timeFormat,
  weekStart,
  backPath,
  handleSubmit,
  timezoneTranslations,
  troubleshooterTranslations,
  dateOverrideTranslations,
  skeletonLabel = "Name",
  ctaTranslations = {
    saveButtonLabel: "Save",
    setToDefaultLabel: "Set to Default",
    availabilitySettingsTitle: "Availability Settings",
    deleteAriaLabel: "Delete",
    deleteTooltipDescription: "You are required to have at least one schedule",
    confirmationDialogButtonText: "Delete",
    confirmationDialogDescription:
      "Deleting a schedule will remove it from all event types. This action cannot be undone.",
  },
}: AvailabilitySettingsProps) {
  const [openSidebar, setOpenSidebar] = useState(false);
  const userWeekStart = daysInAWeek.indexOf(weekStart) as typeof daysInNumbers;

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
        backPath={backPath}
        SidebarContainer={<></>}
        subtitle={
          schedule ? (
            schedule.schedule
              .filter((availability) => !!availability.days.length)
              .map((availability) => (
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
              translationLabels={{
                setToDefaultLabel: ctaTranslations.setToDefaultLabel,
                deleteAriaLabel: ctaTranslations.deleteAriaLabel,
                deleteTooltip: ctaTranslations.deleteTooltipDescription,
                confirmationDialogTitle: ctaTranslations.confirmationDialogTitle,
                confirmationDialogButtonText: ctaTranslations.confirmationDialogButtonText,
                confirmationDialogDescription: ctaTranslations.confirmationDialogDescription,
              }}
              isButtonDisabled={Boolean(schedule?.isLastSchedule)}
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
              isDeleteButtonDisabled={Boolean(schedule?.isLastSchedule)}
              isDeleteDialogLoading={isDeleting}
              onDeleteConfirmation={() => {
                id && handleDelete(id);
              }}
              translationLabels={{
                availabilitySettingsTitle: ctaTranslations.availabilitySettingsTitle,
                setToDefaultLabel: ctaTranslations.setToDefaultLabel,
                deleteAriaLabel: ctaTranslations.deleteAriaLabel,
                deleteTooltipDescription: ctaTranslations.deleteTooltipDescription,
                confirmationDialogTitle: ctaTranslations.confirmationDialogTitle,
                confirmationDialogButtonText: ctaTranslations.confirmationDialogButtonText,
                confirmationDialogDescription: ctaTranslations.confirmationDialogDescription,
                skeletonTitle: skeletonLabel,
                timezoneTitle: timezoneTranslations?.title,
                troubleshooterTitle: troubleshooterTranslations?.title,
                troubleshooterCta: troubleshooterTranslations?.cta,
              }}
            />
            <div className="border-default border-l-2" />
            <Button className="ml-4 lg:ml-0" type="submit" form="availability-form" loading={isSaving}>
              {ctaTranslations.saveButtonLabel}
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
            form={form}
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
                      weekStart={userWeekStart}
                    />
                  )}
                </div>
              </div>
              <div className="border-subtle my-6 rounded-md border">
                {schedule?.workingHours && (
                  <DateOverride
                    workingHours={schedule.workingHours}
                    translationLabels={{
                      title: dateOverrideTranslations?.title,
                      subtitle: dateOverrideTranslations?.subtitle,
                      tooltipContent: dateOverrideTranslations?.tooltipContent,
                      buttonText: dateOverrideTranslations?.buttonText,
                    }}
                  />
                )}
              </div>
            </div>
            <div className="min-w-40 col-span-3 hidden space-y-2 md:block lg:col-span-1">
              <div className="xl:max-w-80 w-full pr-4 sm:ml-0 sm:mr-36 sm:p-0">
                <Timezone title={timezoneTranslations?.title} />
                <hr className="border-subtle my-6 mr-8" />
                <Troubleshooter
                  translationLabels={{
                    title: troubleshooterTranslations?.title,
                    ctaLabel: troubleshooterTranslations?.cta,
                  }}
                  isDisplayBlock={false}
                />
              </div>
            </div>
          </Form>
        </div>
      </Shell>
    </QueryClientProvider>
  );
}
