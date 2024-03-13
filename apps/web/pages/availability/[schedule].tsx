import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { DateOverrideInputDialog, DateOverrideList } from "@calcom/features/schedules";
import Schedule from "@calcom/features/schedules/components/Schedule";
import Shell from "@calcom/features/shell/Shell";
import { classNames } from "@calcom/lib";
import { availabilityAsString } from "@calcom/lib/availability";
import { withErrorFromUnknown } from "@calcom/lib/getClientErrorFromUnknown";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import type { Schedule as ScheduleType, TimeRange, WorkingHours } from "@calcom/types/schedule";
import {
  Button,
  ConfirmationDialogContent,
  Dialog,
  DialogTrigger,
  Form,
  Label,
  showToast,
  Skeleton,
  SkeletonText,
  Switch,
  TimezoneSelect,
  Tooltip,
  VerticalDivider,
} from "@calcom/ui";
import { ArrowLeft, Info, MoreVertical, Plus, Trash } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";
import { SelectSkeletonLoader } from "@components/availability/SkeletonLoader";
import EditableHeading from "@components/ui/EditableHeading";

export type AvailabilityFormValues = {
  name: string;
  schedule: ScheduleType;
  dateOverrides: { ranges: TimeRange[] }[];
  timeZone: string;
  isDefault: boolean;
};

const useExcludedDates = () => {
  const watchValues = useWatch<AvailabilityFormValues>({ name: "dateOverrides" }) as {
    ranges: TimeRange[];
  }[];
  return useMemo(() => {
    return watchValues?.map((field) => dayjs(field.ranges[0].start).utc().format("YYYY-MM-DD"));
  }, [watchValues]);
};

const useSettings = () => {
  const { data } = useMeQuery();
  return {
    hour12: data?.timeFormat === 12,
    timeZone: data?.timeZone,
  };
};

const DateOverride = ({ workingHours }: { workingHours: WorkingHours[] }) => {
  const { hour12 } = useSettings();
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
            <Info className="h-4 w-4" />
          </span>
        </Tooltip>
      </h3>
      <p className="text-subtle mb-4 text-sm">{t("date_overrides_subtitle")}</p>
      <div className="space-y-2">
        <DateOverrideList
          hour12={hour12}
          replace={replace}
          fields={fields}
          excludedDates={excludedDates}
          workingHours={workingHours}
        />
        <DateOverrideInputDialog
          workingHours={workingHours}
          excludedDates={excludedDates}
          onChange={(ranges) => ranges.forEach((range) => append({ ranges: [range] }))}
          Trigger={
            <Button color="secondary" StartIcon={Plus} data-testid="add-override">
              {t("add_an_override")}
            </Button>
          }
        />
      </div>
    </div>
  );
};

