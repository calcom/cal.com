import { useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { DateOverrideInputDialog, DateOverrideList } from "@calcom/features/schedules";
import WebSchedule, {
  ScheduleComponent as PlatformSchedule,
} from "@calcom/features/schedules/components/Schedule";
import WebShell from "@calcom/features/shell/Shell";
import { availabilityAsString } from "@calcom/lib/availability";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import type { TimeRange, WorkingHours } from "@calcom/types/schedule";
import {
  Button,
  ConfirmationDialogContent,
  EditableHeading,
  Form,
  SkeletonText,
  Dialog,
  DialogTrigger,
  Label,
  SelectSkeletonLoader,
  Skeleton,
  Switch,
  TimezoneSelect as WebTimezoneSelect,
  Tooltip,
  VerticalDivider,
} from "@calcom/ui";
import { Icon } from "@calcom/ui";

import { Shell as PlatformShell } from "../src/components/ui/shell";
import { cn } from "../src/lib/utils";
import { Timezone as PlatformTimzoneSelect } from "../timezone/index";
import type { AvailabilityFormValues } from "./types";

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

export type CustomClassNames = {
  containerClassName?: string;
  ctaClassName?: string;
  editableHeadingClassName?: string;
  formClassName?: string;
  timezoneSelectClassName?: string;
  subtitlesClassName?: string;
  scheduleClassNames?: {
    scheduleContainer?: string;
    scheduleDay?: string;
    dayRanges?: string;
    timeRanges?: string;
    labelAndSwitchContainer?: string;
  };
};

type AvailabilitySettingsProps = {
  skeletonLabel?: string;
  schedule: {
    name: string;
    id: number;
    availability: TimeRange[][];
    isLastSchedule: boolean;
    isDefault: boolean;
    workingHours: WorkingHours[];
    dateOverrides: { ranges: TimeRange[] }[];
    timeZone: string;
    schedule: Schedule[];
  };
  travelSchedules?: RouterOutputs["viewer"]["getTravelSchedules"];
  handleDelete: () => void;
  isDeleting: boolean;
  isSaving: boolean;
  isLoading: boolean;
  timeFormat: number | null;
  weekStart: string;
  backPath: string | boolean;
  handleSubmit: (data: AvailabilityFormValues) => Promise<void>;
  isPlatform?: boolean;
  customClassNames?: CustomClassNames;
};

const DeleteDialogButton = ({
  disabled,
  buttonClassName,
  isPending,
  onDeleteConfirmed,
  handleDelete,
}: {
  disabled?: boolean;
  onDeleteConfirmed?: () => void;
  buttonClassName: string;
  handleDelete: () => void;
  isPending: boolean;
}) => {
  const { t } = useLocale();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          StartIcon="trash"
          variant="icon"
          color="destructive"
          aria-label={t("delete")}
          className={buttonClassName}
          disabled={disabled}
          tooltip={disabled ? t("requires_at_least_one_schedule") : t("delete")}
        />
      </DialogTrigger>

      <ConfirmationDialogContent
        isPending={isPending}
        variety="danger"
        title={t("delete_schedule")}
        confirmBtnText={t("delete")}
        loadingText={t("delete")}
        onConfirm={() => {
          handleDelete();
          onDeleteConfirmed?.();
        }}>
        {t("delete_schedule_description")}
      </ConfirmationDialogContent>
    </Dialog>
  );
};

const useExcludedDates = () => {
  const watchValues = useWatch<AvailabilityFormValues>({ name: "dateOverrides" }) as {
    ranges: TimeRange[];
  }[];
  return useMemo(() => {
    return watchValues?.map((field) => dayjs(field.ranges[0].start).utc().format("YYYY-MM-DD"));
  }, [watchValues]);
};

