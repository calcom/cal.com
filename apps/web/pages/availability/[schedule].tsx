import { useRouter } from "next/router";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { DateOverrideInputDialog, DateOverrideList } from "@calcom/features/schedules";
import Schedule from "@calcom/features/schedules/components/Schedule";
import Shell from "@calcom/features/shell/Shell";
import { availabilityAsString } from "@calcom/lib/availability";
import { yyyymmdd } from "@calcom/lib/date-fns";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import type { Schedule as ScheduleType, TimeRange, WorkingHours } from "@calcom/types/schedule";
import {
  Button,
  Form,
  Label,
  showToast,
  Skeleton,
  SkeletonText,
  Switch,
  TimezoneSelect,
  Tooltip,
  Dialog,
  DialogTrigger,
  ConfirmationDialogContent,
  VerticalDivider,
} from "@calcom/ui";
import { FiInfo, FiPlus, FiTrash } from "@calcom/ui/components/icon";

import { HttpError } from "@lib/core/http/error";

import { SelectSkeletonLoader } from "@components/availability/SkeletonLoader";
import EditableHeading from "@components/ui/EditableHeading";

const querySchema = z.object({
  schedule: z.coerce.number().positive().optional(),
});

type AvailabilityFormValues = {
  name: string;
  schedule: ScheduleType;
  dateOverrides: { ranges: TimeRange[] }[];
  timeZone: string;
  isDefault: boolean;
};

const DateOverride = ({ workingHours }: { workingHours: WorkingHours[] }) => {
  const { remove, append, update, fields } = useFieldArray<AvailabilityFormValues, "dateOverrides">({
    name: "dateOverrides",
  });
  const { t } = useLocale();
  return (
    <div className="p-6">
      <h3 className="font-medium leading-6 text-gray-900">
        {t("date_overrides")}{" "}
        <Tooltip content={t("date_overrides_info")}>
          <span className="inline-block">
            <FiInfo />
          </span>
        </Tooltip>
      </h3>
      <p className="mb-4 text-sm text-gray-500">{t("date_overrides_subtitle")}</p>
      <div className="space-y-2">
        <DateOverrideList
          excludedDates={fields.map((field) => yyyymmdd(field.ranges[0].start))}
          remove={remove}
          update={update}
          items={fields}
          workingHours={workingHours}
        />
        <DateOverrideInputDialog
          workingHours={workingHours}
          excludedDates={fields.map((field) => yyyymmdd(field.ranges[0].start))}
          onChange={(ranges) => append({ ranges })}
          Trigger={
            <Button color="secondary" StartIcon={FiPlus} data-testid="add-override">
              Add an override
            </Button>
          }
        />
      </div>
    </div>
  );
};

export default function Availability() {
  const { t, i18n } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();
  const me = useMeQuery();
  const {
    data: { schedule: scheduleId },
  } = useTypedQuery(querySchema);

  const { fromEventType } = router.query;
  const { timeFormat } = me.data || { timeFormat: null };
  const { data: schedule, isLoading } = trpc.viewer.availability.schedule.get.useQuery(
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

  const deleteMutation = trpc.viewer.availability.schedule.delete.useMutation({
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
    onSettled: () => {
      utils.viewer.availability.list.invalidate();
    },
    onSuccess: () => {
      showToast(t("schedule_deleted_successfully"), "success");
      router.push("/availability");
    },
  });

  return (
    <Shell
      backPath={fromEventType ? true : "/availability"}
      title={schedule?.name ? schedule.name + " | " + t("availability") : t("availability")}
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
          <div className="flex items-center rounded-md px-2 sm:hover:bg-gray-100">
            <Skeleton
              as={Label}
              htmlFor="hiddenSwitch"
              className="mt-2 hidden cursor-pointer self-center pr-2 sm:inline">
              {t("set_to_default")}
            </Skeleton>
            <Switch
              id="hiddenSwitch"
              disabled={isLoading || schedule?.isDefault}
              checked={form.watch("isDefault")}
              onCheckedChange={(e) => {
                form.setValue("isDefault", e);
              }}
            />
          </div>

          <VerticalDivider />
          <Dialog>
            <DialogTrigger asChild>
              <Button
                StartIcon={FiTrash}
                variant="icon"
                color="destructive"
                aria-label={t("delete")}
                disabled={schedule?.isLastSchedule}
                tooltip={t("requires_at_least_one_schedule")}
              />
            </DialogTrigger>
            <ConfirmationDialogContent
              isLoading={deleteMutation.isLoading}
              variety="danger"
              title={t("delete_schedule")}
              confirmBtnText={t("delete")}
              loadingText={t("delete")}
              onConfirm={() => {
                scheduleId && deleteMutation.mutate({ scheduleId });
              }}>
              {t("delete_schedule_description")}
            </ConfirmationDialogContent>
          </Dialog>

          <VerticalDivider />

          <div className="border-l-2 border-gray-300" />
          <Button className="ml-4 lg:ml-0" type="submit" form="availability-form">
            {t("save")}
          </Button>
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
            <div className="mb-6 rounded-md border">
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
            <div className="my-6 rounded-md border">
              {schedule?.workingHours && <DateOverride workingHours={schedule.workingHours} />}
            </div>
          </div>
          <div className="min-w-40 col-span-3 space-y-2 lg:col-span-1">
            <div className="xl:max-w-80 w-full pr-4 sm:ml-0 sm:mr-36 sm:p-0">
              <div>
                <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
                  {t("timezone")}
                </label>
                <Controller
                  name="timeZone"
                  render={({ field: { onChange, value } }) =>
                    value ? (
                      <TimezoneSelect
                        value={value}
                        className="focus:border-brand mt-1 block w-72 rounded-md border-gray-300 text-sm"
                        onChange={(timezone) => onChange(timezone.value)}
                      />
                    ) : (
                      <SelectSkeletonLoader className="w-72" />
                    )
                  }
                />
              </div>
              <hr className="my-6 mr-8" />
              <div className="hidden rounded-md md:block">
                <h3 className="text-sm font-medium text-gray-900">{t("something_doesnt_look_right")}</h3>
                <div className="mt-3 flex">
                  <Button href="/availability/troubleshoot" color="secondary">
                    {t("launch_troubleshooter")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Form>
      </div>
    </Shell>
  );
}