const DeleteDialogButton = ({
  disabled,
  scheduleId,
  buttonClassName,
  onDeleteConfirmed,
}: {
  disabled?: boolean;
  onDeleteConfirmed?: () => void;
  buttonClassName: string;
  scheduleId: number;
}) => {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { isPending, mutate } = trpc.viewer.availability.schedule.delete.useMutation({
    onError: withErrorFromUnknown((err) => {
      showToast(err.message, "error");
    }),
    onSettled: () => {
      utils.viewer.availability.list.invalidate();
    },
    onSuccess: () => {
      showToast(t("schedule_deleted_successfully"), "success");
      router.push("/availability");
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          StartIcon={Trash}
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
          scheduleId && mutate({ scheduleId });
          onDeleteConfirmed?.();
        }}>
        {t("delete_schedule_description")}
      </ConfirmationDialogContent>
    </Dialog>
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
export default function Availability() {
  const searchParams = useCompatSearchParams();
  const { t, i18n } = useLocale();
  const utils = trpc.useUtils();
  const me = useMeQuery();
  const scheduleId = searchParams?.get("schedule") ? Number(searchParams.get("schedule")) : -1;
  const fromEventType = searchParams?.get("fromEventType");
  const { timeFormat } = me.data || { timeFormat: null };
  const [openSidebar, setOpenSidebar] = useState(false);
  const { data: schedule, isPending } = trpc.viewer.availability.schedule.get.useQuery(
    { scheduleId },
    {
      enabled: !!scheduleId,
    }
  );

  const form = useForm<AvailabilityFormValues>({
    values: schedule && {
      ...schedule,
      schedule: schedule?.availability || [],
    },
  });
  const updateMutation = trpc.viewer.availability.schedule.update.useMutation({
    onSuccess: async ({ prevDefaultId, currentDefaultId, ...data }) => {
      if (prevDefaultId && currentDefaultId) {
        // check weather the default schedule has been changed by comparing  previous default schedule id and current default schedule id.
        if (prevDefaultId !== currentDefaultId) {
          // if not equal, invalidate previous default schedule id and refetch previous default schedule id.
          utils.viewer.availability.schedule.get.invalidate({ scheduleId: prevDefaultId });
          utils.viewer.availability.schedule.get.refetch({ scheduleId: prevDefaultId });
        }
      }
      utils.viewer.availability.schedule.get.invalidate({ scheduleId: data.schedule.id });
      utils.viewer.availability.list.invalidate();
      showToast(
        t("availability_updated_successfully", {
          scheduleName: data.schedule.name,
        }),
        "success"
      );
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  return (
    <Shell
      backPath={fromEventType ? true : "/availability"}
      title={schedule?.name ? `${schedule.name} | ${t("availability")}` : t("availability")}
      heading={
        <Controller
          control={form.control}
          name="name"
          render={({ field }) => (
            <EditableHeading isReady={!isPending} {...field} data-testid="availablity-title" />
          )}
        />
      }
      subtitle={
        schedule ? (
          schedule.schedule
            .filter((availability) => !!availability.days.length)
            .map((availability) => (
              <span key={availability.id}>
                {availabilityAsString(availability, { locale: i18n.language, hour12: timeFormat === 12 })}
                <br />
              </span>
            ))
        ) : (
          <SkeletonText className="h-4 w-48" />
        )
      }
      CTA={
        <div className="flex items-center justify-end">
          <div className="sm:hover:bg-muted hidden items-center rounded-md px-2 sm:flex">
            {!openSidebar ? (
              <>
                <Skeleton
                  as={Label}
                  htmlFor="hiddenSwitch"
                  className="mt-2 cursor-pointer self-center pe-2"
                  loadingClassName="me-4">
                  {t("set_to_default")}
                </Skeleton>
                <Controller
                  control={form.control}
                  name="isDefault"
                  render={({ field: { value, onChange } }) => (
                    <Switch
                      id="hiddenSwitch"
                      disabled={isPending || schedule?.isDefault}
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
            scheduleId={scheduleId}
            disabled={schedule?.isLastSchedule}
          />
          <VerticalDivider className="hidden sm:inline" />

          <SmallScreenSideBar open={openSidebar}>
            <>
              <div className="flex flex-row items-center pt-5">
                <Button
                  StartIcon={ArrowLeft}
                  color="minimal"
                  onClick={() => {
                    setOpenSidebar(false);
                  }}
                />
                <p className="-ml-2">{t("availability_settings")}</p>
                <DeleteDialogButton
                  buttonClassName="ml-16 inline"
                  scheduleId={scheduleId}
                  disabled={schedule?.isLastSchedule}
                  onDeleteConfirmed={() => {
                    setOpenSidebar(false);
                  }}
                />
              </div>
              <div className="flex flex-col px-2 py-2">
                <Skeleton as={Label}>{t("name")}</Skeleton>
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
                  className="mt-2 cursor-pointer self-center pr-2 sm:inline">
                  {t("set_to_default")}
                </Skeleton>
                <Controller
                  control={form.control}
                  name="isDefault"
                  render={({ field: { value, onChange } }) => (
                    <Switch
                      id="hiddenSwitch"
                      disabled={isPending || value}
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
                      className="mb-0 inline-block leading-none">
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
                            className="focus:border-brand-default border-default mt-1 block w-72 rounded-md text-sm"
                            onChange={(timezone) => onChange(timezone.value)}
                          />
                        ) : (
                          <SelectSkeletonLoader className="mt-1 w-72" />
                        )
                      }
                    />
                  </div>
                  <hr className="border-subtle my-7" />
                  <div className="rounded-md md:block">
                    <Skeleton as="h3" className="mb-0 inline-block text-sm font-medium">
                      {t("something_doesnt_look_right")}
                    </Skeleton>
                    <div className="mt-3 flex">
                      <Skeleton as={Button} href="/availability/troubleshoot" color="secondary">
                        {t("launch_troubleshooter")}
                      </Skeleton>
                    </div>
                  </div>
                </div>
              </div>
            </>
          </SmallScreenSideBar>

          <div className="border-default border-l-2" />
          <Button
            className="ml-4 lg:ml-0"
            type="submit"
            form="availability-form"
            loading={updateMutation.isPending}>
            {t("save")}
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
          handleSubmit={async ({ dateOverrides, ...values }) => {
            scheduleId &&
              updateMutation.mutate({
                scheduleId,
                dateOverrides: dateOverrides.flatMap((override) => override.ranges),
                ...values,
              });
          }}
          className="flex flex-col sm:mx-0 xl:flex-row xl:space-x-6">
          <div className="flex-1 flex-row xl:mr-0">
            <div className="border-subtle mb-6 rounded-md border">
              <div>
                {typeof me.data?.weekStart === "string" && (
                  <Schedule
                    control={form.control}
                    name="schedule"
                    weekStart={
                      ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(
                        me.data?.weekStart
                      ) as 0 | 1 | 2 | 3 | 4 | 5 | 6
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
              <div>
                <Skeleton
                  as={Label}
                  htmlFor="timeZone-lg-viewport"
                  className="mb-0 inline-block leading-none">
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
              <hr className="border-subtle my-6 mr-8" />
              <div className="rounded-md">
                <Skeleton as="h3" className="mb-0 inline-block text-sm font-medium">
                  {t("something_doesnt_look_right")}
                </Skeleton>
                <div className="mt-3 flex">
                  <Skeleton as={Button} href="/availability/troubleshoot" color="secondary">
                    {t("launch_troubleshooter")}
                  </Skeleton>
                </div>
              </div>
            </div>
          </div>
        </Form>
      </div>
    </Shell>
  );
}

Availability.PageWrapper = PageWrapper;
