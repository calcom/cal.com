import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { DateOverrideInputDialog, DateOverrideList } from "@calcom/features/schedules";
import Schedule from "@calcom/features/schedules/components/Schedule";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import type { Schedule as ScheduleType, TimeRange, WorkingHours } from "@calcom/types/schedule";
import {
  Alert,
  Button,
  Form,
  Label,
  Select,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  showToast,
  TimezoneSelect,
} from "@calcom/ui";

import type { SliderUser } from "./AvailabilitySliderTable";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUser?: SliderUser | null;
}

type AvailabilityFormValues = {
  name: string;
  schedule: ScheduleType;
  dateOverrides: { ranges: TimeRange[] }[];
  timeZone: string;
  isDefault: boolean;
};

const useSettings = () => {
  const { data } = useMeQuery();
  return {
    userTimeFormat: data?.timeFormat ?? 12,
  };
};

const DateOverride = ({ workingHours, disabled }: { workingHours: WorkingHours[]; disabled?: boolean }) => {
  const { userTimeFormat } = useSettings();

  const { append, replace, fields } = useFieldArray<AvailabilityFormValues, "dateOverrides">({
    name: "dateOverrides",
  });
  const excludedDates = fields.map((field) => dayjs(field.ranges[0].start).utc().format("YYYY-MM-DD"));
  const { t } = useLocale();
  return (
    <div className="">
      <Label>{t("date_overrides")}</Label>
      <div className="space-y-2">
        <DateOverrideList
          excludedDates={excludedDates}
          replace={replace}
          fields={fields}
          hour12={Boolean(userTimeFormat === 12)}
          workingHours={workingHours}
          userTimeFormat={userTimeFormat}
        />
        <DateOverrideInputDialog
          userTimeFormat={userTimeFormat}
          workingHours={workingHours}
          excludedDates={excludedDates}
          onChange={(ranges) => ranges.forEach((range) => append({ ranges: [range] }))}
          Trigger={
            <Button color="secondary" StartIcon="plus" data-testid="add-override" disabled={disabled}>
              {t("add_an_override")}
            </Button>
          }
        />
      </div>
    </div>
  );
};

export function AvailabilityEditSheet(props: Props) {
  // This sheet will not be rendered without a selected user
  const userId = props.selectedUser?.id as number;
  const { data, isPending } = trpc.viewer.availability.schedule.getAllSchedulesByUserId.useQuery({
    userId: userId,
  });

  // TODO: reimplement Skeletons for this page in here
  if (isPending) return null;

  if (!data) return null;

  // We wait for the schedule to be loaded before rendering the form since `defaultValues`
  // cannot be redeclared after first render. And using `values` will trigger a form reset
  // when revalidating.
  return <AvailabilityEditSheetForm {...props} data={data} isPending={isPending} />;
}

type Data = RouterOutputs["viewer"]["availability"]["schedule"]["getAllSchedulesByUserId"];
export function AvailabilityEditSheetForm(props: Props & { data: Data; isPending: boolean }) {
  // This sheet will not be rendered without a selected user
  const userId = props.selectedUser?.id as number;
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const { data: hasEditPermission, isPending: loadingPermissions } =
    trpc.viewer.teams.hasEditPermissionForUser.useQuery({
      memberId: userId,
    });

  const { data, isPending } = props;

  const updateMutation = trpc.viewer.availability.schedule.update.useMutation({
    onSuccess: async () => {
      await utils.viewer.availability.listTeam.invalidate();
      await utils.viewer.availability.schedule.getAllSchedulesByUserId.invalidate({ userId });
      showToast(t("success"), "success");
      props.onOpenChange(false);
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  const defaultSchedule = data.find((schedule) => schedule.isDefault) ?? data[0];
  const [selectedSchedule, setSelectedSchedule] = useState(defaultSchedule.id);
  const [workingHours, setWorkingHours] = useState(defaultSchedule.workingHours);

  const form = useForm<AvailabilityFormValues>({
    defaultValues: {
      ...defaultSchedule,
      timeZone: defaultSchedule.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      schedule: defaultSchedule.availability || [],
    },
  });

  const watchTimezone = form.watch("timeZone");
  const userAvailabilityOptions = data.map((schedule) => ({ label: schedule.name, value: schedule.id }));
  const userHasDefaultSchedule = data.some((schedule) => schedule.hasDefaultSchedule);

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <Form
        form={form}
        id="availability-form"
        handleSubmit={async ({ dateOverrides, ...values }) => {
          // Just blocking on a UI side -> Backend will also do the validation
          if (!hasEditPermission) return;
          updateMutation.mutate({
            scheduleId: selectedSchedule,
            dateOverrides: dateOverrides.flatMap((override) => override.ranges),
            ...values,
          });
        }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {t("edit_users_availability", {
                username: props.selectedUser?.username ?? "Nameless user",
              })}
            </SheetTitle>
          </SheetHeader>
          {!userHasDefaultSchedule && !isPending && hasEditPermission && (
            <div className="my-2">
              <Alert severity="warning" title={t("view_only_edit_availability_not_onboarded")} />
            </div>
          )}
          {!hasEditPermission && !loadingPermissions && (
            <div className="my-2">
              <Alert severity="warning" title={t("view_only_edit_availability")} />
            </div>
          )}

          <SheetBody className="mt-4 flex flex-col space-y-4">
            <div>
              <Label className="text-emphasis">
                <>{t("select_availability_to_edit")}</>
              </Label>
              <Select
                value={userAvailabilityOptions.find((option) => option.value === selectedSchedule)}
                options={userAvailabilityOptions}
                isDisabled={!userHasDefaultSchedule}
                onChange={(selected) => {
                  if (selected) {
                    const changedSchedule = data.find((schedule) => schedule.id === selected.value);
                    // should always be present, but added if just for type errors
                    if (changedSchedule) {
                      setSelectedSchedule(changedSchedule.id);
                      form.reset({
                        ...changedSchedule,
                        timeZone:
                          changedSchedule.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                        schedule: changedSchedule.availability || [],
                      });
                      setWorkingHours(changedSchedule.workingHours);
                    }
                  }
                }}
              />
            </div>
            <div>
              <Label className="text-emphasis">
                <>{t("timezone")}</>
              </Label>
              <TimezoneSelect
                id="timezone"
                isDisabled={!hasEditPermission || !userHasDefaultSchedule}
                value={watchTimezone ?? "Europe/London"}
                data-testid="timezone-select"
                onChange={(event) => {
                  if (event) form.setValue("timeZone", event.value, { shouldDirty: true });
                }}
              />
            </div>
            <div className="mt-4">
              <Label className="text-emphasis">{t("members_default_schedule")}</Label>
              {/* Remove padding from schedule without touching the component */}
              <div className="[&>*:first-child]:!p-0">
                <Schedule
                  control={form.control}
                  name="schedule"
                  weekStart={0}
                  disabled={!hasEditPermission || !userHasDefaultSchedule}
                />
              </div>
            </div>
            <div className="mt-4">
              {workingHours && (
                <DateOverride
                  workingHours={workingHours}
                  disabled={!hasEditPermission || !userHasDefaultSchedule}
                />
              )}
            </div>
          </SheetBody>
          <SheetFooter>
            <SheetClose asChild>
              <Button color="secondary" className="w-full justify-center">
                {t("cancel")}
              </Button>
            </SheetClose>
            <Button
              disabled={!hasEditPermission || !userHasDefaultSchedule}
              className="w-full justify-center"
              type="submit"
              loading={updateMutation.isPending}
              form="availability-form">
              {t("save")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Form>
    </Sheet>
  );
}