const DateOverride = ({
  workingHours,
  userTimeFormat,
  travelSchedules,
  weekStart,
}: {
  workingHours: WorkingHours[];
  userTimeFormat: number | null;
  travelSchedules?: RouterOutputs["viewer"]["getTravelSchedules"];
  weekStart: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}) => {
  const { append, replace, fields } = useFieldArray<AvailabilityFormValues, "dateOverrides">({
    name: "dateOverrides",
  });
  const excludedDates = useExcludedDates();
  const { t } = useLocale();
  return (
    <div className="p-6">
      <h3 className="text-emphasis font-medium leading-6">
        {t("date_overrides")}{" "}
        <Tooltip content={t("date_overrides_info")}>
          <span className="inline-block align-middle">
            <Icon name="info" className="h-4 w-4" />
          </span>
        </Tooltip>
      </h3>
      <p className="text-subtle mb-4 text-sm">{t("date_overrides_subtitle")}</p>
      <div className="space-y-2">
        <DateOverrideList
          excludedDates={excludedDates}
          replace={replace}
          fields={fields}
          weekStart={weekStart}
          workingHours={workingHours}
          userTimeFormat={userTimeFormat}
          hour12={Boolean(userTimeFormat === 12)}
          travelSchedules={travelSchedules}
        />
        <DateOverrideInputDialog
          workingHours={workingHours}
          excludedDates={excludedDates}
          onChange={(ranges) => ranges.forEach((range) => append({ ranges: [range] }))}
          userTimeFormat={userTimeFormat}
          weekStart={weekStart}
          Trigger={
            <Button color="secondary" StartIcon="plus" data-testid="add-override">
              {t("add_an_override")}
            </Button>
          }
        />
      </div>
    </div>
  );
};

// Simplify logic by assuming this will never be opened on a large screen
const SmallScreenSideBar = ({ open, children }: { open: boolean; children: JSX.Element }) => {
  return (
    <div
      className={classNames(
        open
          ? "fadeIn fixed inset-0 z-50 bg-neutral-800 bg-opacity-70 transition-opacity dark:bg-opacity-70 sm:hidden"
          : ""
      )}>
      <div
        className={classNames(
          "bg-default fixed right-0 z-20 flex h-screen w-80 flex-col space-y-2 overflow-x-hidden rounded-md px-2 pb-3 transition-transform",
          open ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        )}>
        {open ? children : null}
      </div>
    </div>
  );
};

export function AvailabilitySettings({
  schedule,
  travelSchedules,
  handleDelete,
  isDeleting,
  isLoading,
  isSaving,
  timeFormat,
  weekStart,
  backPath,
  handleSubmit,
  isPlatform = false,
  customClassNames,
}: AvailabilitySettingsProps) {
  const [openSidebar, setOpenSidebar] = useState(false);
  const { t, i18n } = useLocale();

  const form = useForm<AvailabilityFormValues>({
    defaultValues: {
      ...schedule,
      schedule: schedule.availability || [],
    },
  });

  const [Shell, Schedule, TimezoneSelect] = useMemo(() => {
    return isPlatform
      ? [PlatformShell, PlatformSchedule, PlatformTimzoneSelect]
      : [WebShell, WebSchedule, WebTimezoneSelect];
  }, [isPlatform]);

  return (
    <Shell
      headerClassName={cn(customClassNames?.containerClassName)}
      backPath={backPath}
      title={schedule.name ? `${schedule.name} | ${t("availability")}` : t("availability")}
      heading={
        <Controller
          control={form.control}
          name="name"
          render={({ field }) => (
            <EditableHeading
              className={cn(customClassNames?.editableHeadingClassName)}
              isReady={!isLoading}
              {...field}
              data-testid="availablity-title"
            />
          )}
        />
      }
      subtitle={
        schedule ? (
          schedule.schedule
            .filter((availability) => !!availability.days.length)
            .map((availability) => (
              <span key={availability.id} className={cn(customClassNames?.subtitlesClassName)}>
                {availabilityAsString(availability, { locale: i18n.language, hour12: timeFormat === 12 })}
                <br />
              </span>
            ))
        ) : (
          <SkeletonText className="h-4 w-48" />
        )
      }
      CTA={
        <div className={cn(customClassNames?.ctaClassName, "flex items-center justify-end")}>
          <div className="sm:hover:bg-muted hidden items-center rounded-md px-2 sm:flex">
            {!openSidebar ? (
              <>
                <Skeleton
                  as={Label}
                  htmlFor="hiddenSwitch"
                  className="mt-2 cursor-pointer self-center pe-2"
                  loadingClassName="me-4"
                  waitForTranslation={!isPlatform}>
                  {t("set_to_default")}
                </Skeleton>
                <Controller
                  control={form.control}
                  name="isDefault"
                  render={({ field: { value, onChange } }) => (
                    <Switch
                      id="hiddenSwitch"
                      disabled={isSaving || schedule.isDefault}
                      checked={value}
                      onCheckedChange={onChange}
                    />
                  )}
                />
              </>
            ) : null}
          </div>

          <VerticalDivider className="hidden sm:inline" />
          <DeleteDialogButton
            buttonClassName="hidden sm:inline"
            disabled={schedule.isLastSchedule}
            isPending={isDeleting}
            handleDelete={handleDelete}
          />
          <VerticalDivider className="hidden sm:inline" />
          <SmallScreenSideBar open={openSidebar}>
            <>
              <div
                className={classNames(
                  openSidebar
                    ? "fadeIn fixed inset-0 z-50 bg-neutral-800 bg-opacity-70 transition-opacity dark:bg-opacity-70 sm:hidden"
                    : ""
                )}>
                <div
                  className={classNames(
                    "bg-default fixed right-0 z-20 flex h-screen w-80 flex-col space-y-2 overflow-x-hidden rounded-md px-2 pb-3 transition-transform",
                    openSidebar ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
                  )}>
                  <div className="flex flex-row items-center pt-5">
                    <Button StartIcon="arrow-left" color="minimal" onClick={() => setOpenSidebar(false)} />
                    <p className="-ml-2">{t("availability_settings")}</p>
                    <DeleteDialogButton
                      buttonClassName="ml-16 inline"
                      disabled={schedule.isLastSchedule}
                      isPending={isDeleting}
                      handleDelete={handleDelete}
                      onDeleteConfirmed={() => {
                        setOpenSidebar(false);
                      }}
                    />
                  </div>
                  <div className="flex flex-col px-2 py-2">
                    <Skeleton as={Label} waitForTranslation={!isPlatform}>
                      {t("name")}
                    </Skeleton>
                    <Controller
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <input
                          className="hover:border-emphasis dark:focus:border-emphasis border-default bg-default placeholder:text-muted text-emphasis focus:ring-brand-default disabled:bg-subtle disabled:hover:border-subtle focus:border-subtle mb-2 block h-9 w-full rounded-md border px-3 py-2 text-sm leading-4 focus:outline-none focus:ring-2 disabled:cursor-not-allowed"
                          {...field}
                        />
                      )}
                    />
                  </div>
                  <div className="flex h-9 flex-row-reverse items-center justify-end gap-3 px-2">
                    <Skeleton
                      as={Label}
                      htmlFor="hiddenSwitch"
                      className="mt-2 cursor-pointer self-center pr-2 sm:inline"
                      waitForTranslation={!isPlatform}>
                      {t("set_to_default")}
                    </Skeleton>
                    <Controller
                      control={form.control}
                      name="isDefault"
                      render={({ field: { value, onChange } }) => (
                        <Switch
                          id="hiddenSwitch"
                          disabled={isSaving || value}
                          checked={value}
                          onCheckedChange={onChange}
                        />
                      )}
                    />
                  </div>

                  <div className="min-w-40 col-span-3 space-y-2 px-2 py-4 lg:col-span-1">
                    <div className="xl:max-w-80 w-full pr-4 sm:ml-0 sm:mr-36 sm:p-0">
                      <div>
                        <Skeleton
                          as={Label}
                          htmlFor="timeZone-sm-viewport"
                          className="mb-0 inline-block leading-none"
                          waitForTranslation={!isPlatform}>
                          {t("timezone")}
                        </Skeleton>
                        <Controller
                          control={form.control}
                          name="timeZone"
                          render={({ field: { onChange, value } }) =>
                            value ? (
                              <TimezoneSelect
                                inputId="timeZone-sm-viewport"
                                value={value}
                                className={cn(
                                  "focus:border-brand-default border-default mt-1 block w-72 rounded-md text-sm",
                                  customClassNames?.timezoneSelectClassName
                                )}
                                onChange={(timezone) => onChange(timezone.value)}
                              />
                            ) : (
                              <SelectSkeletonLoader className="mt-1 w-72" />
                            )
                          }
                        />
                      </div>
                      {!isPlatform && (
                        <>
                          <hr className="border-subtle my-7" />
                          <div className="rounded-md md:block">
                            <Skeleton
                              as="h3"
                              className="mb-0 inline-block text-sm font-medium"
                              waitForTranslation={!isPlatform}>
                              {t("something_doesnt_look_right")}
                            </Skeleton>
                            <div className="mt-3 flex">
                              <Skeleton
                                as={Button}
                                href="/availability/troubleshoot"
                                color="secondary"
                                waitForTranslation={!isPlatform}>
                                {t("launch_troubleshooter")}
                              </Skeleton>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          </SmallScreenSideBar>
          <div className="border-default border-l-2" />
          <Button className="ml-4 lg:ml-0" type="submit" form="availability-form" loading={isSaving}>
            {t("save")}
          </Button>
          <Button
            className="ml-3 sm:hidden"
            StartIcon="ellipsis-vertical"
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
          handleSubmit={async (props) => {
            handleSubmit(props);
          }}
          className={cn(customClassNames?.formClassName, "flex flex-col sm:mx-0 xl:flex-row xl:space-x-6")}>
          <div className="flex-1 flex-row xl:mr-0">
            <div className="border-subtle mb-6 rounded-md border">
              <div>
                {typeof weekStart === "string" && (
                  <Schedule
                    labels={{
                      addTime: t("add_time_availability"),
                      copyTime: t("copy_times_to"),
                      deleteTime: t("delete"),
                    }}
                    className={
                      customClassNames?.scheduleClassNames ? { ...customClassNames.scheduleClassNames } : {}
                    }
                    control={form.control}
                    name="schedule"
                    userTimeFormat={timeFormat}
                    weekStart={
                      ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(
                        weekStart
                      ) as 0 | 1 | 2 | 3 | 4 | 5 | 6
                    }
                  />
                )}
              </div>
            </div>
            {!isPlatform ? (
              <div className="border-subtle my-6 rounded-md border">
                {schedule?.workingHours && (
                  <DateOverride
                    workingHours={schedule.workingHours}
                    userTimeFormat={timeFormat}
                    travelSchedules={travelSchedules}
                    weekStart={
                      ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(
                        weekStart
                      ) as 0 | 1 | 2 | 3 | 4 | 5 | 6
                    }
                  />
                )}
              </div>
            ) : (
              <></>
            )}
          </div>
          <div className="min-w-40 col-span-3 hidden space-y-2 md:block lg:col-span-1">
            <div className="xl:max-w-80 w-full pr-4 sm:ml-0 sm:mr-36 sm:p-0">
              <div>
                <Skeleton
                  as={Label}
                  htmlFor="timeZone-lg-viewport"
                  className="mb-0 inline-block leading-none"
                  waitForTranslation={!isPlatform}>
                  {t("timezone")}
                </Skeleton>
                <Controller
                  name="timeZone"
                  render={({ field: { onChange, value } }) =>
                    value ? (
                      <TimezoneSelect
                        inputId="timeZone-lg-viewport"
                        value={value}
                        className="focus:border-brand-default border-default mt-1 block w-72 rounded-md text-sm"
                        onChange={(timezone) => onChange(timezone.value)}
                      />
                    ) : (
                      <SelectSkeletonLoader className="mt-1 w-72" />
                    )
                  }
                />
              </div>
              {isPlatform ? (
                <></>
              ) : (
                <>
                  <hr className="border-subtle my-6 mr-8" />
                  <div className="rounded-md">
                    <Skeleton
                      as="h3"
                      className="mb-0 inline-block text-sm font-medium"
                      waitForTranslation={!isPlatform}>
                      {t("something_doesnt_look_right")}
                    </Skeleton>
                    <div className="mt-3 flex">
                      <Skeleton
                        as={Button}
                        href="/availability/troubleshoot"
                        color="secondary"
                        waitForTranslation={!isPlatform}>
                        {t("launch_troubleshooter")}
                      </Skeleton>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </Form>
      </div>
    </Shell>
  );
}
